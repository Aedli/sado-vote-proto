// 본선 규칙 (SPEC §4, 부록 B2)

import { PERSONALITIES, type Personality } from '../config/rules';
import { rollScore } from './damage';
import type { Rng } from './rng';
import { RuleError, finalDay, isActive, nextStamp, phaseOf, type EventState, type UserState } from './state';

function assertFinalActive(state: EventState, user: UserState): void {
  if (phaseOf(state) !== 'final') throw new RuleError('NOT_FINAL', '본선 기간이 아닙니다.');
  if (!isActive(state, user)) throw new RuleError('NOT_JOINED', '아직 이벤트에 참여하지 않았습니다.');
}

/** 본선 투표 사도 확정. 최초 1회만, 종료까지 변경 불가 */
export function chooseFinalSaint(state: EventState, user: UserState, saint: number): void {
  assertFinalActive(state, user);
  if (!state.finalists?.includes(saint)) throw new RuleError('NOT_FINALIST', '본선 진출 사도만 선택할 수 있습니다.');
  if (user.final.saint !== -1) {
    if (user.final.saint === saint) return;
    throw new RuleError('FINAL_SAINT_LOCKED', '본선 투표 사도는 본선 종료까지 변경할 수 없습니다.');
  }
  user.final.saint = saint;
}

export function isBossChoiceDay(state: EventState): boolean {
  return state.config.rules.final.bossChoiceDays.includes(finalDay(state));
}

/** 오늘의 보스 성격. 성격 선택일에 아직 고르지 않았으면 null */
export function bossFor(state: EventState, user: UserState): Personality | null {
  const fd = finalDay(state);
  if (isBossChoiceDay(state)) return user.final.chosenBoss[fd] ?? null;
  const rotation = state.config.rules.final.bossRotation;
  return rotation[(fd - 1) % rotation.length];
}

/** 성격 선택일에 고를 수 있는 성격 (다른 선택일에 고른 성격은 제외) */
export function availableBossChoices(state: EventState, user: UserState): Personality[] {
  const fd = finalDay(state);
  const used = new Set(
    Object.entries(user.final.chosenBoss)
      .filter(([day]) => Number(day) !== fd)
      .map(([, p]) => p),
  );
  return PERSONALITIES.filter((p) => !used.has(p));
}

/** 6·7일차 보스 성격 선택. 그날 입장 전까지만 바꿀 수 있다 */
export function chooseBoss(state: EventState, user: UserState, personality: Personality): void {
  assertFinalActive(state, user);
  if (!isBossChoiceDay(state)) throw new RuleError('NOT_CHOICE_DAY', '오늘은 보스 성격이 정해진 날입니다.');
  if (user.final.entriesToday > 0) throw new RuleError('BOSS_LOCKED_TODAY', '이미 입장해서 오늘의 보스 성격을 바꿀 수 없습니다.');
  if (!availableBossChoices(state, user).includes(personality)) {
    throw new RuleError('BOSS_DUPLICATE', '다른 날에 이미 고른 성격은 선택할 수 없습니다.');
  }
  user.final.chosenBoss[finalDay(state)] = personality;
}

export function entriesLeft(state: EventState, user: UserState): number {
  return state.config.rules.final.entriesPerDay - user.final.entriesToday;
}

export function canSweep(state: EventState, user: UserState): boolean {
  return phaseOf(state) === 'final' && user.final.lastScoreToday >= 0 && entriesLeft(state, user) > 0;
}

function assertCanEnter(state: EventState, user: UserState): void {
  assertFinalActive(state, user);
  if (user.final.saint === -1) throw new RuleError('NO_FINAL_SAINT', '먼저 본선 투표 사도를 정하세요.');
  if (entriesLeft(state, user) <= 0) throw new RuleError('NO_ENTRIES', '오늘 입장 횟수를 모두 사용했습니다.');
}

/** 입장 1회 기록: 점수 누적, 표 9표 귀속 */
function recordEntry(state: EventState, user: UserState, score: number): void {
  const f = user.final;
  const stamp = nextStamp(state, user);
  f.scores.push(score);
  f.total += score;
  if (score > 0) f.reachedAt = stamp;
  f.entriesToday++;
  f.entriesTotal++;
  const votes = state.config.rules.final.votesPerEntry;
  f.votesTotal += votes;
  state.finalVotes[f.saint] += votes;
  state.finalReachedAt[f.saint] = Math.max(state.finalReachedAt[f.saint], stamp);
}

/** `출발` 직접 도전 (재도전 포함). 반환값은 이번 점수 */
export function challenge(state: EventState, user: UserState, rng: Rng): number {
  assertCanEnter(state, user);
  const boss = bossFor(state, user);
  if (boss === null) throw new RuleError('NO_BOSS', '오늘 상대할 보스 성격을 먼저 고르세요.');
  const score = rollScore(rng, state.config.rules.damage, user.account, boss);
  recordEntry(state, user, score);
  user.final.attemptsToday++;
  user.final.lastScoreToday = score;
  return score;
}

/** `소탕`: 당일 직전 도전 기록으로 남은 입장 횟수를 처리. 반환값은 소탕한 횟수 */
export function sweep(state: EventState, user: UserState, count = entriesLeft(state, user)): number {
  assertCanEnter(state, user);
  if (user.final.lastScoreToday < 0) throw new RuleError('SWEEP_LOCKED', '오늘 1회 이상 도전해야 소탕할 수 있습니다.');
  const n = Math.min(count, entriesLeft(state, user));
  for (let i = 0; i < n; i++) recordEntry(state, user, user.final.lastScoreToday);
  return n;
}

/** 본선 하루 마감: 미사용 입장은 0점으로 소멸, 소탕 기록 초기화 */
export function closeFinalDay(user: UserState): void {
  user.final.entriesToday = 0;
  user.final.attemptsToday = 0;
  user.final.lastScoreToday = -1;
}
