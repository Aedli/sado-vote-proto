import { describe, expect, it } from 'vitest';
import { defaultSimConfig } from '../src/config';
import { DEFAULT_POPULATION } from '../src/config/archetypes';
import { ASSUMPTION_FIELDS, applyField, diffFromDefault, restorePopulation, serializePopulation } from '../src/config/assumptionFields';
import { runFull, summarize } from '../src/sim/runner';

describe('가정값 입력칸', () => {
  it('기본 상태에서는 바뀐 칸이 없다', () => {
    expect(diffFromDefault(structuredClone(DEFAULT_POPULATION))).toHaveLength(0);
  });

  it('모든 칸이 읽고 쓰기가 맞물린다', () => {
    for (const f of ASSUMPTION_FIELDS) {
      const p = structuredClone(DEFAULT_POPULATION);
      const v = f.get(p);
      f.set(p, v);
      expect(f.get(p)).toEqual(v);
    }
  });

  it('바꾸면 원본은 그대로이고 바뀐 칸이 기록된다', () => {
    const p = applyField(DEFAULT_POPULATION, 'rewardSensitivity', 0.3);
    expect(DEFAULT_POPULATION.rewardSensitivity).toBe(0.7);
    expect(p.rewardSensitivity).toBe(0.3);
    const d = diffFromDefault(p);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ from: '0.7', to: '0.3' });
  });

  it('범위 밖 값은 범위 안으로 맞춘다', () => {
    expect(applyField(DEFAULT_POPULATION, 'devoted.connectRate', 1.5).archetypes.devoted.connectRate).toBe(1);
    expect(applyField(DEFAULT_POPULATION, 'rewardSensitivity', -2).rewardSensitivity).toBe(0);
    expect(applyField(DEFAULT_POPULATION, 'routinePrelimTopN', 7.6).routinePrelimTopN).toBe(8);
  });

  it('진입일 범위는 시작 ≤ 끝을 유지한다', () => {
    const p = applyField(DEFAULT_POPULATION, 'late.prelimEntryFrom', 7);
    expect(p.late.prelimEntryDays).toEqual([7, 7]);
    const q = applyField(p, 'late.prelimEntryTo', 2);
    expect(q.late.prelimEntryDays).toEqual([2, 2]);
  });

  it('최애 생존 확률은 자동(null)과 숫자를 오갈 수 있다', () => {
    const p = applyField(DEFAULT_POPULATION, 'late.favoriteSurvivedRate', 0.4);
    expect(p.late.favoriteSurvivedRate).toBe(0.4);
    expect(applyField(p, 'late.favoriteSurvivedRate', null).late.favoriteSurvivedRate).toBeNull();
  });
});

describe('브라우저 저장', () => {
  it('바뀐 칸만 저장하고 그대로 복원한다', () => {
    let p = applyField(DEFAULT_POPULATION, 'fervor.mode', 'both');
    p = applyField(p, 'light.ratio', 0.4);
    const saved = JSON.parse(JSON.stringify(serializePopulation(p)));
    expect(Object.keys(saved).sort()).toEqual(['fervor.mode', 'light.ratio']);
    expect(restorePopulation(saved)).toEqual(p);
  });

  it('깨진 저장값은 무시하고 기본값을 쓴다', () => {
    expect(restorePopulation(null)).toEqual(DEFAULT_POPULATION);
    expect(restorePopulation({ rewardSensitivity: 'abc', 'fervor.mode': 'weird', unknown: 3 })).toEqual(DEFAULT_POPULATION);
  });
});

describe('바꾼 가정값이 시뮬레이션에 반영된다', () => {
  it('보상 민감도를 0으로 하면 최적화형도 최애를 고른다', () => {
    const c = defaultSimConfig();
    c.run.botCount = 3000;
    c.population = applyField(c.population, 'rewardSensitivity', 0);
    const sim = runFull(c);
    for (const b of sim.bots.filter((b) => b.archetype === 'optimizer' && !b.favoriteEliminated)) {
      expect(b.finalPlan).toBe(b.prefs[0]);
    }
  });

  it('가정값이 다르면 결과가 달라진다', () => {
    const a = defaultSimConfig();
    a.run.botCount = 3000;
    const b = structuredClone(a);
    b.population = applyField(b.population, 'light.connectRate', 0.95);
    expect(summarize(runFull(a)).prelimRanking).not.toEqual(summarize(runFull(b)).prelimRanking);
  });
});
