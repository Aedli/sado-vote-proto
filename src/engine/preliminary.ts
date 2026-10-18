// 예선 규칙 (SPEC §3)

import { rankSaints } from './ranking';
import { RuleError, isActive, nextStamp, phaseOf, type EventState, type UserState } from './state';

function assertPrelimActive(state: EventState, user: UserState): void {
  if (phaseOf(state) !== 'prelim') throw new RuleError('NOT_PRELIM', '예선 기간이 아닙니다.');
  if (!isActive(state, user)) throw new RuleError('NOT_JOINED', '아직 이벤트에 참여하지 않았습니다.');
}

function assertSaint(state: EventState, saint: number): void {
  if (!Number.isInteger(saint) || saint < 0 || saint >= state.saintCount) {
    throw new RuleError('INVALID_SAINT', '존재하지 않는 사도입니다.');
  }
}

/** 오늘 투표할 사도를 정한다. 하루 한 명, 정한 뒤에는 당일 변경 불가 */
export function selectPrelimSaint(state: EventState, user: UserState, saint: number): void {
  assertPrelimActive(state, user);
  assertSaint(state, saint);
  const p = user.prelim;
  if (p.daySaint !== -1) {
    if (p.daySaint === saint) return;
    throw new RuleError('SAINT_LOCKED_TODAY', '오늘은 이미 투표할 사도를 정했습니다. 내일 다시 선택할 수 있습니다.');
  }
  if (state.config.rules.prelim.reselect === 'fixed' && p.fixedSaint !== -1 && p.fixedSaint !== saint) {
    throw new RuleError('SAINT_FIXED', '예선 기간 동안 처음 고른 사도로 고정됩니다.');
  }
  p.daySaint = saint;
  if (p.fixedSaint === -1) p.fixedSaint = saint;
}

/** 미션 모의 수행 (`이동` 버튼) */
export function completeMission(state: EventState, user: UserState, mission: number): void {
  assertPrelimActive(state, user);
  if (mission < 0 || mission >= user.prelim.missionDone.length) {
    throw new RuleError('INVALID_MISSION', '존재하지 않는 미션입니다.');
  }
  user.prelim.missionDone[mission] = true;
}

/** 표를 사도에게 귀속한다 (자동 투표) */
export function addPrelimVotes(state: EventState, user: UserState, saint: number, votes: number): void {
  if (votes <= 0) return;
  state.prelimVotes[saint] += votes;
  // 득표는 늘기만 하므로 마지막 귀속 시각 = 최종 득표에 도달한 시각
  state.prelimReachedAt[saint] = Math.max(state.prelimReachedAt[saint], nextStamp(state, user));
  user.prelim.todayVotes += votes;
  user.prelim.totalVotes += votes;
}

export function canClaim(state: EventState, user: UserState, mission: number): boolean {
  const p = user.prelim;
  return (
    phaseOf(state) === 'prelim' &&
    isActive(state, user) &&
    p.daySaint !== -1 &&
    p.missionDone[mission] === true &&
    !p.missionClaimed[mission]
  );
}

/** 미션 보상 `받기` → 표 귀속. 반환값은 귀속된 표 수 */
export function claimMission(state: EventState, user: UserState, mission: number): number {
  assertPrelimActive(state, user);
  const p = user.prelim;
  if (p.daySaint === -1) throw new RuleError('NO_SAINT', '먼저 투표할 사도를 선택하세요.');
  if (!p.missionDone[mission]) throw new RuleError('MISSION_NOT_DONE', '아직 완료하지 않은 미션입니다.');
  if (p.missionClaimed[mission]) throw new RuleError('ALREADY_CLAIMED', '이미 받은 보상입니다.');
  p.missionClaimed[mission] = true;
  const votes = state.config.rules.prelim.votesPerMission;
  addPrelimVotes(state, user, p.daySaint, votes);
  return votes;
}

/** `모두 받기`. 완료된 미션을 일괄 수령 */
export function claimAll(state: EventState, user: UserState): number {
  assertPrelimActive(state, user);
  if (user.prelim.daySaint === -1) throw new RuleError('NO_SAINT', '먼저 투표할 사도를 선택하세요.');
  let votes = 0;
  for (let m = 0; m < user.prelim.missionDone.length; m++) {
    if (canClaim(state, user, m)) votes += claimMission(state, user, m);
  }
  return votes;
}

/** 지금 날짜를 넘기면 소멸할 표 수 (`다음 날로` 확인 팝업용) */
export function unclaimedVotes(state: EventState, user: UserState): number {
  if (phaseOf(state) !== 'prelim') return 0;
  const p = user.prelim;
  let count = 0;
  for (let m = 0; m < p.missionDone.length; m++) if (p.missionDone[m] && !p.missionClaimed[m]) count++;
  return count * state.config.rules.prelim.votesPerMission;
}

/** 예선 하루 마감: 미수령 표 소멸, 기록 저장, 다음 날을 위해 초기화 */
export function closePrelimDay(state: EventState, user: UserState): void {
  const p = user.prelim;
  p.lostVotes += unclaimedVotes(state, user);
  if (p.daySaint !== -1 && p.todayVotes > 0) {
    p.history.push({ day: state.day, saint: p.daySaint, votes: p.todayVotes });
  }
  p.daySaint = -1;
  p.todayVotes = 0;
  p.missionDone.fill(false);
  p.missionClaimed.fill(false);
}

/** 예선 순위 상위 N명 (정원제, 동표는 먼저 도달한 사도 우선) */
export function computeFinalists(state: EventState): number[] {
  const ranking = rankSaints(state.prelimVotes, state.prelimReachedAt);
  return ranking.slice(0, state.config.rules.prelim.finalistCount);
}
