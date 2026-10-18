import { describe, expect, it } from 'vitest';
import { DEAL_TIERS } from '../src/config/rewards';
import { closeDay } from '../src/engine/day';
import { expectedScore } from '../src/engine/damage';
import { availableBossChoices, bossFor, canSweep, challenge, chooseBoss, chooseFinalSaint, sweep } from '../src/engine/final';
import { claimAll, claimMission, completeMission, computeFinalists, selectPrelimSaint, unclaimedVotes } from '../src/engine/preliminary';
import { buildBoards, dealStandings } from '../src/engine/ranking';
import { dealTierFor } from '../src/engine/rewards';
import { Rng } from '../src/engine/rng';
import { RuleError, finalDay } from '../src/engine/state';
import { makeState, skipDays, toFinal } from './helpers';

const doAllMissions = (state: ReturnType<typeof makeState>, userId = 0) => {
  for (let m = 0; m < 9; m++) completeMission(state, state.users[userId], m);
};

describe('RNG', () => {
  it('같은 시드면 같은 수열', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });
});

describe('예선: 일일 최대 27표', () => {
  it('미션 9개 × 3표 = 27표가 최대이고, 같은 미션을 두 번 받을 수 없다', () => {
    const s = makeState();
    const u = s.users[0];
    selectPrelimSaint(s, u, 3);
    doAllMissions(s);
    expect(claimAll(s, u)).toBe(27);
    expect(claimAll(s, u)).toBe(0);
    expect(() => claimMission(s, u, 0)).toThrow(RuleError);
    expect(u.prelim.todayVotes).toBe(27);
    expect(s.prelimVotes[3]).toBe(27);
  });

  it('사도를 고르지 않으면 받기 불가', () => {
    const s = makeState();
    completeMission(s, s.users[0], 0);
    expect(() => claimMission(s, s.users[0], 0)).toThrowError(/사도를 선택/);
  });

  it('완료하지 않은 미션은 받을 수 없다', () => {
    const s = makeState();
    selectPrelimSaint(s, s.users[0], 0);
    expect(() => claimMission(s, s.users[0], 0)).toThrow(RuleError);
  });

  it('당일 투표 사도 변경 불가, 다음 날에는 재선택 가능', () => {
    const s = makeState();
    const u = s.users[0];
    selectPrelimSaint(s, u, 1);
    expect(() => selectPrelimSaint(s, u, 2)).toThrowError(/이미 투표할 사도/);
    closeDay(s);
    selectPrelimSaint(s, u, 2);
    expect(u.prelim.daySaint).toBe(2);
  });

  it('7일 최대 189표', () => {
    const s = makeState();
    const u = s.users[0];
    for (let d = 0; d < 7; d++) {
      selectPrelimSaint(s, u, d);
      doAllMissions(s);
      claimAll(s, u);
      closeDay(s);
    }
    expect(u.prelim.totalVotes).toBe(189);
    expect(u.prelim.history).toHaveLength(7);
  });
});

describe('예선: 이월 없음', () => {
  it('받지 않은 표는 다음 날로 넘어가면 소멸한다', () => {
    const s = makeState();
    const u = s.users[0];
    selectPrelimSaint(s, u, 0);
    doAllMissions(s);
    claimMission(s, u, 0);
    expect(unclaimedVotes(s, u)).toBe(24);
    closeDay(s);
    expect(u.prelim.lostVotes).toBe(24);
    expect(s.prelimVotes[0]).toBe(3);
    // 다음 날 미션 상태는 초기화되어 어제 미션을 받을 수 없다
    selectPrelimSaint(s, u, 0);
    expect(() => claimMission(s, u, 1)).toThrow(RuleError);
    expect(unclaimedVotes(s, u)).toBe(0);
  });
});

describe('예선: 중도 참여', () => {
  it('4일차 참여자는 잔여 4일분(최대 108표)만 받는다', () => {
    const s = makeState(1, undefined, [4]);
    const u = s.users[0];
    expect(() => selectPrelimSaint(s, u, 0)).toThrowError(/참여하지 않았/);
    for (let d = 1; d <= 7; d++) {
      if (d >= 4) {
        selectPrelimSaint(s, u, 0);
        doAllMissions(s);
        claimAll(s, u);
      }
      closeDay(s);
    }
    expect(u.prelim.totalVotes).toBe(108);
  });
});

describe('예선: 진출 10명 정원·동표 처리', () => {
  it('참여 규모와 무관하게 정확히 10명', () => {
    const s = makeState(3);
    selectPrelimSaint(s, s.users[0], 0);
    doAllMissions(s, 0);
    claimAll(s, s.users[0]);
    expect(computeFinalists(s)).toHaveLength(10);
  });

  it('동표면 그 득표에 먼저 도달한 사도가 우선 (일차가 빠른 쪽)', () => {
    const s = makeState(2);
    const [a, b] = s.users;
    // 1일차: 사도 50이 27표 도달
    selectPrelimSaint(s, a, 50);
    doAllMissions(s, 0);
    claimAll(s, a);
    closeDay(s);
    // 2일차: 사도 7이 27표 도달
    selectPrelimSaint(s, b, 7);
    doAllMissions(s, 1);
    claimAll(s, b);
    const top = computeFinalists(s);
    expect(top[0]).toBe(50);
    expect(top[1]).toBe(7);
  });

  it('같은 날 동표면 그날 처리 순번이 빠른 유저가 귀속한 사도가 우선', () => {
    const s = makeState(2);
    const [a, b] = s.users;
    selectPrelimSaint(s, a, 20);
    selectPrelimSaint(s, b, 30);
    doAllMissions(s, 0);
    doAllMissions(s, 1);
    // 처리 순번과 무관하게 b부터 행동해도, 시각은 그날 순번으로 매겨진다
    claimAll(s, b);
    claimAll(s, a);
    const first = s.dayOrder[a.id] < s.dayOrder[b.id] ? 20 : 30;
    expect(computeFinalists(s)[0]).toBe(first);
  });

  it('득표가 많으면 도달 시각과 무관하게 앞선다', () => {
    const s = makeState(2);
    selectPrelimSaint(s, s.users[0], 1);
    completeMission(s, s.users[0], 0);
    claimAll(s, s.users[0]);
    closeDay(s);
    selectPrelimSaint(s, s.users[1], 2);
    doAllMissions(s, 1);
    claimAll(s, s.users[1]);
    expect(computeFinalists(s).slice(0, 2)).toEqual([2, 1]);
  });

  it('예선 마지막 날 마감 시 진출자가 확정된다', () => {
    const s = makeState();
    expect(s.finalists).toBeNull();
    skipDays(s, 7);
    expect(s.finalists).toHaveLength(10);
    expect(finalDay(s)).toBe(1);
  });
});

describe('본선: 투표 사도 변경 불가', () => {
  it('한 번 확정하면 종료까지 바꿀 수 없다', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const u = s.users[0];
    chooseFinalSaint(s, u, 3);
    expect(() => chooseFinalSaint(s, u, 4)).toThrowError(/변경할 수 없습니다/);
    skipDays(s, 3);
    expect(() => chooseFinalSaint(s, u, 5)).toThrow(RuleError);
    expect(u.final.saint).toBe(3);
  });

  it('진출자가 아닌 사도는 고를 수 없다', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(() => chooseFinalSaint(s, s.users[0], 50)).toThrowError(/본선 진출 사도만/);
  });
});

describe('본선: 입장·표', () => {
  it('하루 3회, 입장당 9표, 하루 최대 27표', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const u = s.users[0];
    const rng = new Rng(1);
    chooseFinalSaint(s, u, 0);
    challenge(s, u, rng);
    challenge(s, u, rng);
    challenge(s, u, rng);
    expect(() => challenge(s, u, rng)).toThrowError(/입장 횟수/);
    expect(s.finalVotes[0]).toBe(27);
    expect(u.final.scores).toHaveLength(3);
  });

  it('미사용 회차는 이월되지 않고 0점', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const u = s.users[0];
    chooseFinalSaint(s, u, 0);
    challenge(s, u, new Rng(1));
    const total = u.final.total;
    closeDay(s);
    expect(u.final.entriesToday).toBe(0);
    expect(u.final.total).toBe(total);
    expect(u.final.entriesTotal).toBe(1);
  });
});

describe('본선: 소탕 점수 = 당일 직전 기록', () => {
  it('도전 전에는 소탕 불가', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const u = s.users[0];
    chooseFinalSaint(s, u, 0);
    expect(canSweep(s, u)).toBe(false);
    expect(() => sweep(s, u)).toThrowError(/1회 이상 도전/);
  });

  it('재도전 후 소탕하면 최고 기록이 아니라 직전 기록으로 처리된다', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const u = s.users[0];
    chooseFinalSaint(s, u, 0);
    const rng = new Rng(7);
    const first = challenge(s, u, rng);
    const second = challenge(s, u, rng);
    expect(first).not.toBe(second);
    expect(sweep(s, u)).toBe(1);
    expect(u.final.scores).toEqual([first, second, second]);
    expect(u.final.total).toBe(first + second * 2);
  });

  it('전날 기록으로는 소탕할 수 없다', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const u = s.users[0];
    chooseFinalSaint(s, u, 0);
    challenge(s, u, new Rng(1));
    closeDay(s);
    expect(canSweep(s, u)).toBe(false);
    expect(() => sweep(s, u)).toThrow(RuleError);
  });
});

describe('본선: 보스 성격', () => {
  it('1~5일차는 전 유저 동일 로테이션', () => {
    const s = makeState(2);
    toFinal(s);
    const seen = [];
    for (let d = 1; d <= 5; d++) {
      expect(bossFor(s, s.users[0])).toBe(bossFor(s, s.users[1]));
      seen.push(bossFor(s, s.users[0]));
      expect(() => chooseBoss(s, s.users[0], 'P1')).toThrowError(/정해진 날/);
      closeDay(s);
    }
    expect(seen).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
  });

  it('6·7일차는 서로 다른 성격만 선택 가능', () => {
    const s = makeState();
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    skipDays(s, 5);
    const u = s.users[0];
    expect(finalDay(s)).toBe(6);
    expect(bossFor(s, u)).toBeNull();
    chooseFinalSaint(s, u, 0);
    expect(() => challenge(s, u, new Rng(1))).toThrowError(/보스 성격/);
    chooseBoss(s, u, 'P3');
    challenge(s, u, new Rng(1));
    expect(() => chooseBoss(s, u, 'P4')).toThrowError(/이미 입장/);
    closeDay(s);
    expect(availableBossChoices(s, u)).not.toContain('P3');
    expect(() => chooseBoss(s, u, 'P3')).toThrowError(/이미 고른 성격/);
    chooseBoss(s, u, 'P4');
    expect(bossFor(s, u)).toBe('P4');
  });
});

describe('딜량 공식', () => {
  it('육성 성격이면 상성 1.0, 아니면 0.55', () => {
    const s = makeState();
    const rules = s.config.rules.damage;
    const acc = { spec: 'high' as const, trained: ['P1' as const], skill: 1 };
    expect(expectedScore(rules, acc, 'P1')).toBe(1_000_000);
    expect(expectedScore(rules, acc, 'P2')).toBeCloseTo(550_000);
  });
});

describe('딜링 순위·보상 구간 판정 순서', () => {
  const tier = (rank: number, n: number) => dealTierFor(rank, n, DEAL_TIERS).id;

  it('위에서부터 순서대로 가장 먼저 해당하는 구간', () => {
    expect(tier(1, 1000)).toBe('rank1');
    expect(tier(2, 1000)).toBe('rank2');
    expect(tier(3, 1000)).toBe('rank3');
    expect(tier(4, 1000)).toBe('top10');
    expect(tier(10, 1000)).toBe('top10');
    expect(tier(11, 1000)).toBe('top100');
    expect(tier(100, 1000)).toBe('top100');
    expect(tier(101, 1000)).toBe('top50pct');
    expect(tier(500, 1000)).toBe('top50pct');
    expect(tier(501, 1000)).toBe('participation');
  });

  it('상위 50%는 ceil(N × 0.5)', () => {
    expect(tier(501, 1001)).toBe('top50pct');
    expect(tier(502, 1001)).toBe('participation');
  });

  it('100위 안이면 상위 50%에도 해당해도 상위권을 받는다 (작은 판에서도 계산이 깨지지 않음)', () => {
    expect(tier(80, 150)).toBe('top100');
    expect(tier(120, 150)).toBe('participation');
  });

  it('판별 랭킹은 같은 사도 투표자끼리, 동점이면 먼저 도달한 유저 우위', () => {
    const s = makeState(3);
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const [a, b, c] = s.users;
    chooseFinalSaint(s, a, 0);
    chooseFinalSaint(s, b, 0);
    chooseFinalSaint(s, c, 1);
    // 같은 점수를 강제로 만든다: b는 1일차, a는 2일차에 도달
    challenge(s, b, new Rng(3));
    const bScore = b.final.total;
    closeDay(s);
    challenge(s, c, new Rng(9));
    a.final.scores.push(bScore);
    a.final.total = bScore;
    a.final.entriesTotal = 1;
    a.final.reachedAt = b.final.reachedAt + 1_000_000;
    const boards = buildBoards(s);
    expect(boards.get(0)!.map((u) => u.id)).toEqual([b.id, a.id]);
    expect(boards.get(1)!.map((u) => u.id)).toEqual([c.id]);
    const st = dealStandings(s);
    expect(st[b.id]).toEqual({ board: 0, rank: 1, boardSize: 2 });
    expect(st[c.id]).toEqual({ board: 1, rank: 1, boardSize: 1 });
  });

  it('보스전에 한 번도 참여하지 않은 유저는 랭킹 모수에서 빠진다', () => {
    const s = makeState(2);
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    chooseFinalSaint(s, s.users[0], 0);
    chooseFinalSaint(s, s.users[1], 0);
    challenge(s, s.users[0], new Rng(1));
    expect(buildBoards(s).get(0)).toHaveLength(1);
    expect(dealStandings(s)[1]).toBeNull();
  });

  it('통합 랭킹판 방식이면 모든 참여자가 한 판', () => {
    const s = makeState(2, (c) => (c.rules.final.boardMode = 'unified'));
    toFinal(s, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    chooseFinalSaint(s, s.users[0], 0);
    chooseFinalSaint(s, s.users[1], 1);
    challenge(s, s.users[0], new Rng(1));
    challenge(s, s.users[1], new Rng(2));
    expect(buildBoards(s).get(-1)).toHaveLength(2);
  });
});
