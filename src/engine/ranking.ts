// 사도 순위, 딜링 순위 집계 (SPEC §3, §4, 부록 B1)

import type { EventState, UserState } from './state';

/** 득표 내림차순, 동표면 그 득표에 먼저 도달한(시각이 빠른) 사도 우선 */
export function rankSaints(votes: ArrayLike<number>, reachedAt: ArrayLike<number>, candidates?: number[]): number[] {
  const list = candidates ? [...candidates] : Array.from({ length: votes.length }, (_, i) => i);
  return list.sort((a, b) => votes[b] - votes[a] || reachedAt[a] - reachedAt[b] || a - b);
}

/** 사도 인덱스 → 순위(1부터). 후보에 없으면 0 */
export function rankMap(ranking: number[], size: number): number[] {
  const out = new Array(size).fill(0);
  ranking.forEach((s, i) => (out[s] = i + 1));
  return out;
}

/** 본선 사도 순위 (본선 득표만, 부록 B12) */
export function finalSaintRanking(state: EventState): number[] {
  return rankSaints(state.finalVotes, state.finalReachedAt, state.finalists ?? []);
}

/** 랭킹판 모수: 보스전 1회 이상 참여 유저 (§4) */
export function isBoardParticipant(user: UserState): boolean {
  return user.final.entriesTotal > 0 && user.final.saint !== -1;
}

/** 유저가 속한 랭킹판 키. 사도별 판이면 사도 인덱스, 통합 판이면 -1 */
export function boardKeyOf(state: EventState, user: UserState): number {
  return state.config.rules.final.boardMode === 'unified' ? -1 : user.final.saint;
}

export function compareDealers(a: UserState, b: UserState): number {
  return b.final.total - a.final.total || a.final.reachedAt - b.final.reachedAt || a.id - b.id;
}

/** 판 키 → 순위 순서의 유저 목록 */
export function buildBoards(state: EventState): Map<number, UserState[]> {
  const boards = new Map<number, UserState[]>();
  for (const u of state.users) {
    if (!isBoardParticipant(u)) continue;
    const key = boardKeyOf(state, u);
    let list = boards.get(key);
    if (!list) boards.set(key, (list = []));
    list.push(u);
  }
  for (const list of boards.values()) list.sort(compareDealers);
  return boards;
}

export interface DealStanding {
  board: number;
  rank: number;
  boardSize: number;
}

/** 모든 유저의 딜링 순위. 참여하지 않은 유저는 null */
export function dealStandings(state: EventState): (DealStanding | null)[] {
  const out: (DealStanding | null)[] = new Array(state.users.length).fill(null);
  for (const [board, list] of buildBoards(state)) {
    list.forEach((u, i) => (out[u.id] = { board, rank: i + 1, boardSize: list.length }));
  }
  return out;
}
