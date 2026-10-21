import { create } from 'zustand';
import { applyField, fieldById } from '../config/assumptionFields';
import { DEFAULT_POPULATION } from '../config/archetypes';
import { DEFAULT_CRITERIA, type CriteriaConfig } from '../config/criteria';
import { CRITERIA_FIELDS, DEFAULT_COMPARE_RUN, MAX_SCENARIOS, SCENARIO_PRESETS, type CompareRunConfig, type ScenarioPresetId } from '../config/scenarios';
import type { ScenarioJob, ScenarioJobResult } from '../sim/scenario.worker';
import {
  defaultScenarios,
  exportSettings,
  importSettings,
  scenarioConfig,
  scenarioKey,
  seedList,
  type Scenario,
  type SeedResult,
} from '../sim/scenarios';
import { useReportStore } from './reportStore';

// 비교 설정은 이 브라우저에만 저장한다 (SPEC §0: localStorage는 설정값만)
const STORAGE_KEY = 'sado-vote.compare';

interface CompareState {
  run: CompareRunConfig;
  criteria: CriteriaConfig;
  scenarios: Scenario[];
  /** 결과 재사용: scenarioKey → 시드별 결과 */
  cache: Record<string, SeedResult[]>;
  status: 'idle' | 'running' | 'done' | 'error';
  progress: { done: number; total: number };
  error: string | null;
  ms: number;
  setRun: (patch: Partial<CompareRunConfig>) => void;
  setCriterion: (id: string, v: number) => void;
  resetCriteria: () => void;
  addScenario: (preset: ScenarioPresetId) => void;
  removeScenario: (id: string) => void;
  updateScenario: (id: string, patch: Partial<Pick<Scenario, 'name' | 'preset'>>) => void;
  setScenarioAssumption: (id: string, field: string, v: number | string | null) => void;
  resetScenarioAssumptions: (id: string, fields?: string[]) => void;
  copyReportAssumptions: (id: string) => void;
  run_: () => void;
  exportJson: () => string;
  importJson: (text: string) => void;
}

function load(): Pick<CompareState, 'run' | 'criteria' | 'scenarios'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = importSettings(raw);
      return { run: s.run, criteria: s.criteria, scenarios: s.scenarios };
    }
  } catch {
    // 저장값이 깨졌으면 기본값으로
  }
  return { run: { ...DEFAULT_COMPARE_RUN }, criteria: structuredClone(DEFAULT_CRITERIA), scenarios: defaultScenarios(DEFAULT_POPULATION) };
}

function save(s: Pick<CompareState, 'run' | 'criteria' | 'scenarios'>) {
  try {
    localStorage.setItem(STORAGE_KEY, exportSettings({ version: 1, ...s }));
  } catch {
    // 저장이 막힌 환경이면 새로고침 시 기본값으로 돌아간다
  }
}

// ───────── Worker 풀 ─────────

let pool: Worker[] = [];
let runToken = 0;

function poolSize(): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  return Math.max(1, Math.min(6, cores - 1));
}

function ensurePool(): Worker[] {
  if (pool.length === 0) {
    pool = Array.from({ length: poolSize() }, () => new Worker(new URL('../sim/scenario.worker.ts', import.meta.url), { type: 'module' }));
  }
  return pool;
}

let nextScenarioId = 100;

export const useCompareStore = create<CompareState>((set, get) => {
  const persist = () => save(get());
  return {
    ...load(),
    cache: {},
    status: 'idle',
    progress: { done: 0, total: 0 },
    error: null,
    ms: 0,

    setRun: (patch) => {
      set((s) => ({ run: { ...s.run, ...patch } }));
      persist();
    },
    setCriterion: (id, v) => {
      const f = CRITERIA_FIELDS.find((x) => x.id === id);
      if (!f) return;
      const criteria = structuredClone(get().criteria);
      f.set(criteria, Math.min(f.max, Math.max(f.min, f.kind === 'int' ? Math.round(v) : v)));
      set({ criteria });
      persist();
    },
    resetCriteria: () => {
      set({ criteria: structuredClone(DEFAULT_CRITERIA) });
      persist();
    },
    addScenario: (preset) => {
      if (get().scenarios.length >= MAX_SCENARIOS) return;
      const s: Scenario = { id: `s${nextScenarioId++}`, name: SCENARIO_PRESETS[preset].label, preset, population: structuredClone(DEFAULT_POPULATION) };
      set((st) => ({ scenarios: [...st.scenarios, s] }));
      persist();
    },
    removeScenario: (id) => {
      set((st) => ({ scenarios: st.scenarios.filter((s) => s.id !== id) }));
      persist();
    },
    updateScenario: (id, patch) => {
      set((st) => ({
        scenarios: st.scenarios.map((s) => {
          if (s.id !== id) return s;
          const next = { ...s, ...patch };
          // 이름을 따로 바꾸지 않았다면 프리셋 이름을 따라간다
          if (patch.preset && s.name === SCENARIO_PRESETS[s.preset].label) next.name = SCENARIO_PRESETS[patch.preset].label;
          return next;
        }),
      }));
      persist();
    },
    setScenarioAssumption: (id, field, v) => {
      set((st) => ({ scenarios: st.scenarios.map((s) => (s.id === id ? { ...s, population: applyField(s.population, field, v) } : s)) }));
      persist();
    },
    resetScenarioAssumptions: (id, fields) => {
      set((st) => ({
        scenarios: st.scenarios.map((s) => {
          if (s.id !== id) return s;
          if (!fields) return { ...s, population: structuredClone(DEFAULT_POPULATION) };
          let p = s.population;
          for (const f of fields) p = applyField(p, f, fieldById(f)?.get(DEFAULT_POPULATION) ?? null);
          return { ...s, population: p };
        }),
      }));
      persist();
    },
    copyReportAssumptions: (id) => {
      const p = structuredClone(useReportStore.getState().config.population);
      set((st) => ({ scenarios: st.scenarios.map((s) => (s.id === id ? { ...s, population: p } : s)) }));
      persist();
    },

    run_: () => {
      const { scenarios, run, cache } = get();
      const token = ++runToken;
      const seeds = seedList(run);
      // 결과가 이미 있는 시나리오는 다시 계산하지 않는다
      const todo = scenarios.filter((s) => !cache[scenarioKey(s, run)]);
      const jobs: { key: string; job: ScenarioJob; index: number }[] = [];
      let jobId = 0;
      for (const s of todo) {
        const key = scenarioKey(s, run);
        if (jobs.some((j) => j.key === key)) continue;
        seeds.forEach((seed, index) => jobs.push({ key, index, job: { jobId: jobId++, config: scenarioConfig(s, run, seed) } }));
      }
      if (jobs.length === 0) {
        set({ status: 'done', progress: { done: 0, total: 0 } });
        return;
      }
      const partial: Record<string, (SeedResult | undefined)[]> = {};
      for (const j of jobs) partial[j.key] ??= Array.from({ length: seeds.length }, () => undefined);
      const t0 = performance.now();
      set({ status: 'running', error: null, progress: { done: 0, total: jobs.length } });

      const workers = ensurePool();
      let cursor = 0;
      let done = 0;
      const byId = new Map(jobs.map((j) => [j.job.jobId, j]));
      const feed = (w: Worker) => {
        if (cursor >= jobs.length) return;
        w.postMessage(jobs[cursor++].job);
      };
      for (const w of workers) {
        w.onmessage = (e: MessageEvent<ScenarioJobResult>) => {
          if (token !== runToken) return;
          const m = e.data;
          if (!m.ok) {
            set({ status: 'error', error: m.error });
            return;
          }
          const j = byId.get(m.jobId)!;
          partial[j.key][j.index] = m.result;
          done++;
          // 시나리오 하나가 다 끝나면 바로 결과에 반영
          const finished = partial[j.key].filter(Boolean).length === seeds.length ? { [j.key]: partial[j.key] as SeedResult[] } : {};
          set((st) => ({
            progress: { done, total: jobs.length },
            cache: { ...st.cache, ...finished },
            ...(done === jobs.length ? { status: 'done' as const, ms: performance.now() - t0 } : {}),
          }));
          feed(w);
        };
        w.onerror = (e) => set({ status: 'error', error: e.message });
        feed(w);
      }
    },

    exportJson: () => exportSettings({ version: 1, run: get().run, criteria: get().criteria, scenarios: get().scenarios }),
    importJson: (text) => {
      const s = importSettings(text);
      set({ run: s.run, criteria: s.criteria, scenarios: s.scenarios });
      persist();
    },
  };
});
