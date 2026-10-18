// 이벤트 전체 상태 타입과 공통 유틸 (SPEC §3, §4, 부록 B1)

import type { SimConfig } from '../config';
import type { Personality, SpecTier } from '../config/rules';
import { Rng, hash32, labelHash } from './rng';

export interface Account {
  spec: SpecTier;
  trained: Personality[];
  /** 계정별 고정 skillFactor (§5) */
  skill: number;
}

export interface PrelimHistoryEntry {
  day: number;
  saint: number;
  votes: number;
}

export interface PrelimUserState {
  /** 오늘 투표 사도 (사도 인덱스, 없으면 -1) */
  daySaint: number;
  /** 재선택 '고정' 모드에서 처음 고른 사도 */
  fixedSaint: number;
  missionDone: boolean[];
  missionClaimed: boolean[];
  todayVotes: number;
  totalVotes: number;
  /** 받지 않아 소멸한 표 누계 */
  lostVotes: number;
  history: PrelimHistoryEntry[];
}

export interface FinalUserState {
  /** 본선 투표 사도 (확정 후 변경 불가, 없으면 -1) */
  saint: number;
  entriesToday: number;
  attemptsToday: number;
  /** 오늘 직전 도전 기록 (소탕 점수). 오늘 도전 전이면 -1 */
  lastScoreToday: number;
  /** 성격 선택일에 고른 보스 성격 (본선 일차 → 성격) */
  chosenBoss: Record<number, Personality>;
  /** 입장 회차별 점수 (도전·소탕 모두) */
  scores: number[];
  total: number;
  /** 최종 점수에 도달한 시각 (부록 B1). 점수가 0이면 -1 */
  reachedAt: number;
  entriesTotal: number;
  votesTotal: number;
}

export interface UserState {
  id: number;
  isPlayer: boolean;
  /** 처음 행동할 수 있는 일차 (전체 일차 기준, 1부터) */
  joinDay: number;
  account: Account;
  prelim: PrelimUserState;
  final: FinalUserState;
  /** 같은 날 같은 유저의 행동 순서 (시각 계산용) */
  stampSub: number;
}

export type Phase = 'prelim' | 'final' | 'ended';

export interface EventState {
  config: SimConfig;
  /** 현재 일차 (1 ~ 예선+본선 일수). 그보다 크면 종료 */
  day: number;
  saintCount: number;
  saintPersonality: Personality[];
  prelimVotes: number[];
  prelimReachedAt: number[];
  /** 예선 순위 순서의 진출자 사도 인덱스. 예선 종료 전에는 null */
  finalists: number[] | null;
  finalVotes: number[];
  finalReachedAt: number[];
  users: UserState[];
  /** 오늘 유저 처리 순번 (users 인덱스 → 순번) */
  dayOrder: Int32Array;
  /** 순위 공개 시나리오에서 전날 마감 기준 예선 순위 (사도 → 1부터 순위) */
  publicPrelimRank: number[] | null;
}

export class RuleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RuleError';
  }
}

export function totalDays(config: SimConfig): number {
  return config.rules.prelim.days + config.rules.final.days;
}

export function phaseOf(state: EventState): Phase {
  const p = state.config.rules.prelim.days;
  if (state.day <= p) return 'prelim';
  if (state.day <= totalDays(state.config)) return 'final';
  return 'ended';
}

/** 예선 일차 (1부터) */
export function prelimDay(state: EventState): number {
  return state.day;
}

/** 본선 일차 (1부터) */
export function finalDay(state: EventState): number {
  return state.day - state.config.rules.prelim.days;
}

export function isActive(state: EventState, user: UserState): boolean {
  return state.day >= user.joinDay && phaseOf(state) !== 'ended';
}

export function newPrelimUserState(missionCount: number): PrelimUserState {
  return {
    daySaint: -1,
    fixedSaint: -1,
    missionDone: new Array(missionCount).fill(false),
    missionClaimed: new Array(missionCount).fill(false),
    todayVotes: 0,
    totalVotes: 0,
    lostVotes: 0,
    history: [],
  };
}

export function newFinalUserState(): FinalUserState {
  return {
    saint: -1,
    entriesToday: 0,
    attemptsToday: 0,
    lastScoreToday: -1,
    chosenBoss: {},
    scores: [],
    total: 0,
    reachedAt: -1,
    entriesTotal: 0,
    votesTotal: 0,
  };
}

export function newUser(id: number, account: Account, joinDay: number, config: SimConfig, isPlayer = false): UserState {
  return {
    id,
    isPlayer,
    joinDay,
    account,
    prelim: newPrelimUserState(config.rules.prelim.missionCount),
    final: newFinalUserState(),
    stampSub: 0,
  };
}

export function createEventState(config: SimConfig, saintPersonality: Personality[], users: UserState[]): EventState {
  const n = saintPersonality.length;
  const state: EventState = {
    config,
    day: 1,
    saintCount: n,
    saintPersonality,
    prelimVotes: new Array(n).fill(0),
    prelimReachedAt: new Array(n).fill(-1),
    finalists: null,
    finalVotes: new Array(n).fill(0),
    finalReachedAt: new Array(n).fill(-1),
    users,
    dayOrder: new Int32Array(users.length),
    publicPrelimRank: null,
  };
  shuffleDayOrder(state);
  return state;
}

/** 그날 유저 처리 순번을 시드로 정한다 (부록 B1) */
export function shuffleDayOrder(state: EventState): void {
  const order = Array.from({ length: state.users.length }, (_, i) => i);
  new Rng(hash32(state.config.run.seed, labelHash('dayOrder'), state.day)).shuffle(order);
  for (let pos = 0; pos < order.length; pos++) state.dayOrder[order[pos]] = pos;
}

/** 행동 시각. 일차 → 그날 처리 순번 → 같은 유저의 행동 순서 순으로 비교된다 */
export function nextStamp(state: EventState, user: UserState): number {
  const stamp = (state.day * (state.users.length + 1) + state.dayOrder[user.id]) * 64 + user.stampSub;
  user.stampSub = Math.min(user.stampSub + 1, 63);
  return stamp;
}
