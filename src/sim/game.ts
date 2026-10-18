// 플레이어 플레이 세션 (SPEC §8). 플레이어 명령을 엔진에 전달하고, 화면용 데이터를 시점별로 나눠 만든다.
// - PlayerView: 유저 시점. 이벤트 진행 중에는 순위·득표·판 규모를 절대 담지 않는다(§8.0).
// - PlannerView: 기획자 시점 사이드 패널(§8.10). 봇 데이터는 전날 마감 기준(부록 B25).

import type { SimConfig } from '../config';
import { ARCHETYPE_IDS, type ArchetypeId } from '../config/archetypes';
import type { Personality, SpecTier } from '../config/rules';
import { VIRTUAL_CLOCK } from '../config/ui';
import { affinity, expectedScore } from '../engine/damage';
import { availableBossChoices, bossFor, canSweep, challenge, chooseBoss, chooseFinalSaint, entriesLeft, isBossChoiceDay, sweep } from '../engine/final';
import { canClaim, claimAll, claimMission, completeMission, selectPrelimSaint, unclaimedVotes } from '../engine/preliminary';
import { dealStandings, finalSaintRanking, rankSaints } from '../engine/ranking';
import { dealTierFor } from '../engine/rewards';
import { RuleError, finalDay, phaseOf, totalDays, type Account, type Phase, type PrelimHistoryEntry } from '../engine/state';
import { advanceDay, createSimulation, player, playerRng, type PlayerSetup, type Simulation } from './runner';

export type GameCommand =
  | { type: 'selectPrelimSaint'; saint: number }
  | { type: 'completeMission'; mission: number }
  | { type: 'claimMission'; mission: number }
  | { type: 'claimAll' }
  | { type: 'chooseFinalSaint'; saint: number }
  | { type: 'chooseBoss'; personality: Personality }
  | { type: 'challenge' }
  | { type: 'sweep' }
  | { type: 'nextDay' };

export type CommandResult =
  | { ok: true; value?: number }
  | { ok: false; code: string; message: string };

export function createGame(config: SimConfig, setup: PlayerSetup): Simulation {
  return createSimulation(config, { player: setup });
}

export function applyCommand(sim: Simulation, cmd: GameCommand): CommandResult {
  const me = player(sim);
  if (!me) return { ok: false, code: 'NO_PLAYER', message: '플레이어가 없는 시뮬레이션입니다.' };
  const s = sim.state;
  try {
    switch (cmd.type) {
      case 'selectPrelimSaint':
        selectPrelimSaint(s, me, cmd.saint);
        return { ok: true };
      case 'completeMission':
        completeMission(s, me, cmd.mission);
        return { ok: true };
      case 'claimMission':
        return { ok: true, value: claimMission(s, me, cmd.mission) };
      case 'claimAll':
        return { ok: true, value: claimAll(s, me) };
      case 'chooseFinalSaint':
        chooseFinalSaint(s, me, cmd.saint);
        return { ok: true };
      case 'chooseBoss':
        chooseBoss(s, me, cmd.personality);
        return { ok: true };
      case 'challenge':
        return { ok: true, value: challenge(s, me, playerRng(sim)) };
      case 'sweep':
        return { ok: true, value: sweep(s, me) };
      case 'nextDay':
        if (phaseOf(s) === 'ended') return { ok: false, code: 'ENDED', message: '이벤트가 끝났습니다.' };
        advanceDay(sim);
        return { ok: true };
    }
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, code: e.code, message: e.message };
    throw e;
  }
}

// ───────── 시각 (부록 B23) ─────────

export interface PhaseClock {
  phase: Phase;
  /** 단계 안의 일차 (1부터) */
  phaseDay: number;
  phaseDays: number;
  /** 단계 종료까지 남은 시간 */
  daysLeft: number;
  hoursLeft: number;
  /** 다음 갱신까지 남은 시간 */
  hoursToRefresh: number;
}

export function phaseClock(config: SimConfig, day: number): PhaseClock {
  const p = config.rules.prelim.days;
  const phase: Phase = day <= p ? 'prelim' : day <= totalDays(config) ? 'final' : 'ended';
  const phaseDays = phase === 'prelim' ? p : config.rules.final.days;
  const phaseDay = phase === 'prelim' ? day : phase === 'final' ? day - p : phaseDays;
  const { nowHour, resetHour } = VIRTUAL_CLOCK;
  return {
    phase,
    phaseDay,
    phaseDays,
    daysLeft: phase === 'ended' ? 0 : phaseDays - phaseDay,
    hoursLeft: phase === 'ended' ? 0 : 24 - nowHour,
    hoursToRefresh: 24 - nowHour + resetHour,
  };
}

// ───────── 유저 시점 ─────────

export interface PlayerView {
  day: number;
  clock: PhaseClock;
  account: Account;
  prelim: {
    daySaint: number;
    missionDone: boolean[];
    missionClaimed: boolean[];
    canClaim: boolean[];
    todayVotes: number;
    maxPerDay: number;
    /** 지금 날을 넘기면 소멸하는 내 표 */
    unclaimedVotes: number;
    history: PrelimHistoryEntry[];
    myTotalVotes: number;
  };
  /** 본선 진출자 (발표된 정보). 예선 종료 전에는 null */
  finalists: number[] | null;
  /** 예선에서 내가 한 번이라도 투표한 사도 */
  myPrelimSaints: number[];
  final: {
    saint: number;
    entriesToday: number;
    entriesLeft: number;
    entriesPerDay: number;
    canSweep: boolean;
    lastScoreToday: number;
    boss: Personality | null;
    isChoiceDay: boolean;
    availableBoss: Personality[];
    /** 오늘 보스가 내 육성 성격이면 true (보스 미정이면 null) */
    favorable: boolean | null;
    /** noise를 뺀 예상 점수 */
    expectedScore: number | null;
    scores: number[];
    total: number;
    myVotes: number;
  };
  /** 이벤트 종료 후에만 채워지는 결과 발표 (§8.11) */
  results: GameResults | null;
}

export interface GameResults {
  winner: number;
  finalRanking: { saint: number; votes: number }[];
  prelimRanking: { saint: number; votes: number }[];
  finalists: number[];
  /** 내 딜링 보상 구간 (보스전 미참여면 null) */
  myDealTier: string | null;
}

export function playerView(sim: Simulation): PlayerView {
  const s = sim.state;
  const me = player(sim)!;
  const rules = sim.config.rules;
  const phase = phaseOf(s);
  const inFinal = phase === 'final';
  const boss = inFinal ? bossFor(s, me) : null;
  const ended = phase === 'ended';
  return {
    day: s.day,
    clock: phaseClock(sim.config, s.day),
    account: me.account,
    prelim: {
      daySaint: me.prelim.daySaint,
      missionDone: [...me.prelim.missionDone],
      missionClaimed: [...me.prelim.missionClaimed],
      canClaim: me.prelim.missionDone.map((_, m) => canClaim(s, me, m)),
      todayVotes: me.prelim.todayVotes,
      maxPerDay: rules.prelim.missionCount * rules.prelim.votesPerMission,
      unclaimedVotes: unclaimedVotes(s, me),
      history: [...me.prelim.history],
      myTotalVotes: me.prelim.totalVotes,
    },
    finalists: s.finalists ? [...s.finalists] : null,
    myPrelimSaints: [...new Set(me.prelim.history.map((h) => h.saint))],
    final: {
      saint: me.final.saint,
      entriesToday: me.final.entriesToday,
      entriesLeft: inFinal ? entriesLeft(s, me) : 0,
      entriesPerDay: rules.final.entriesPerDay,
      canSweep: inFinal && canSweep(s, me),
      lastScoreToday: me.final.lastScoreToday,
      boss,
      isChoiceDay: inFinal && isBossChoiceDay(s),
      availableBoss: inFinal ? availableBossChoices(s, me) : [],
      favorable: boss ? affinity(rules.damage, me.account, boss) === rules.damage.affinityMatch : null,
      expectedScore: boss ? Math.round(expectedScore(rules.damage, me.account, boss)) : null,
      scores: [...me.final.scores],
      total: me.final.total,
      myVotes: me.final.votesTotal,
    },
    results: ended ? gameResults(sim) : null,
  };
}

function gameResults(sim: Simulation): GameResults {
  const s = sim.state;
  const finalRanking = finalSaintRanking(s);
  const st = sim.playerId === null ? null : dealStandings(s)[sim.playerId];
  return {
    winner: finalRanking[0] ?? -1,
    finalRanking: finalRanking.map((saint) => ({ saint, votes: s.finalVotes[saint] })),
    prelimRanking: rankSaints(s.prelimVotes, s.prelimReachedAt).map((saint) => ({ saint, votes: s.prelimVotes[saint] })),
    finalists: [...(s.finalists ?? [])],
    myDealTier: st ? dealTierFor(st.rank, st.boardSize, sim.config.rewards.dealTiers).id : null,
  };
}

// ───────── 기획자 시점 ─────────

export interface PlannerView {
  phase: Phase;
  /** 봇 데이터 기준 시점 설명 */
  asOf: string;
  prelim: {
    top: { saint: number; votes: number }[];
    /** 진출 컷(정원 마지막 순위)의 득표와 그 다음 순위 득표 */
    cutVotes: number;
    nextVotes: number;
    finalistCount: number;
    /** 내가 오늘 투표한 사도의 현재 순위 */
    mySaintRank: number | null;
  };
  /** 마지막으로 계산된 하루의 봇 참여 */
  lastDay: { day: number; connected: number; eligible: number; byArchetype: { archetype: ArchetypeId; rate: number; eligible: number }[] } | null;
  final: {
    boards: { saint: number; size: number; votes: number }[];
    my: { rank: number; boardSize: number; tierLabel: string } | null;
    /** decided = 본선 참여 여부를 정한 봇 수 (0이면 집계 전) */
    dropout: { archetype: ArchetypeId; rate: number; decided: number }[];
  } | null;
  myAccount: { spec: SpecTier; skill: number };
}

export function plannerView(sim: Simulation): PlannerView {
  const s = sim.state;
  const me = player(sim)!;
  const phase = phaseOf(s);
  const ranking = rankSaints(s.prelimVotes, s.prelimReachedAt);
  const n = sim.config.rules.prelim.finalistCount;
  const last = sim.daily[sim.daily.length - 1];
  const prelimDays = sim.config.rules.prelim.days;
  const lastLabel = last ? (last.phase === 'prelim' ? `예선 ${last.day}일차` : `본선 ${last.day - prelimDays}일차`) : null;

  let final: PlannerView['final'] = null;
  if (s.finalists) {
    const standings = dealStandings(s);
    const sizes = new Map<number, number>();
    for (const u of s.users) if (u.final.entriesTotal > 0 && u.final.saint !== -1) sizes.set(u.final.saint, (sizes.get(u.final.saint) ?? 0) + 1);
    const mine = sim.playerId === null ? null : standings[sim.playerId];
    const decided = sim.bots.filter((b) => b.finalPlan !== undefined);
    final = {
      boards: finalSaintRanking(s).map((saint) => ({ saint, size: sizes.get(saint) ?? 0, votes: s.finalVotes[saint] })),
      my: mine ? { rank: mine.rank, boardSize: mine.boardSize, tierLabel: dealTierFor(mine.rank, mine.boardSize, sim.config.rewards.dealTiers).label } : null,
      dropout: ARCHETYPE_IDS.map((archetype) => {
        const g = decided.filter((b) => b.archetype === archetype);
        return { archetype, rate: g.length ? g.filter((b) => b.finalPlan === -1).length / g.length : 0, decided: g.length };
      }),
    };
  }

  return {
    phase,
    asOf: lastLabel ? `봇 데이터는 ${lastLabel} 마감 기준, 내 표·점수는 현재 기준` : '아직 봇이 행동하기 전입니다 (첫날). 내 표·점수만 현재 기준으로 반영됩니다.',
    prelim: {
      top: ranking.slice(0, 20).map((saint) => ({ saint, votes: s.prelimVotes[saint] })),
      cutVotes: s.prelimVotes[ranking[n - 1]] ?? 0,
      nextVotes: s.prelimVotes[ranking[n]] ?? 0,
      finalistCount: n,
      mySaintRank: me.prelim.daySaint === -1 ? null : ranking.indexOf(me.prelim.daySaint) + 1,
    },
    lastDay: last
      ? {
          day: last.day,
          connected: ARCHETYPE_IDS.reduce((a, k) => a + last.connected[k], 0),
          eligible: ARCHETYPE_IDS.reduce((a, k) => a + last.eligible[k], 0),
          byArchetype: ARCHETYPE_IDS.map((archetype) => ({
            archetype,
            rate: last.eligible[archetype] ? last.connected[archetype] / last.eligible[archetype] : 0,
            eligible: last.eligible[archetype],
          })),
        }
      : null,
    final,
    myAccount: { spec: me.account.spec, skill: me.account.skill },
  };
}

/** 본선 일차 (화면 표시용) */
export const finalDayOf = (sim: Simulation) => finalDay(sim.state);
