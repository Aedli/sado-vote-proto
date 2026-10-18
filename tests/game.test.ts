import { describe, expect, it } from 'vitest';
import { defaultSimConfig } from '../src/config';
import { applyCommand, createGame, phaseClock, playerView, plannerView, type PlayerView } from '../src/sim/game';

const setup = { spec: 'high' as const, trained: ['P1' as const, 'P2' as const, 'P3' as const] };

function newGame(bots = 1000) {
  const c = defaultSimConfig();
  c.run.botCount = bots;
  c.run.seed = 7;
  return createGame(c, setup);
}

/** 유저 시점 데이터에 있으면 안 되는 키 (§8.0: 순위·득표·판 규모 비공개) */
const FORBIDDEN = ['prelimVotes', 'finalVotes', 'rank', 'boardSize', 'size', 'ranking', 'prelimRanking', 'finalRanking', 'cutVotes', 'boards', 'fans'];

function keysDeep(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      out.add(k);
      keysDeep(x, out);
    }
  }
  return out;
}

function assertNoLeak(view: PlayerView) {
  expect(view.results).toBeNull();
  const keys = keysDeep(view);
  for (const k of FORBIDDEN) expect(keys.has(k), `유저 시점에 "${k}" 노출`).toBe(false);
}

/** 플레이어가 성실하게 14일을 플레이 */
function playThrough(sim: ReturnType<typeof newGame>, onDay?: (v: PlayerView) => void) {
  for (let d = 0; d < 14; d++) {
    const v = playerView(sim);
    onDay?.(v);
    if (v.clock.phase === 'prelim') {
      expect(applyCommand(sim, { type: 'selectPrelimSaint', saint: 0 }).ok).toBe(true);
      for (let m = 0; m < 9; m++) applyCommand(sim, { type: 'completeMission', mission: m });
      expect(applyCommand(sim, { type: 'claimAll' })).toEqual({ ok: true, value: 27 });
    } else {
      if (v.final.saint === -1) expect(applyCommand(sim, { type: 'chooseFinalSaint', saint: v.finalists![0] }).ok).toBe(true);
      if (v.final.isChoiceDay) applyCommand(sim, { type: 'chooseBoss', personality: v.final.availableBoss[0] });
      expect(applyCommand(sim, { type: 'challenge' }).ok).toBe(true);
      expect(applyCommand(sim, { type: 'sweep' })).toEqual({ ok: true, value: 2 });
    }
    expect(applyCommand(sim, { type: 'nextDay' }).ok).toBe(true);
  }
}

describe('플레이 세션', () => {
  it('14일을 끝까지 진행하면 결과가 발표된다', () => {
    const sim = newGame();
    playThrough(sim);
    const v = playerView(sim);
    expect(v.clock.phase).toBe('ended');
    expect(v.results).not.toBeNull();
    expect(v.results!.finalRanking).toHaveLength(10);
    expect(v.results!.myDealTier).not.toBeNull();
    expect(v.prelim.myTotalVotes).toBe(189);
    expect(v.final.myVotes).toBe(189);
    expect(v.final.scores).toHaveLength(21);
    expect(applyCommand(sim, { type: 'nextDay' }).ok).toBe(false);
  });

  it('플레이어의 표가 실제 사도 득표에 더해진다', () => {
    const a = newGame();
    const b = newGame();
    applyCommand(a, { type: 'selectPrelimSaint', saint: 113 });
    for (let m = 0; m < 9; m++) applyCommand(a, { type: 'completeMission', mission: m });
    applyCommand(a, { type: 'claimAll' });
    applyCommand(a, { type: 'nextDay' });
    applyCommand(b, { type: 'nextDay' });
    expect(a.state.prelimVotes[113] - b.state.prelimVotes[113]).toBe(27);
  });

  it('규칙 위반은 오류 메시지로 돌려준다', () => {
    const sim = newGame();
    const r = applyCommand(sim, { type: 'claimMission', mission: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/사도/);
    expect(applyCommand(sim, { type: 'challenge' }).ok).toBe(false);
  });

  it('미수령 표 수를 알려 준다', () => {
    const sim = newGame();
    applyCommand(sim, { type: 'selectPrelimSaint', saint: 1 });
    applyCommand(sim, { type: 'completeMission', mission: 0 });
    applyCommand(sim, { type: 'completeMission', mission: 1 });
    applyCommand(sim, { type: 'claimMission', mission: 0 });
    expect(playerView(sim).prelim.unclaimedVotes).toBe(3);
  });
});

describe('유저 시점 비공개', () => {
  it('이벤트 진행 중 매일, 유저 시점 데이터에 순위·득표·판 규모가 없다', () => {
    const sim = newGame();
    playThrough(sim, assertNoLeak);
  });

  it('기획자 시점에는 순위 정보가 있다', () => {
    const sim = newGame();
    for (let d = 0; d < 8; d++) applyCommand(sim, { type: 'nextDay' });
    applyCommand(sim, { type: 'chooseFinalSaint', saint: sim.state.finalists![0] });
    applyCommand(sim, { type: 'challenge' });
    const p = plannerView(sim);
    expect(p.prelim.top).toHaveLength(20);
    expect(p.final!.boards).toHaveLength(10);
    expect(p.final!.my?.rank).toBeGreaterThan(0);
    expect(p.asOf).toMatch(/본선 1일차 마감/);
  });
});

describe('가상 시각 (부록 B23)', () => {
  const c = defaultSimConfig();
  it('예선 3일차는 4일 18시간 후 종료, 갱신까지 23시간', () => {
    expect(phaseClock(c, 3)).toMatchObject({ phase: 'prelim', phaseDay: 3, daysLeft: 4, hoursLeft: 18, hoursToRefresh: 23 });
  });
  it('본선 1일차와 마지막 날', () => {
    expect(phaseClock(c, 8)).toMatchObject({ phase: 'final', phaseDay: 1, daysLeft: 6 });
    expect(phaseClock(c, 14)).toMatchObject({ phase: 'final', phaseDay: 7, daysLeft: 0, hoursLeft: 18 });
    expect(phaseClock(c, 15).phase).toBe('ended');
  });
});
