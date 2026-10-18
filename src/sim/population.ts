// 봇 집단 생성 (SPEC §7.1~7.3, 부록 B6·B8~B10)

import type { SimConfig } from '../config';
import { ARCHETYPE_IDS, type ArchetypeId } from '../config/archetypes';
import { SPEC_TIERS, type SpecTier } from '../config/rules';
import type { SaintData } from '../config/saints';
import { drawAccount } from '../engine/damage';
import { Rng, hashNormal, labelHash } from '../engine/rng';
import { newUser, type UserState } from '../engine/state';

export interface SaintProfile {
  /** 인기 비중 (합계 1) */
  popularity: number;
  /** 팬층 열성도 */
  fervor: number;
  /** 인기 순위 (1부터) */
  popularityRank: number;
}

export interface BotProfile {
  userId: number;
  archetype: ArchetypeId;
  /** 선호 사도 목록 (0번이 최애) */
  prefs: number[];
  /** multi: 예선 순환에 쓰는 선호 목록 길이 */
  rotationLen: number;
  connectRate: number;
  missionRate: number;
  /** 본선 진입 late 여부 */
  finalEntry: boolean;
  /** 본선 계획. undefined = 아직 결정 전, -1 = 이탈 */
  finalPlan?: number;
  /** 최애가 예선 탈락했는지 (본선 계획 결정 시 기록) */
  favoriteEliminated?: boolean;
}

/** Zipf 인기 + LogNormal 열성도. 인기 순위는 시드로 무작위 배정 (§7.3) */
export function generateSaintProfiles(rng: Rng, config: SimConfig, saints?: SaintData[]): SaintProfile[] {
  const n = config.rules.saintCount;
  const d = config.population.saints;
  const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  const raw = new Array<number>(n);
  order.forEach((saint, k) => (raw[saint] = 1 / Math.pow(k + 1, d.zipfS)));
  saints?.forEach((s, i) => {
    if (i < n && s.popularity !== undefined) raw[i] = s.popularity;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  const fervorRng = rng.fork('fervor');
  const profiles = raw.map((p, i) => {
    const drawn = Math.min(d.fervorMax, Math.max(d.fervorMin, fervorRng.logNormal(0, d.fervorSigma)));
    return { popularity: p / sum, fervor: saints?.[i]?.fervor ?? drawn, popularityRank: 0 };
  });
  [...profiles.keys()]
    .sort((a, b) => profiles[b].popularity - profiles[a].popularity || a - b)
    .forEach((s, k) => (profiles[s].popularityRank = k + 1));
  return profiles;
}

/** 비율대로 정확한 개수를 배분한 뒤 섞는다 (최대 잔여법) */
export function allocate<K extends string>(rng: Rng, ratios: Record<K, number>, keys: readonly K[], total: number): K[] {
  const sum = keys.reduce((a, k) => a + ratios[k], 0);
  const exact = keys.map((k) => (ratios[k] / sum) * total);
  const counts = exact.map(Math.floor);
  let rest = total - counts.reduce((a, b) => a + b, 0);
  const byRemainder = keys.map((_, i) => i).sort((a, b) => exact[b] - counts[b] - (exact[a] - counts[a]) || a - b);
  for (let i = 0; rest > 0; i = (i + 1) % keys.length, rest--) counts[byRemainder[i]]++;
  const out: K[] = [];
  keys.forEach((k, i) => {
    for (let c = 0; c < counts[i]; c++) out.push(k);
  });
  return rng.shuffle(out);
}

/** 열성도 상향 보정 (부록 B6) */
export function fervorAdjusted(config: SimConfig, base: number, fervor: number): number {
  const fb = config.population.fervorBonus;
  const delta = fb.mode === 'upOnly' ? Math.max(0, fervor - 1) : fervor - 1;
  return Math.max(0, Math.min(fb.cap, base + fb.perUnit * delta));
}

export function applyRates(config: SimConfig, bot: BotProfile, saints: SaintProfile[]): void {
  const a = config.population.archetypes[bot.archetype];
  const fervor = saints[bot.prefs[0]].fervor;
  const connect = bot.archetype === 'late' ? config.population.late.connectRateAfterEntry : a.connectRate;
  bot.connectRate = fervorAdjusted(config, connect, fervor);
  bot.missionRate = fervorAdjusted(config, a.missionRate, fervor);
}

/** 봇별·사도별 인식 인기도. 호출 순서와 무관하게 고정 (부록 B8) */
export function perceivedPopularity(config: SimConfig, saints: SaintProfile[], userId: number, saint: number): number {
  const z = hashNormal(config.run.seed, labelHash('perception'), userId, saint);
  return saints[saint].popularity * Math.exp(config.population.perceptionSigma * z);
}

export interface Population {
  users: UserState[];
  bots: BotProfile[];
}

/**
 * 봇 생성. firstId부터 users 인덱스를 부여한다 (플레이어가 0번이면 firstId = 1).
 */
export function generateBots(rng: Rng, config: SimConfig, saints: SaintProfile[], firstId: number): Population {
  const pop = config.population;
  const count = config.run.botCount;
  const archetypes = allocate(rng.fork('archetype'), Object.fromEntries(ARCHETYPE_IDS.map((k) => [k, pop.archetypes[k].ratio])) as Record<ArchetypeId, number>, ARCHETYPE_IDS, count);
  const specs = allocate(rng.fork('spec'), pop.specDistribution, SPEC_TIERS, count);
  const weights = saints.map((s) => s.popularity);
  const prelimDays = config.rules.prelim.days;
  const users: UserState[] = [];
  const bots: BotProfile[] = [];
  for (let i = 0; i < count; i++) {
    const id = firstId + i;
    const archetype = archetypes[i];
    const brng = rng.fork(id);
    const spec: SpecTier = specs[i];
    const account = drawAccount(brng, config.rules.damage, spec);
    const rotationLen = archetype === 'multi' ? brng.int(pop.multiRotation[0], pop.multiRotation[1]) : 1;
    const prefs = brng.weightedSample(weights, Math.max(pop.preferenceCount, rotationLen));
    let joinDay = 1;
    let finalEntry = false;
    if (archetype === 'late') {
      finalEntry = brng.chance(pop.late.finalEntryShare);
      joinDay = finalEntry
        ? prelimDays + brng.int(pop.late.finalEntryDays[0], pop.late.finalEntryDays[1])
        : brng.int(pop.late.prelimEntryDays[0], pop.late.prelimEntryDays[1]);
    }
    const bot: BotProfile = { userId: id, archetype, prefs, rotationLen, connectRate: 0, missionRate: 0, finalEntry };
    applyRates(config, bot, saints);
    users.push(newUser(id, account, joinDay, config));
    bots.push(bot);
  }
  return { users, bots };
}
