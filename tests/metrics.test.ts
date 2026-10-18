import { describe, expect, it } from 'vitest';
import { defaultSimConfig } from '../src/config';
import { DEFAULT_CRITERIA } from '../src/config/criteria';
import { gini, inversionStats, judgeHigh, judgeLow, median, placeInBoards, ranks, spearman, worst } from '../src/sim/metrics';
import { runReportBundle } from '../src/sim/report';
import { runFull } from '../src/sim/runner';

describe('통계 도우미', () => {
  it('중앙값', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it('동점은 평균 순위', () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4]);
  });

  it('스피어만: 순서가 같으면 1, 반대면 -1', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
  });

  it('지니: 균등이면 0, 한 명 독점에 가까우면 1에 가까움', () => {
    expect(gini([5, 5, 5, 5])).toBeCloseTo(0);
    expect(gini([0, 0, 0, 100])).toBeCloseTo(0.75);
  });

  it('순위 역전 쌍과 열성 우위 비율', () => {
    // 사도 0: 팬 10·표 100, 사도 1: 팬 20·표 50 → 뒤집힘, 이긴 쪽(0)의 열성도가 더 높음
    const r = inversionStats([10, 20, 30], [100, 50, 300], [1.5, 1.0, 1.0]);
    expect(r.comparable).toBe(3);
    expect(r.inverted).toBe(1);
    expect(r.fervorWinShare).toBe(1);
  });
});

describe('판정', () => {
  it('높을수록 좋은 값 / 낮을수록 좋은 값', () => {
    expect(judgeHigh(0.95, { pass: 0.9, warn: 0.7 })).toBe('pass');
    expect(judgeHigh(0.8, { pass: 0.9, warn: 0.7 })).toBe('warn');
    expect(judgeHigh(0.5, { pass: 0.9, warn: 0.7 })).toBe('fail');
    expect(judgeLow(0.2, { pass: 0.3, warn: 0.5 })).toBe('pass');
    expect(judgeLow(0.4, { pass: 0.3, warn: 0.5 })).toBe('warn');
    expect(judgeLow(0.6, { pass: 0.3, warn: 0.5 })).toBe('fail');
  });

  it('종합 판정은 가장 나쁜 것', () => {
    expect(worst('pass', 'warn', 'pass')).toBe('warn');
    expect(worst('pass', 'fail', 'warn')).toBe('fail');
    expect(worst('pass')).toBe('pass');
  });
});

describe('가상 이동 (같은 계정을 다른 판에 넣기)', () => {
  it('자기 판에서는 순위가 그대로, 다른 판에서는 인원이 1명 늘어난다', () => {
    const c = defaultSimConfig();
    c.run.botCount = 2000;
    const sim = runFull(c);
    const totals = new Map<number, number[]>();
    for (const s of sim.state.finalists!) totals.set(s, []);
    for (const u of sim.state.users) if (u.final.entriesTotal > 0) totals.get(u.final.saint)!.push(u.final.total);
    for (const l of totals.values()) l.sort((a, b) => b - a);
    const home = sim.state.finalists![0];
    const homeTop = totals.get(home)![0];
    const placements = placeInBoards(sim, homeTop, home, totals);
    const own = placements.find((p) => p.saint === home)!;
    expect(own.rank).toBe(1);
    expect(own.boardSize).toBe(totals.get(home)!.length);
    const other = placements.find((p) => p.saint !== home)!;
    expect(other.boardSize).toBe(totals.get(other.saint)!.length + 1);
  });
});

describe('리포트 묶음', () => {
  const c = defaultSimConfig();
  c.run.botCount = 3000;
  const r = runReportBundle(c, DEFAULT_CRITERIA);

  it('H1~H3와 판정이 모두 채워진다', () => {
    expect(r.h1.representatives).toHaveLength(3);
    expect(r.h1.boards).toHaveLength(10);
    expect(['pass', 'warn', 'fail']).toContain(r.h1.verdict);
    expect(['pass', 'warn', 'fail']).toContain(r.h2.verdict);
    expect(['pass', 'warn', 'fail']).toContain(r.h3.verdict);
    expect(r.h2.fixed).not.toBeNull();
  });

  it('진출 인원 민감도는 5/10/15/20명 4개', () => {
    expect(r.h3.sensitivity.map((s) => s.finalists)).toEqual([5, 10, 15, 20]);
  });

  it('진출 인원이 늘면 최애 탈락 비율은 줄어든다', () => {
    const rates = r.h3.sensitivity.map((s) => s.favoriteEliminatedRate);
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeLessThan(rates[i - 1]);
  });

  it('참가상 가치 510점, 주의 기준 격차 102점', () => {
    expect(r.participationValue).toBe(510);
    expect(r.warnGap).toBeCloseTo(102);
  });

  it('같은 설정이면 리포트도 동일', () => {
    expect(runReportBundle(c, DEFAULT_CRITERIA)).toEqual(r);
  });
});
