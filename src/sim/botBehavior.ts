// 유형별 일일 행동 (SPEC §7, 부록 B3~B5·B7~B10)

import type { SimConfig } from '../config';
import type { Personality } from '../config/rules';
import { availableBossChoices, bossFor, challenge, chooseBoss, chooseFinalSaint, isBossChoiceDay, entriesLeft, sweep } from '../engine/final';
import { claimAll, completeMission, selectPrelimSaint } from '../engine/preliminary';
import type { Rng } from '../engine/rng';
import { prelimDay, type EventState, type UserState } from '../engine/state';
import { applyRates, perceivedPopularity, type BotProfile, type SaintProfile } from './population';

export interface SimContext {
  config: SimConfig;
  state: EventState;
  saints: SaintProfile[];
  /** routine 예선 후보 (인기 상위 N명)와 가중치 */
  routineTop: number[];
  routineTopWeights: number[];
}

export function createContext(config: SimConfig, state: EventState, saints: SaintProfile[]): SimContext {
  const routineTop = [...saints.keys()]
    .sort((a, b) => saints[a].popularityRank - saints[b].popularityRank)
    .slice(0, config.population.routinePrelimTopN);
  return { config, state, saints, routineTop, routineTopWeights: routineTop.map((s) => saints[s].popularity) };
}

/** 후보 중 인식 인기도 가중 랜덤 ("인기 사도", 부록 B8) */
export function pickPopular(ctx: SimContext, bot: BotProfile, candidates: number[], rng: Rng): number {
  const w = candidates.map((s) => perceivedPopularity(ctx.config, ctx.saints, bot.userId, s));
  return candidates[rng.weightedIndex(w)];
}

// ───────── 예선 ─────────

function basePrelimChoice(ctx: SimContext, bot: BotProfile, rng: Rng): number {
  const a = ctx.config.population.archetypes[bot.archetype];
  switch (a.prelimChoice) {
    case 'favorite':
      return bot.prefs[0];
    case 'mostlyFavorite':
      if (rng.chance(a.favoriteProb) || bot.prefs.length < 2) return bot.prefs[0];
      return bot.prefs[rng.int(1, Math.min(bot.prefs.length, 3) - 1)];
    case 'rotate':
      return bot.prefs[(prelimDay(ctx.state) - 1) % bot.rotationLen];
    case 'popularTop':
      return ctx.routineTop[rng.weightedIndex(ctx.routineTopWeights)];
  }
}

/** 순위 공개 시나리오: 진출권 밖이면 확률적으로 진출권 안으로 표를 옮긴다 (§7.5) */
function strategicSwitch(ctx: SimContext, bot: BotProfile, saint: number, rng: Rng): number {
  const rank = ctx.state.publicPrelimRank;
  if (!rank) return saint;
  const rules = ctx.config.rules.prelim;
  const zone = rules.finalistCount + rules.publicZoneMargin;
  if (rank[saint] <= zone) return saint;
  if (!rng.chance(ctx.config.population.archetypes[bot.archetype].strategicSwitch)) return saint;
  const preferred = bot.prefs.find((s) => s !== saint && rank[s] <= zone);
  if (preferred !== undefined) return preferred;
  const inZone = [...rank.keys()].filter((s) => rank[s] <= zone);
  return pickPopular(ctx, bot, inZone, rng);
}

export function choosePrelimSaint(ctx: SimContext, bot: BotProfile, user: UserState, rng: Rng): number {
  if (ctx.config.rules.prelim.reselect === 'fixed' && user.prelim.fixedSaint !== -1) return user.prelim.fixedSaint;
  const saint = basePrelimChoice(ctx, bot, rng);
  return ctx.config.rules.prelim.rankingVisibility === 'public' ? strategicSwitch(ctx, bot, saint, rng) : saint;
}

function connects(ctx: SimContext, bot: BotProfile, user: UserState, rng: Rng): boolean {
  // 중도 진입형은 진입 당일 반드시 접속 (부록 B10)
  if (bot.archetype === 'late' && ctx.state.day === user.joinDay) return true;
  return rng.chance(bot.connectRate);
}

/** 예선 하루 행동. 접속했으면 true */
export function runPrelimDay(ctx: SimContext, bot: BotProfile, user: UserState, rng: Rng): boolean {
  const { state } = ctx;
  if (state.day < user.joinDay) return false;
  if (!connects(ctx, bot, user, rng)) return false;
  selectPrelimSaint(state, user, choosePrelimSaint(ctx, bot, user, rng));
  const missions = ctx.config.rules.prelim.missionCount;
  for (let m = 0; m < missions; m++) if (rng.chance(bot.missionRate)) completeMission(state, user, m);
  // 봇은 완료한 미션을 전부 수령 (부록 B12)
  claimAll(state, user);
  return true;
}

// ───────── 본선 사도 결정 ─────────

/** 보상 최적화형: 비용 = 정규화 판 규모 × 민감도 − 애정 점수 × (1 − 민감도) 최소 (부록 B5) */
export function optimizeChoice(ctx: SimContext, bot: BotProfile, finalists: number[]): number {
  const pop = ctx.config.population;
  const s = pop.rewardSensitivity;
  const sizes = finalists.map((f) => perceivedPopularity(ctx.config, ctx.saints, bot.userId, f));
  const max = Math.max(...sizes);
  let best = finalists[0];
  let bestCost = Number.POSITIVE_INFINITY;
  finalists.forEach((f, i) => {
    const prefIdx = bot.prefs.indexOf(f);
    const bonus = prefIdx >= 0 ? (pop.preferenceBonus[prefIdx] ?? 0) : 0;
    const cost = (sizes[i] / max) * s - bonus * (1 - s);
    if (cost < bestCost) {
      bestCost = cost;
      best = f;
    }
  });
  return best;
}

function bestSurviving(bot: BotProfile, finalists: number[]): number | undefined {
  return bot.prefs.find((p) => finalists.includes(p));
}

/** 본선 진입 late의 최애 재지정 (favoriteSurvivedRate가 숫자일 때만, 부록 B10) */
function overrideLateFavorite(ctx: SimContext, bot: BotProfile, finalists: number[], rng: Rng): void {
  const rate = ctx.config.population.late.favoriteSurvivedRate;
  if (rate === null || !bot.finalEntry) return;
  let fav: number;
  if (rng.chance(rate)) {
    fav = pickPopular(ctx, bot, finalists, rng);
  } else {
    if (!finalists.includes(bot.prefs[0])) return;
    const eliminated = [...ctx.saints.keys()].filter((s) => !finalists.includes(s));
    fav = eliminated[rng.weightedIndex(eliminated.map((s) => ctx.saints[s].popularity))];
  }
  const at = bot.prefs.indexOf(fav);
  if (at > 0) bot.prefs.splice(at, 1);
  if (at !== 0) bot.prefs.unshift(fav);
  applyRates(ctx.config, bot, ctx.saints);
}

/** 본선 사도 결정. -1 = 이탈 */
export function decideFinalPlan(ctx: SimContext, bot: BotProfile, rng: Rng): number {
  const finalists = ctx.state.finalists!;
  overrideLateFavorite(ctx, bot, finalists, rng);
  const a = ctx.config.population.archetypes[bot.archetype];
  const eliminated = !finalists.includes(bot.prefs[0]);
  bot.favoriteEliminated = eliminated;

  const normal = (): number => {
    switch (a.finalChoice) {
      case 'favorite':
      case 'bestSurviving':
        return bestSurviving(bot, finalists) ?? pickPopular(ctx, bot, finalists, rng);
      case 'optimize':
        return optimizeChoice(ctx, bot, finalists);
      case 'popular':
        return pickPopular(ctx, bot, finalists, rng);
    }
  };

  if (!eliminated || a.onFavoriteEliminated === null) return normal();

  const b = a.onFavoriteEliminated;
  const r = rng.next() * (b.leave + b.nextFavorite + b.popular);
  if (r < b.leave) return -1;
  if (r < b.leave + b.nextFavorite) {
    const next = bestSurviving(bot, finalists);
    if (next !== undefined) return next;
    // 선호 사도가 전부 탈락 (부록 B7)
    return ctx.config.population.noSurvivingPreference === 'leave' ? -1 : pickPopular(ctx, bot, finalists, rng);
  }
  return pickPopular(ctx, bot, finalists, rng);
}

// ───────── 본선 하루 ─────────

/** 6·7일차: 육성 성격 중 아직 고르지 않은 것, 없으면 미육성 성격 중 무작위 (부록 B3) */
export function botBossChoice(ctx: SimContext, user: UserState, rng: Rng): Personality {
  const options = availableBossChoices(ctx.state, user);
  const trained = options.filter((p) => user.account.trained.includes(p));
  return rng.pick(trained.length > 0 ? trained : options);
}

/** 본선 하루 행동. 접속해서 입장했으면 true */
export function runFinalDay(ctx: SimContext, bot: BotProfile, user: UserState, rng: Rng): boolean {
  const { state } = ctx;
  if (state.day < user.joinDay) return false;
  if (bot.finalPlan === undefined) bot.finalPlan = decideFinalPlan(ctx, bot, rng);
  if (bot.finalPlan === -1) return false;
  if (!connects(ctx, bot, user, rng)) return false;

  if (user.final.saint === -1) chooseFinalSaint(state, user, bot.finalPlan);
  if (isBossChoiceDay(state) && bossFor(state, user) === null) chooseBoss(state, user, botBossChoice(ctx, user, rng));

  const a = ctx.config.population.archetypes[bot.archetype];
  challenge(state, user, rng);
  if (a.finalPlay === 'retry') {
    // 2·3회차: 확률적으로 직접 재도전, 아니면 소탕 (부록 B4)
    while (entriesLeft(state, user) > 0) {
      if (rng.chance(a.retryProb)) challenge(state, user, rng);
      else sweep(state, user, 1);
    }
  } else {
    sweep(state, user);
  }
  return true;
}
