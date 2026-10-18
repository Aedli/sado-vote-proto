// 검증 지표 계산 (SPEC §9, 부록 B17~B18). 결과는 Web Worker에서 화면으로 넘길 수 있는 순수 데이터다.

import { ARCHETYPE_IDS, type ArchetypeId } from '../config/archetypes';
import type { CriteriaConfig } from '../config/criteria';
import { SPEC_TIERS, type SpecTier } from '../config/rules';
import { buildBoards, dealStandings, finalSaintRanking, rankSaints } from '../engine/ranking';
import { dealTierFor, dealTierValue } from '../engine/rewards';
import type { UserState } from '../engine/state';
import type { Simulation } from './runner';

export type Verdict = 'pass' | 'warn' | 'fail' | 'info';

const ORDER: Verdict[] = ['pass', 'info', 'warn', 'fail'];
export function worst(...vs: Verdict[]): Verdict {
  return vs.reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a), 'pass');
}

/** 높을수록 좋은 값 */
export function judgeHigh(v: number, t: { pass: number; warn: number }): Verdict {
  return v >= t.pass ? 'pass' : v >= t.warn ? 'warn' : 'fail';
}

/** 낮을수록 좋은 값 */
export function judgeLow(v: number, t: { pass: number; warn: number }): Verdict {
  return v <= t.pass ? 'pass' : v <= t.warn ? 'warn' : 'fail';
}

// ───────── 통계 도우미 ─────────

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** 동점은 평균 순위 */
export function ranks(xs: number[]): number[] {
  const idx = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && xs[idx[j + 1]] === xs[idx[i]]) j++;
    for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

/** 스피어만 순위 상관 (-1 ~ 1) */
export function spearman(x: number[], y: number[]): number {
  const rx = ranks(x);
  const ry = ranks(y);
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

/** 지니계수 (0 = 완전 균등, 1 = 한 명 독점) */
export function gini(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const sum = s.reduce((a, b) => a + b, 0);
  if (n === 0 || sum === 0) return 0;
  let acc = 0;
  s.forEach((v, i) => (acc += (i + 1) * v));
  return (2 * acc) / (n * sum) - (n + 1) / n;
}

/** 내림차순 배열에서 score보다 큰 값의 개수 */
function countAbove(desc: number[], score: number): number {
  let lo = 0;
  let hi = desc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (desc[mid] > score) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// ───────── 결과 타입 ─────────

export interface BoardPlacement {
  saint: number;
  rank: number;
  boardSize: number;
  tierIndex: number;
  tierLabel: string;
  value: number;
}

export interface RepresentativeGap {
  spec: SpecTier;
  /** 대표 계정이 없으면(해당 스펙 참여자 0명) null */
  score: number | null;
  /** 실제로 속한 판 */
  homeSaint: number;
  placements: BoardPlacement[];
  gap: number;
  tierSteps: number;
  best: BoardPlacement | null;
  worst: BoardPlacement | null;
  verdict: Verdict;
}

export interface GapDistribution {
  spec: SpecTier;
  participants: number;
  medianGap: number;
  /** 격차가 주의 수준 이상인 계정 비율 */
  warnShare: number;
  /** 구간이 실패 수준 이상 바뀌는 계정 비율 */
  failShare: number;
}

export interface BoardInfo {
  saint: number;
  finalRank: number;
  size: number;
  /** 100위(상위권 끝) 점수. 판이 100명 이하이면 null = 참여만 하면 상위권 이상 */
  top100Cutoff: number | null;
  topScore: number;
  popularityRank: number;
}

export interface OptimizerPerf {
  spec: SpecTier;
  optimizerCount: number;
  othersCount: number;
  optimizerAvg: number;
  othersAvg: number;
  diff: number;
  /** diff ÷ 참가상 가치 */
  diffRatio: number;
}

export interface SaintPoint {
  saint: number;
  fans: number;
  votes: number;
  fervor: number;
  popularityRank: number;
  finalist: boolean;
}

export interface SensitivityRow {
  finalists: number;
  favoriteEliminatedRate: number;
  dropoutRate: number;
  boardMin: number;
  boardMedian: number;
  boardMax: number;
  smallBoards: number;
}

export interface ReportData {
  seed: number;
  botCount: number;
  finalistCount: number;
  participationValue: number;
  warnGap: number;
  winner: number;
  h1: {
    boards: BoardInfo[];
    representatives: RepresentativeGap[];
    distributions: GapDistribution[];
    optimizer: OptimizerPerf[];
    verdict: Verdict;
  };
  h2: {
    points: SaintPoint[];
    spearman: number;
    spearmanVerdict: Verdict;
    comparablePairs: number;
    invertedPairs: number;
    invertedRatio: number;
    /** 뒤집힌 쌍 중 표를 더 받은 쪽의 열성도가 더 높은 비율 */
    fervorWinShare: number;
    fanTop: number[];
    finalistMatch: number;
    finalistMatchVerdict: Verdict;
    fixed: { finalists: number[]; overlapWithDaily: number; spearman: number } | null;
    verdict: Verdict;
  };
  h3: {
    favoriteEliminated: { archetype: ArchetypeId; rate: number; count: number }[];
    favoriteEliminatedRate: number;
    dropout: { archetype: ArchetypeId; rate: number; prelimParticipants: number }[];
    dropoutRate: number;
    dropoutVerdict: Verdict;
    boardMin: number;
    boardMedian: number;
    boardMax: number;
    smallBoards: number;
    smallBoardsVerdict: Verdict;
    sensitivity: SensitivityRow[];
    verdict: Verdict;
  };
  aux: {
    daily: { day: number; phase: 'prelim' | 'final'; rate: number; byArchetype: Record<ArchetypeId, number> }[];
    late: { prelimEntryRatio: number; finalEntryRatio: number; fullAvgVotes: number };
    prelimGini: number;
    finalGini: number;
  };
}

// ───────── 계산 ─────────

function isParticipant(u: UserState): boolean {
  return u.final.entriesTotal > 0 && u.final.saint !== -1;
}

/** 유저별 딜링 보상 가치 (미참여자는 null) */
export function userRewardValues(sim: Simulation): (number | null)[] {
  const tiers = sim.config.rewards.dealTiers;
  return dealStandings(sim.state).map((st) =>
    st ? dealTierValue(dealTierFor(st.rank, st.boardSize, tiers), sim.config.rewards.value) : null,
  );
}

/** 점수 score인 계정을 각 판에 넣었을 때의 순위·구간 */
export function placeInBoards(sim: Simulation, score: number, homeSaint: number, boardTotals: Map<number, number[]>): BoardPlacement[] {
  const tiers = sim.config.rewards.dealTiers;
  return (sim.state.finalists ?? []).map((saint) => {
    const desc = boardTotals.get(saint) ?? [];
    const self = saint === homeSaint;
    const rank = countAbove(desc, score) + 1;
    const boardSize = self ? desc.length : desc.length + 1;
    const tier = dealTierFor(rank, boardSize, tiers);
    return {
      saint,
      rank,
      boardSize,
      tierIndex: tiers.indexOf(tier),
      tierLabel: tier.label,
      value: dealTierValue(tier, sim.config.rewards.value),
    };
  });
}

function boardTotalsOf(sim: Simulation): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const saint of sim.state.finalists ?? []) out.set(saint, []);
  for (const u of sim.state.users) if (isParticipant(u)) out.get(u.final.saint)?.push(u.final.total);
  for (const list of out.values()) list.sort((a, b) => b - a);
  return out;
}

function gapOf(placements: BoardPlacement[]) {
  const values = placements.map((p) => p.value);
  const idx = placements.map((p) => p.tierIndex);
  return { gap: Math.max(...values) - Math.min(...values), tierSteps: Math.max(...idx) - Math.min(...idx) };
}

function participationValue(sim: Simulation): number {
  const tiers = sim.config.rewards.dealTiers;
  const p = tiers.find((t) => t.condition.kind === 'participation') ?? tiers[tiers.length - 1];
  return dealTierValue(p, sim.config.rewards.value);
}

function judgeGap(gap: number, steps: number, warnGap: number, c: CriteriaConfig): Verdict {
  if (steps >= c.h1.failTierSteps) return 'fail';
  if (gap >= warnGap) return 'warn';
  return 'pass';
}

export function computeH1(sim: Simulation, c: CriteriaConfig): ReportData['h1'] {
  const { state } = sim;
  const totals = boardTotalsOf(sim);
  const warnGap = participationValue(sim) * c.h1.warnGapRatio;
  const ranking = finalSaintRanking(state);
  const participants = state.users.filter(isParticipant);

  const boards: BoardInfo[] = (state.finalists ?? []).map((saint) => {
    const desc = totals.get(saint) ?? [];
    return {
      saint,
      finalRank: ranking.indexOf(saint) + 1,
      size: desc.length,
      top100Cutoff: desc.length > 100 ? desc[99] : null,
      topScore: desc[0] ?? 0,
      popularityRank: sim.saints[saint].popularityRank,
    };
  });

  const representatives: RepresentativeGap[] = SPEC_TIERS.map((spec) => {
    const group = participants.filter((u) => u.account.spec === spec).sort((a, b) => a.final.total - b.final.total);
    if (group.length === 0) {
      return { spec, score: null, homeSaint: -1, placements: [], gap: 0, tierSteps: 0, best: null, worst: null, verdict: 'info' };
    }
    const rep = group[(group.length - 1) >> 1];
    const placements = placeInBoards(sim, rep.final.total, rep.final.saint, totals);
    const { gap, tierSteps } = gapOf(placements);
    const sorted = [...placements].sort((a, b) => b.value - a.value || a.tierIndex - b.tierIndex);
    return {
      spec,
      score: rep.final.total,
      homeSaint: rep.final.saint,
      placements,
      gap,
      tierSteps,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      verdict: judgeGap(gap, tierSteps, warnGap, c),
    };
  });

  const distributions: GapDistribution[] = SPEC_TIERS.map((spec) => {
    const group = participants.filter((u) => u.account.spec === spec);
    const gaps = group.map((u) => gapOf(placeInBoards(sim, u.final.total, u.final.saint, totals)));
    return {
      spec,
      participants: group.length,
      medianGap: median(gaps.map((g) => g.gap)),
      warnShare: group.length ? gaps.filter((g) => g.gap >= warnGap).length / group.length : 0,
      failShare: group.length ? gaps.filter((g) => g.tierSteps >= c.h1.failTierSteps).length / group.length : 0,
    };
  });

  const values = userRewardValues(sim);
  const pv = participationValue(sim);
  const optimizer: OptimizerPerf[] = SPEC_TIERS.map((spec) => {
    const opt: number[] = [];
    const others: number[] = [];
    for (const u of participants) {
      if (u.account.spec !== spec) continue;
      const bot = sim.botOf[u.id];
      if (!bot) continue;
      (bot.archetype === 'optimizer' ? opt : others).push(values[u.id] ?? 0);
    }
    const diff = mean(opt) - mean(others);
    return { spec, optimizerCount: opt.length, othersCount: others.length, optimizerAvg: mean(opt), othersAvg: mean(others), diff, diffRatio: diff / pv };
  });

  return { boards, representatives, distributions, optimizer, verdict: worst(...representatives.map((r) => r.verdict)) };
}

export function fanCounts(sim: Simulation): number[] {
  const fans = new Array(sim.state.saintCount).fill(0);
  for (const b of sim.bots) fans[b.prefs[0]]++;
  return fans;
}

export function inversionStats(fans: number[], votes: number[], fervor: number[]) {
  let comparable = 0;
  let inverted = 0;
  let fervorWins = 0;
  for (let i = 0; i < fans.length; i++) {
    for (let j = i + 1; j < fans.length; j++) {
      const df = fans[i] - fans[j];
      const dv = votes[i] - votes[j];
      if (df === 0 || dv === 0) continue;
      comparable++;
      if (Math.sign(df) !== Math.sign(dv)) {
        inverted++;
        const winner = dv > 0 ? i : j;
        const loser = winner === i ? j : i;
        if (fervor[winner] > fervor[loser]) fervorWins++;
      }
    }
  }
  return { comparable, inverted, ratio: comparable ? inverted / comparable : 0, fervorWinShare: inverted ? fervorWins / inverted : 0 };
}

function fanTopOf(fans: number[], n: number): number[] {
  return fans.map((_, i) => i).sort((a, b) => fans[b] - fans[a] || a - b).slice(0, n);
}

export function computeH2(sim: Simulation, c: CriteriaConfig, fixed: Simulation | null): ReportData['h2'] {
  const { state } = sim;
  const fans = fanCounts(sim);
  const finalists = state.finalists ?? [];
  const points: SaintPoint[] = fans.map((f, s) => ({
    saint: s,
    fans: f,
    votes: state.prelimVotes[s],
    fervor: sim.saints[s].fervor,
    popularityRank: sim.saints[s].popularityRank,
    finalist: finalists.includes(s),
  }));
  const rho = spearman(fans, state.prelimVotes);
  const inv = inversionStats(fans, state.prelimVotes, sim.saints.map((s) => s.fervor));
  const fanTop = fanTopOf(fans, finalists.length);
  const match = fanTop.filter((s) => finalists.includes(s)).length;
  const spearmanVerdict = judgeHigh(rho, c.h2.spearman);
  // 진출 인원이 10명이 아니면 기준 인원을 비례로 맞춘다
  const scale = finalists.length / 10;
  const finalistMatchVerdict = judgeHigh(match, { pass: c.h2.finalistMatch.pass * scale, warn: c.h2.finalistMatch.warn * scale });
  const fixedInfo = fixed
    ? {
        finalists: fixed.state.finalists ?? [],
        overlapWithDaily: (fixed.state.finalists ?? []).filter((s) => finalists.includes(s)).length,
        spearman: spearman(fanCounts(fixed), fixed.state.prelimVotes),
      }
    : null;
  return {
    points,
    spearman: rho,
    spearmanVerdict,
    comparablePairs: inv.comparable,
    invertedPairs: inv.inverted,
    invertedRatio: inv.ratio,
    fervorWinShare: inv.fervorWinShare,
    fanTop,
    finalistMatch: match,
    finalistMatchVerdict,
    fixed: fixedInfo,
    verdict: worst(spearmanVerdict, finalistMatchVerdict),
  };
}

function boardSizes(sim: Simulation): number[] {
  const boards = buildBoards(sim.state);
  return (sim.state.finalists ?? []).map((s) => boards.get(sim.config.rules.final.boardMode === 'unified' ? -1 : s)?.length ?? 0);
}

function h3Core(sim: Simulation, c: CriteriaConfig) {
  const decided = sim.bots.filter((b) => b.finalPlan !== undefined);
  const favoriteEliminated = ARCHETYPE_IDS.map((archetype) => {
    const g = decided.filter((b) => b.archetype === archetype);
    const n = g.filter((b) => b.favoriteEliminated).length;
    return { archetype, rate: g.length ? n / g.length : 0, count: g.length };
  });
  const prelimPlayers = sim.bots.filter((b) => sim.state.users[b.userId].prelim.totalVotes > 0);
  const dropped = (b: (typeof sim.bots)[number]) => sim.state.users[b.userId].final.entriesTotal === 0;
  const dropout = ARCHETYPE_IDS.map((archetype) => {
    const g = prelimPlayers.filter((b) => b.archetype === archetype);
    return { archetype, rate: g.length ? g.filter(dropped).length / g.length : 0, prelimParticipants: g.length };
  });
  const sizes = boardSizes(sim);
  return {
    favoriteEliminated,
    favoriteEliminatedRate: decided.length ? decided.filter((b) => b.favoriteEliminated).length / decided.length : 0,
    dropout,
    dropoutRate: prelimPlayers.length ? prelimPlayers.filter(dropped).length / prelimPlayers.length : 0,
    boardMin: Math.min(...sizes),
    boardMedian: median(sizes),
    boardMax: Math.max(...sizes),
    smallBoards: sizes.filter((s) => s < c.h3.smallBoardSize).length,
  };
}

export function computeH3(sim: Simulation, c: CriteriaConfig, sensitivity: { finalists: number; sim: Simulation }[]): ReportData['h3'] {
  const core = h3Core(sim, c);
  const dropoutVerdict = judgeLow(core.dropoutRate, c.h3.dropout);
  const smallBoardsVerdict = judgeLow(core.smallBoards, c.h3.smallBoards);
  return {
    ...core,
    dropoutVerdict,
    smallBoardsVerdict,
    sensitivity: sensitivity.map(({ finalists, sim: s }) => {
      const k = h3Core(s, c);
      return {
        finalists,
        favoriteEliminatedRate: k.favoriteEliminatedRate,
        dropoutRate: k.dropoutRate,
        boardMin: k.boardMin,
        boardMedian: k.boardMedian,
        boardMax: k.boardMax,
        smallBoards: k.smallBoards,
      };
    }),
    verdict: worst(dropoutVerdict, smallBoardsVerdict),
  };
}

export function computeAux(sim: Simulation): ReportData['aux'] {
  const prelimDays = sim.config.rules.prelim.days;
  const daily = sim.daily.map((d) => {
    const e = ARCHETYPE_IDS.reduce((a, k) => a + d.eligible[k], 0);
    const c = ARCHETYPE_IDS.reduce((a, k) => a + d.connected[k], 0);
    const byArchetype = Object.fromEntries(ARCHETYPE_IDS.map((k) => [k, d.eligible[k] ? d.connected[k] / d.eligible[k] : 0])) as Record<ArchetypeId, number>;
    return { day: d.phase === 'prelim' ? d.day : d.day - prelimDays, phase: d.phase as 'prelim' | 'final', rate: e ? c / e : 0, byArchetype };
  });
  const votesOf = (id: number) => sim.state.users[id].prelim.totalVotes + sim.state.users[id].final.votesTotal;
  const full = sim.bots.filter((b) => b.archetype !== 'late').map((b) => votesOf(b.userId));
  const latePrelim = sim.bots.filter((b) => b.archetype === 'late' && !b.finalEntry).map((b) => votesOf(b.userId));
  const lateFinal = sim.bots.filter((b) => b.archetype === 'late' && b.finalEntry).map((b) => votesOf(b.userId));
  const fullAvg = mean(full);
  return {
    daily,
    late: {
      prelimEntryRatio: fullAvg ? mean(latePrelim) / fullAvg : 0,
      finalEntryRatio: fullAvg ? mean(lateFinal) / fullAvg : 0,
      fullAvgVotes: fullAvg,
    },
    prelimGini: gini(sim.state.prelimVotes),
    finalGini: gini((sim.state.finalists ?? []).map((s) => sim.state.finalVotes[s])),
  };
}

export interface ReportRuns {
  base: Simulation;
  fixed: Simulation | null;
  sensitivity: { finalists: number; sim: Simulation }[];
}

export function computeReport(runs: ReportRuns, c: CriteriaConfig): ReportData {
  const sim = runs.base;
  const ranking = finalSaintRanking(sim.state);
  return {
    seed: sim.config.run.seed,
    botCount: sim.bots.length,
    finalistCount: sim.config.rules.prelim.finalistCount,
    participationValue: participationValue(sim),
    warnGap: participationValue(sim) * c.h1.warnGapRatio,
    winner: ranking[0] ?? -1,
    h1: computeH1(sim, c),
    h2: computeH2(sim, c, runs.fixed),
    h3: computeH3(sim, c, runs.sensitivity),
    aux: computeAux(sim),
  };
}

/** 예선 순위 (리포트 표용) */
export function prelimOrder(sim: Simulation): number[] {
  return rankSaints(sim.state.prelimVotes, sim.state.prelimReachedAt);
}
