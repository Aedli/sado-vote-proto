// 하루 진행 / 전체 시뮬레이션 실행 (SPEC §7.6). UI에서는 Web Worker로 감싸서 호출한다(M3).

import type { SimConfig } from '../config';
import { ARCHETYPE_IDS, type ArchetypeId } from '../config/archetypes';
import type { Personality, SpecTier } from '../config/rules';
import { SAINTS, type SaintData } from '../config/saints';
import { closeDay } from '../engine/day';
import { drawSkill } from '../engine/damage';
import { finalSaintRanking, rankSaints } from '../engine/ranking';
import { Rng, hash32, labelHash } from '../engine/rng';
import { createEventState, newUser, phaseOf, totalDays, type EventState, type Phase, type UserState } from '../engine/state';
import { createContext, runFinalDay, runPrelimDay, type SimContext } from './botBehavior';
import { generateBots, generateSaintProfiles, type BotProfile, type SaintProfile } from './population';

export interface PlayerSetup {
  spec: SpecTier;
  trained: Personality[];
}

export interface DailyStats {
  day: number;
  phase: Phase;
  /** 유형별 참여 가능(진입 완료·이탈 전) 봇 수 */
  eligible: Record<ArchetypeId, number>;
  /** 유형별 실제 접속 봇 수 */
  connected: Record<ArchetypeId, number>;
  /** 유형별 그날 획득 표 */
  votes: Record<ArchetypeId, number>;
  /** 봇 하루 계산 시간 (ms) */
  ms: number;
}

export interface Simulation {
  config: SimConfig;
  state: EventState;
  saints: SaintProfile[];
  bots: BotProfile[];
  /** users 인덱스 → 봇 프로필 (플레이어는 undefined) */
  botOf: (BotProfile | undefined)[];
  playerId: number | null;
  ctx: SimContext;
  daily: DailyStats[];
  /** 플레이어 도전 횟수 (플레이어 난수 스트림용) */
  playerRolls: number;
}

const zeroByArchetype = (): Record<ArchetypeId, number> =>
  Object.fromEntries(ARCHETYPE_IDS.map((k) => [k, 0])) as Record<ArchetypeId, number>;

export function createSimulation(config: SimConfig, opts: { player?: PlayerSetup; saintsData?: SaintData[] } = {}): Simulation {
  const root = new Rng(config.run.seed);
  const saintsData = opts.saintsData ?? SAINTS;
  const saints = generateSaintProfiles(root.fork('saints'), config, saintsData);
  const personality = Array.from({ length: config.rules.saintCount }, (_, i) => saintsData[i]?.personality ?? 'P1');

  const users: UserState[] = [];
  let playerId: number | null = null;
  if (opts.player) {
    playerId = 0;
    const skill = drawSkill(root.fork('player-account'), config.rules.damage);
    users.push(newUser(0, { spec: opts.player.spec, trained: [...opts.player.trained], skill }, 1, config, true));
  }
  const pop = generateBots(root.fork('bots'), config, saints, users.length);
  users.push(...pop.users);

  const state = createEventState(config, personality, users);
  const botOf: (BotProfile | undefined)[] = new Array(users.length).fill(undefined);
  for (const b of pop.bots) botOf[b.userId] = b;
  return {
    config,
    state,
    saints,
    bots: pop.bots,
    botOf,
    playerId,
    ctx: createContext(config, state, saints),
    daily: [],
    playerRolls: 0,
  };
}

/** 플레이어 도전용 난수. 플레이어 행동이 봇 난수 순서에 영향을 주지 않도록 따로 둔다 */
export function playerRng(sim: Simulation): Rng {
  sim.playerRolls++;
  return new Rng(hash32(sim.config.run.seed, labelHash('player'), sim.state.day, sim.playerRolls));
}

export function player(sim: Simulation): UserState | null {
  return sim.playerId === null ? null : sim.state.users[sim.playerId];
}

/** 오늘 봇 행동을 계산하고 하루를 마감한다 (`다음 날로`) */
export function advanceDay(sim: Simulation): DailyStats {
  const { state } = sim;
  const phase = phaseOf(state);
  const stats: DailyStats = { day: state.day, phase, eligible: zeroByArchetype(), connected: zeroByArchetype(), votes: zeroByArchetype(), ms: 0 };
  if (phase === 'ended') return stats;

  const t0 = performance.now();
  const rng = new Rng(hash32(sim.config.run.seed, labelHash('bots'), state.day));
  const order = new Int32Array(state.users.length);
  state.dayOrder.forEach((pos, id) => (order[pos] = id));

  for (const id of order) {
    const bot = sim.botOf[id];
    if (!bot) continue;
    const user = state.users[id];
    if (state.day < user.joinDay) continue;
    const before = phase === 'prelim' ? user.prelim.totalVotes : user.final.votesTotal;
    const connected = phase === 'prelim' ? runPrelimDay(sim.ctx, bot, user, rng) : runFinalDay(sim.ctx, bot, user, rng);
    if (phase === 'final' && bot.finalPlan === -1) continue;
    stats.eligible[bot.archetype]++;
    if (connected) stats.connected[bot.archetype]++;
    stats.votes[bot.archetype] += (phase === 'prelim' ? user.prelim.totalVotes : user.final.votesTotal) - before;
  }
  stats.ms = performance.now() - t0;
  closeDay(state);
  sim.daily.push(stats);
  return stats;
}

export interface SimSummary {
  seed: number;
  botCount: number;
  prelimRanking: { saint: number; votes: number }[];
  finalists: number[];
  finalRanking: { saint: number; votes: number }[];
  winner: number;
  boards: { board: number; size: number }[];
  maxDayMs: number;
}

export function summarize(sim: Simulation): SimSummary {
  const s = sim.state;
  const finalRanking = finalSaintRanking(s);
  const sizes = new Map<number, number>();
  for (const u of s.users) {
    if (u.final.entriesTotal === 0) continue;
    const key = s.config.rules.final.boardMode === 'unified' ? -1 : u.final.saint;
    sizes.set(key, (sizes.get(key) ?? 0) + 1);
  }
  return {
    seed: sim.config.run.seed,
    botCount: sim.bots.length,
    prelimRanking: rankSaints(s.prelimVotes, s.prelimReachedAt).map((saint) => ({ saint, votes: s.prelimVotes[saint] })),
    finalists: s.finalists ?? [],
    finalRanking: finalRanking.map((saint) => ({ saint, votes: s.finalVotes[saint] })),
    winner: finalRanking[0] ?? -1,
    boards: [...sizes].map(([board, size]) => ({ board, size })).sort((a, b) => b.size - a.size),
    maxDayMs: Math.max(0, ...sim.daily.map((d) => d.ms)),
  };
}

/** 플레이어 없이 14일 전체를 즉시 시뮬레이션 (`빠른 실행`) */
export function runFull(config: SimConfig, opts: { saintsData?: SaintData[] } = {}): Simulation {
  const sim = createSimulation(config, opts);
  const days = totalDays(config);
  for (let d = 0; d < days; d++) advanceDay(sim);
  return sim;
}
