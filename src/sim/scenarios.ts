// 시나리오 비교 실행 (SPEC §10, 부록 B31)
// - 시드 1개 실행 → 지표 값 추출(seedMetrics). 판정은 값에서 다시 계산하므로 판정 기준만 바꾸면 재실행이 필요 없다.
// - 같은 시드 목록을 모든 시나리오에 쓴다(같은 세상에서 비교).

import { defaultSimConfig, type SimConfig } from '../config';
import { type PopulationConfig } from '../config/archetypes';
import { restorePopulation, serializePopulation } from '../config/assumptionFields';
import { DEFAULT_CRITERIA, type CriteriaConfig } from '../config/criteria';
import { SPEC_TIERS, type SpecTier } from '../config/rules';
import {
  COMPARE_LIMITS,
  CRITERIA_FIELDS,
  DEFAULT_COMPARE_RUN,
  DEFAULT_SCENARIO_PRESETS,
  MAX_SCENARIOS,
  SCENARIO_PRESETS,
  SCENARIO_PRESET_IDS,
  type CompareRunConfig,
  type ScenarioPresetId,
} from '../config/scenarios';
import { computeReport, judgeHigh, judgeLow, mean, worst, type ReportData, type Verdict } from './metrics';
import { runFull } from './runner';

export interface Scenario {
  id: string;
  name: string;
  preset: ScenarioPresetId;
  population: PopulationConfig;
}

/** 시나리오 + 시드 → 실행 설정 */
export function scenarioConfig(s: Scenario, run: CompareRunConfig, seed: number): SimConfig {
  const c = defaultSimConfig();
  c.population = structuredClone(s.population);
  c.run = { seed, botCount: run.botCount };
  SCENARIO_PRESETS[s.preset].apply(c);
  return c;
}

export function seedList(run: CompareRunConfig): number[] {
  return Array.from({ length: run.repeats }, (_, i) => run.seed + i);
}

// ───────── 시드 1개의 지표 값 ─────────

export interface SeedResult {
  seed: number;
  values: Record<string, number>;
  boardSizes: number[];
}

export function seedMetrics(seed: number, r: ReportData): SeedResult {
  const v: Record<string, number> = {};
  for (const rep of r.h1.representatives) {
    v[`h1.gap.${rep.spec}`] = rep.gap;
    v[`h1.steps.${rep.spec}`] = rep.tierSteps;
  }
  for (const o of r.h1.optimizer) v[`h1.opt.${o.spec}`] = o.diff;
  v['h2.spearman'] = r.h2.spearman;
  v['h2.match'] = r.h2.finalistMatch;
  v['h2.inverted'] = r.h2.invertedRatio;
  v['h2.fervorWin'] = r.h2.fervorWinShare;
  v['h3.favElim'] = r.h3.favoriteEliminatedRate;
  v['h3.dropout'] = r.h3.dropoutRate;
  v['h3.boardMin'] = r.h3.boardMin;
  v['h3.boardMax'] = r.h3.boardMax;
  v['aux.prelimGini'] = r.aux.prelimGini;
  v['aux.lateRatio'] = r.aux.late.prelimEntryRatio;
  v['finalists'] = r.finalistCount;
  v['participationValue'] = r.participationValue;
  return { seed, values: v, boardSizes: r.h1.boards.map((b) => b.size) };
}

/** 시나리오의 시드 1개 실행 (Worker에서 호출) */
export function runScenarioSeed(config: SimConfig, criteria: CriteriaConfig = DEFAULT_CRITERIA): SeedResult {
  const sim = runFull(config);
  // 비교 화면은 기본 실행만 반복한다(부록 B31): 예선 고정·진출 인원 민감도 추가 실행은 하지 않는다
  const report = computeReport({ base: sim, fixed: null, sensitivity: [{ finalists: config.rules.prelim.finalistCount, sim }] }, criteria);
  return seedMetrics(config.run.seed, report);
}

// ───────── 지표 정의와 판정 ─────────

type Get = (id: string) => number;

export interface MetricDef {
  id: string;
  group: 'h1' | 'h2' | 'h3' | 'aux';
  label: string;
  /** 쉬운 설명 한 줄 */
  desc: string;
  unit: 'pct' | 'num' | 'point' | 'ratio';
  digits: number;
  judge?: (get: Get, c: CriteriaConfig) => Verdict;
}

const SPEC_NAME: Record<SpecTier, string> = { high: '고스펙', mid: '중스펙', low: '저스펙' };

function judgeGap(gap: number, steps: number, partValue: number, c: CriteriaConfig): Verdict {
  if (steps >= c.h1.failTierSteps) return 'fail';
  if (gap >= partValue * c.h1.warnGapRatio) return 'warn';
  return 'pass';
}

export const METRIC_DEFS: MetricDef[] = [
  ...SPEC_TIERS.map(
    (s): MetricDef => ({
      id: `h1.gap.${s}`,
      group: 'h1',
      label: `${SPEC_NAME[s]} 판별 보상 격차`,
      desc: '같은 실력(중간 점수)의 계정이 어느 판에 가느냐에 따라 달라지는 보상 점수 차이',
      unit: 'point',
      digits: 1,
      judge: (get, c) => judgeGap(get(`h1.gap.${s}`), get(`h1.steps.${s}`), get('participationValue'), c),
    }),
  ),
  ...SPEC_TIERS.map(
    (s): MetricDef => ({
      id: `h1.steps.${s}`,
      group: 'h1',
      label: `${SPEC_NAME[s]} 판별 구간 변화`,
      desc: '판에 따라 보상 구간(이름표 등급)이 몇 칸 바뀌는지',
      unit: 'num',
      digits: 1,
    }),
  ),
  ...(['high', 'mid'] as SpecTier[]).map(
    (s): MetricDef => ({
      id: `h1.opt.${s}`,
      group: 'h1',
      label: `${SPEC_NAME[s]} 최적화형 이득`,
      desc: '한산해 보이는 판을 골라 간 봇이 같은 스펙의 다른 봇보다 더 받은 평균 보상 점수',
      unit: 'point',
      digits: 1,
    }),
  ),
  { id: 'h2.spearman', group: 'h2', label: '팬 수·득표 순서 일치도', desc: '팬이 많은 순서와 예선 득표 순서가 얼마나 같은지 (1이면 완전히 같음)', unit: 'ratio', digits: 3, judge: (get, c) => judgeHigh(get('h2.spearman'), c.h2.spearman) },
  {
    id: 'h2.match',
    group: 'h2',
    label: '진출자 일치',
    desc: '팬 수 상위 사도와 실제 진출 사도가 몇 명 겹치는지',
    unit: 'num',
    digits: 1,
    judge: (get, c) => {
      const scale = get('finalists') / 10;
      return judgeHigh(get('h2.match'), { pass: c.h2.finalistMatch.pass * scale, warn: c.h2.finalistMatch.warn * scale });
    },
  },
  { id: 'h2.inverted', group: 'h2', label: '순위 뒤집힘 비율', desc: '팬은 적은데 표는 더 받은 사도 짝의 비율', unit: 'pct', digits: 1 },
  { id: 'h2.fervorWin', group: 'h2', label: '뒤집힘 중 열성 우위', desc: '뒤집힌 짝 중 표를 더 받은 쪽의 열성도가 더 높은 비율', unit: 'pct', digits: 1 },
  { id: 'h3.favElim', group: 'h3', label: '최애 탈락 비율', desc: '최애가 본선에 못 간 봇의 비율', unit: 'pct', digits: 1 },
  { id: 'h3.dropout', group: 'h3', label: '본선 이탈률', desc: '예선에 참여했지만 본선에 한 번도 안 온 봇의 비율', unit: 'pct', digits: 1, judge: (get, c) => judgeLow(get('h3.dropout'), c.h3.dropout) },
  { id: 'h3.smallBoards', group: 'h3', label: '작은 판 개수', desc: '참여자가 기준 인원 미만인 본선 랭킹판 개수', unit: 'num', digits: 1, judge: (get, c) => judgeLow(get('h3.smallBoards'), c.h3.smallBoards) },
  { id: 'h3.boardMin', group: 'h3', label: '가장 작은 판 인원', desc: '본선 랭킹판 중 가장 작은 판의 참여자 수', unit: 'num', digits: 0 },
  { id: 'h3.boardMax', group: 'h3', label: '가장 큰 판 인원', desc: '본선 랭킹판 중 가장 큰 판의 참여자 수', unit: 'num', digits: 0 },
  { id: 'aux.prelimGini', group: 'aux', label: '예선 득표 쏠림 (지니)', desc: '0이면 모든 사도가 고르게, 1에 가까우면 한 사도에 몰림', unit: 'ratio', digits: 3 },
  { id: 'aux.lateRatio', group: 'aux', label: '중도 진입 표 비율', desc: '예선 중에 들어온 봇이 처음부터 참여한 봇 대비 얻은 표', unit: 'pct', digits: 1 },
];

/** 판정 기준에 따라 달라지는 파생 값 (재실행 없이 계산) */
function withDerived(r: SeedResult, c: CriteriaConfig): Record<string, number> {
  return { ...r.values, 'h3.smallBoards': r.boardSizes.filter((s) => s < c.h3.smallBoardSize).length };
}

export interface MetricSummary {
  mean: number;
  sd: number;
  min: number;
  max: number;
  /** 평균값에 기준을 적용한 판정 (판정 없는 지표는 null) */
  meanVerdict: Verdict | null;
  counts: { pass: number; warn: number; fail: number } | null;
}

export interface HypothesisSummary {
  meanVerdict: Verdict;
  counts: { pass: number; warn: number; fail: number };
}

export interface ScenarioSummary {
  runs: number;
  metrics: Record<string, MetricSummary>;
  hypotheses: Record<'h1' | 'h2' | 'h3', HypothesisSummary>;
}

/** 표본 표준편차 */
export function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

const emptyCounts = () => ({ pass: 0, warn: 0, fail: 0 });
const tally = (counts: { pass: number; warn: number; fail: number }, v: Verdict) => {
  if (v === 'pass' || v === 'warn' || v === 'fail') counts[v]++;
};

export function summarize(results: SeedResult[], c: CriteriaConfig): ScenarioSummary {
  const rows = results.map((r) => withDerived(r, c));
  const meanValues: Record<string, number> = {};
  const keys = new Set(rows.flatMap((r) => Object.keys(r)));
  for (const k of keys) meanValues[k] = mean(rows.map((r) => r[k] ?? 0));
  const getMean: Get = (id) => meanValues[id] ?? 0;

  const metrics: Record<string, MetricSummary> = {};
  for (const m of METRIC_DEFS) {
    const xs = rows.map((r) => r[m.id] ?? 0);
    let counts: MetricSummary['counts'] = null;
    if (m.judge) {
      counts = emptyCounts();
      for (const r of rows) tally(counts, m.judge((id) => r[id] ?? 0, c));
    }
    metrics[m.id] = {
      mean: mean(xs),
      sd: sd(xs),
      min: Math.min(...xs),
      max: Math.max(...xs),
      meanVerdict: m.judge ? m.judge(getMean, c) : null,
      counts,
    };
  }

  const hyp = (g: 'h1' | 'h2' | 'h3'): HypothesisSummary => {
    const judged = METRIC_DEFS.filter((m) => m.group === g && m.judge);
    const counts = emptyCounts();
    for (const r of rows) tally(counts, worst(...judged.map((m) => m.judge!((id) => r[id] ?? 0, c))));
    return { meanVerdict: worst(...judged.map((m) => metrics[m.id].meanVerdict!)), counts };
  };
  return { runs: results.length, metrics, hypotheses: { h1: hyp('h1'), h2: hyp('h2'), h3: hyp('h3') } };
}

/** 결과 재사용 키: 판정 기준은 포함하지 않는다(값에서 다시 판정하므로) */
export function scenarioKey(s: Scenario, run: CompareRunConfig): string {
  return JSON.stringify({ p: s.preset, a: serializePopulation(s.population), b: run.botCount, s: run.seed, n: run.repeats });
}

// ───────── 설정 내보내기/불러오기 (JSON) ─────────

export interface CompareSettings {
  version: 1;
  run: CompareRunConfig;
  criteria: CriteriaConfig;
  scenarios: Scenario[];
}

export function defaultScenarios(population: PopulationConfig): Scenario[] {
  return DEFAULT_SCENARIO_PRESETS.map((p, i) => ({ id: `s${i + 1}`, name: SCENARIO_PRESETS[p].label, preset: p, population: structuredClone(population) }));
}

export function exportSettings(s: CompareSettings): string {
  return JSON.stringify(
    {
      version: 1,
      run: s.run,
      criteria: Object.fromEntries(CRITERIA_FIELDS.map((f) => [f.id, f.get(s.criteria)])),
      scenarios: s.scenarios.map((x) => ({ name: x.name, preset: x.preset, assumptions: serializePopulation(x.population) })),
    },
    null,
    2,
  );
}

const clampNum = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/** 불러오기: 형식이 맞지 않는 칸은 기본값으로 둔다 */
export function importSettings(text: string): CompareSettings {
  const raw = JSON.parse(text) as Record<string, unknown>;
  const runRaw = (raw.run ?? {}) as Record<string, unknown>;
  const run: CompareRunConfig = {
    seed: clampNum(runRaw.seed, 0, 2 ** 31, DEFAULT_COMPARE_RUN.seed),
    botCount: Math.round(clampNum(runRaw.botCount, COMPARE_LIMITS.botMin, COMPARE_LIMITS.botMax, DEFAULT_COMPARE_RUN.botCount)),
    repeats: Math.round(clampNum(runRaw.repeats, COMPARE_LIMITS.repeatMin, COMPARE_LIMITS.repeatMax, DEFAULT_COMPARE_RUN.repeats)),
  };
  const criteria = structuredClone(DEFAULT_CRITERIA);
  const critRaw = (raw.criteria ?? {}) as Record<string, unknown>;
  for (const f of CRITERIA_FIELDS) {
    const v = critRaw[f.id];
    if (typeof v === 'number' && Number.isFinite(v)) f.set(criteria, Math.min(f.max, Math.max(f.min, v)));
  }
  const list = Array.isArray(raw.scenarios) ? raw.scenarios : [];
  const scenarios: Scenario[] = list.slice(0, MAX_SCENARIOS).map((x, i) => {
    const o = (x ?? {}) as Record<string, unknown>;
    const preset = SCENARIO_PRESET_IDS.includes(o.preset as ScenarioPresetId) ? (o.preset as ScenarioPresetId) : 'original';
    return {
      id: `s${i + 1}`,
      name: typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 40) : SCENARIO_PRESETS[preset].label,
      preset,
      population: restorePopulation(o.assumptions),
    };
  });
  return { version: 1, run, criteria, scenarios: scenarios.length ? scenarios : defaultScenarios(restorePopulation(null)) };
}
