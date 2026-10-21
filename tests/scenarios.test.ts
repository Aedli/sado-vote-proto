import { describe, expect, it } from 'vitest';
import { DEFAULT_POPULATION } from '../src/config/archetypes';
import { applyField } from '../src/config/assumptionFields';
import { DEFAULT_CRITERIA } from '../src/config/criteria';
import { CRITERIA_FIELDS, SCENARIO_PRESETS } from '../src/config/scenarios';
import {
  defaultScenarios,
  exportSettings,
  importSettings,
  runScenarioSeed,
  scenarioConfig,
  scenarioKey,
  sd,
  seedList,
  summarize,
  type Scenario,
} from '../src/sim/scenarios';

const run = { seed: 100, botCount: 2000, repeats: 3 };
const base: Scenario = { id: 's1', name: '원안', preset: 'original', population: structuredClone(DEFAULT_POPULATION) };

describe('시나리오 설정', () => {
  it('기본 시나리오는 원안·통합·순위 공개·진출 20명', () => {
    expect(defaultScenarios(DEFAULT_POPULATION).map((s) => s.preset)).toEqual(['original', 'unified', 'public', 'finalists20']);
  });

  it('프리셋이 규칙을 바꾼다', () => {
    const c = scenarioConfig({ ...base, preset: 'finalists20' }, run, 1);
    expect(c.rules.prelim.finalistCount).toBe(20);
    expect(scenarioConfig({ ...base, preset: 'unified' }, run, 1).rules.final.boardMode).toBe('unified');
    expect(scenarioConfig({ ...base, preset: 'public' }, run, 1).rules.prelim.rankingVisibility).toBe('public');
    expect(scenarioConfig({ ...base, preset: 'fixedPrelim' }, run, 1).rules.prelim.reselect).toBe('fixed');
    expect(scenarioConfig(base, run, 1).rules.prelim.finalistCount).toBe(10);
    expect(Object.keys(SCENARIO_PRESETS)).toHaveLength(5);
  });

  it('모든 시나리오가 같은 시드 목록을 쓴다', () => {
    expect(seedList(run)).toEqual([100, 101, 102]);
  });

  it('결과 재사용 키는 가정값·실행 설정이 같으면 같고, 바뀌면 다르다', () => {
    const changed = { ...base, population: applyField(base.population, 'rewardSensitivity', 0.2) };
    expect(scenarioKey(base, run)).toBe(scenarioKey({ ...base, name: '이름만 바꿈' }, run));
    expect(scenarioKey(base, run)).not.toBe(scenarioKey(changed, run));
    expect(scenarioKey(base, run)).not.toBe(scenarioKey({ ...base, preset: 'unified' }, run));
  });
});

describe('반복 실행과 집계', () => {
  const results = seedList(run).map((seed) => runScenarioSeed(scenarioConfig(base, run, seed)));

  it('같은 시드면 결과가 같다', () => {
    expect(runScenarioSeed(scenarioConfig(base, run, 100))).toEqual(results[0]);
  });

  it('통합 랭킹판이면 판이 하나뿐이라 판별 보상 격차가 0', () => {
    const r = runScenarioSeed(scenarioConfig({ ...base, preset: 'unified' }, run, 100));
    expect(r.values['h1.gap.high']).toBe(0);
    expect(r.values['h1.gap.mid']).toBe(0);
    expect(r.boardSizes).toHaveLength(1);
  });

  it('표준편차', () => {
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(sd([5])).toBe(0);
  });

  it('평균·흔들림·판정 횟수가 채워진다', () => {
    const s = summarize(results, DEFAULT_CRITERIA);
    expect(s.runs).toBe(3);
    const sp = s.metrics['h2.spearman'];
    expect(sp.mean).toBeGreaterThan(0.5);
    expect(sp.counts!.pass + sp.counts!.warn + sp.counts!.fail).toBe(3);
    expect(s.metrics['h2.inverted'].counts).toBeNull();
    const h = s.hypotheses.h1.counts;
    expect(h.pass + h.warn + h.fail).toBe(3);
  });

  it('판정 기준만 바꾸면 재실행 없이 판정이 바뀐다', () => {
    const strict = structuredClone(DEFAULT_CRITERIA);
    strict.h2.spearman = { pass: 1.01, warn: 1.0 };
    expect(summarize(results, strict).metrics['h2.spearman'].meanVerdict).toBe('fail');
    const smallBig = structuredClone(DEFAULT_CRITERIA);
    smallBig.h3.smallBoardSize = 1_000_000;
    expect(summarize(results, smallBig).metrics['h3.smallBoards'].mean).toBe(10);
  });
});

describe('JSON 내보내기/불러오기', () => {
  it('그대로 왕복된다', () => {
    const scenarios = defaultScenarios(DEFAULT_POPULATION);
    scenarios[1].population = applyField(scenarios[1].population, 'light.connectRate', 0.8);
    const criteria = structuredClone(DEFAULT_CRITERIA);
    CRITERIA_FIELDS[0].set(criteria, 0.3);
    const back = importSettings(exportSettings({ version: 1, run, criteria, scenarios }));
    expect(back.run).toEqual(run);
    expect(back.criteria.h1.warnGapRatio).toBe(0.3);
    expect(back.scenarios.map((s) => s.preset)).toEqual(scenarios.map((s) => s.preset));
    expect(back.scenarios[1].population.archetypes.light.connectRate).toBe(0.8);
  });

  it('잘못된 값은 기본값으로', () => {
    const back = importSettings(JSON.stringify({ run: { botCount: 'x', repeats: 999 }, scenarios: [{ preset: 'nope' }] }));
    expect(back.run.botCount).toBe(10_000);
    expect(back.run.repeats).toBe(50);
    expect(back.scenarios[0].preset).toBe('original');
  });
});
