// 하루 마감과 일차 진행 (§8.0 `다음 날로`)

import { closeFinalDay } from './final';
import { closePrelimDay, computeFinalists } from './preliminary';
import { rankMap, rankSaints } from './ranking';
import { phaseOf, shuffleDayOrder, type EventState } from './state';

/** 오늘을 마감하고 다음 날로 넘어간다. 예선 마지막 날이면 진출자를 확정한다 */
export function closeDay(state: EventState): void {
  const phase = phaseOf(state);
  if (phase === 'ended') return;
  for (const u of state.users) {
    if (phase === 'prelim') closePrelimDay(state, u);
    else closeFinalDay(u);
    u.stampSub = 0;
  }
  if (phase === 'prelim') {
    if (state.config.rules.prelim.rankingVisibility === 'public') {
      state.publicPrelimRank = rankMap(rankSaints(state.prelimVotes, state.prelimReachedAt), state.saintCount);
    }
    if (state.day === state.config.rules.prelim.days) state.finalists = computeFinalists(state);
  }
  state.day++;
  shuffleDayOrder(state);
}
