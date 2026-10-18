import { describe, expect, it } from 'vitest';
import { defaultSimConfig, type SimConfig } from '../src/config';
import { finalDay } from '../src/engine/state';
import { optimizeChoice } from '../src/sim/botBehavior';
import { fervorAdjusted } from '../src/sim/population';
import { advanceDay, createSimulation, runFull, summarize } from '../src/sim/runner';

const config = (bots: number, mutate?: (c: SimConfig) => void): SimConfig => {
  const c = defaultSimConfig();
  c.run.botCount = bots;
  c.run.seed = 12345;
  mutate?.(c);
  return c;
};

describe('재현성', () => {
  it('같은 시드와 설정이면 결과가 항상 동일', () => {
    const a = summarize(runFull(config(2000)));
    const b = summarize(runFull(config(2000)));
    expect({ ...a, maxDayMs: 0 }).toEqual({ ...b, maxDayMs: 0 });
  });

  it('시드가 다르면 결과가 달라진다', () => {
    const a = summarize(runFull(config(2000)));
    const b = summarize(runFull(config(2000, (c) => (c.run.seed = 999))));
    expect(a.prelimRanking).not.toEqual(b.prelimRanking);
  });
});

describe('봇 1만 명 성능', () => {
  it('하루 진행이 1초 이내', () => {
    const sim = runFull(config(10_000));
    for (const d of sim.daily) expect(d.ms).toBeLessThan(1000);
  });
});

describe('봇 행동이 규칙을 지킨다', () => {
  const sim = runFull(config(5000));
  const { state } = sim;
  const bots = sim.bots;

  it('예선 하루 27표, 본선 하루 27표를 넘지 않는다', () => {
    for (const u of state.users) {
      for (const h of u.prelim.history) expect(h.votes).toBeLessThanOrEqual(27);
      expect(u.prelim.totalVotes).toBeLessThanOrEqual(189);
      expect(u.final.votesTotal).toBeLessThanOrEqual(189);
      expect(u.final.entriesTotal).toBeLessThanOrEqual(21);
    }
  });

  it('진출자는 10명이고 본선 투표는 진출자에게만', () => {
    expect(state.finalists).toHaveLength(10);
    for (const u of state.users) if (u.final.saint !== -1) expect(state.finalists).toContain(u.final.saint);
  });

  it('열성 최애형은 예선 내내 최애에게만 투표', () => {
    for (const b of bots.filter((b) => b.archetype === 'devoted')) {
      for (const h of state.users[b.userId].prelim.history) expect(h.saint).toBe(b.prefs[0]);
    }
  });

  it('중도 진입형은 진입 전에는 행동하지 않는다', () => {
    const late = bots.filter((b) => b.archetype === 'late');
    expect(late.length).toBe(500);
    for (const b of late) {
      const u = state.users[b.userId];
      for (const h of u.prelim.history) expect(h.day).toBeGreaterThanOrEqual(u.joinDay);
      if (b.finalEntry) expect(u.prelim.totalVotes).toBe(0);
    }
  });

  it('이탈한 봇은 본선에 전혀 참여하지 않는다', () => {
    const left = bots.filter((b) => b.finalPlan === -1);
    expect(left.length).toBeGreaterThan(0);
    for (const b of left) expect(state.users[b.userId].final.entriesTotal).toBe(0);
  });

  it('최애 탈락에 영향 없는 유형(최적화·루틴)은 이탈하지 않는다', () => {
    for (const b of bots.filter((b) => b.archetype === 'optimizer' || b.archetype === 'routine')) {
      expect(b.finalPlan).not.toBe(-1);
    }
  });

  it('최애가 진출한 열성 최애형은 최애를 응원한다', () => {
    for (const b of bots.filter((b) => b.archetype === 'devoted' && !b.favoriteEliminated)) {
      expect(b.finalPlan).toBe(b.prefs[0]);
    }
  });

  it('유형 비율대로 정확히 배분된다', () => {
    const count = (id: string) => bots.filter((b) => b.archetype === id).length;
    expect(count('devoted')).toBe(750);
    expect(count('light')).toBe(1500);
    expect(count('routine')).toBe(1000);
  });
});

describe('6·7일차 봇 보스 성격', () => {
  it('두 날 서로 다른 성격, 육성 성격이 있으면 그중에서', () => {
    const sim = createSimulation(config(2000));
    const days = sim.config.rules.prelim.days + sim.config.rules.final.days;
    for (let d = 0; d < days; d++) advanceDay(sim);
    let checked = 0;
    for (const u of sim.state.users) {
      const six = u.final.chosenBoss[6];
      const seven = u.final.chosenBoss[7];
      if (six && seven) {
        checked++;
        expect(six).not.toBe(seven);
        expect(u.account.trained).toContain(six);
        if (u.account.trained.length >= 2) expect(u.account.trained).toContain(seven);
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('가정값 공식', () => {
  it('열성도 보정은 상향만, 상한 0.98', () => {
    const c = defaultSimConfig();
    expect(fervorAdjusted(c, 0.55, 1.8)).toBeCloseTo(0.63);
    expect(fervorAdjusted(c, 0.55, 0.6)).toBeCloseTo(0.55);
    expect(fervorAdjusted(c, 0.95, 1.8)).toBeCloseTo(0.98);
  });

  it('보상 최적화형: 민감도가 높으면 한산한 판, 낮으면 최애', () => {
    const sim = createSimulation(config(10));
    const s = sim.state;
    const ranked = [...sim.saints.keys()].sort((a, b) => sim.saints[a].popularityRank - sim.saints[b].popularityRank);
    const finalists = ranked.slice(0, 10);
    const bot = { ...sim.bots[0], prefs: [finalists[0], 200, 201] };
    sim.config.population.rewardSensitivity = 0.95;
    expect(optimizeChoice(sim.ctx, bot, finalists)).not.toBe(finalists[0]);
    sim.config.population.rewardSensitivity = 0.1;
    expect(optimizeChoice(sim.ctx, bot, finalists)).toBe(finalists[0]);
    expect(finalDay(s)).toBeLessThan(1);
  });
});

describe('플레이어 포함 시뮬레이션', () => {
  it('플레이어는 users[0]이고 봇 하루 진행에 끼어들지 않는다', () => {
    const sim = createSimulation(config(1000), { player: { spec: 'mid', trained: ['P1', 'P2'] } });
    expect(sim.playerId).toBe(0);
    expect(sim.botOf[0]).toBeUndefined();
    advanceDay(sim);
    expect(sim.state.users[0].prelim.totalVotes).toBe(0);
    expect(sim.state.day).toBe(2);
  });
});
