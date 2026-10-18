import { create } from 'zustand';
import { defaultSimConfig, type SimConfig } from '../config';
import { applyField, fieldById, restorePopulation, serializePopulation } from '../config/assumptionFields';
import { DEFAULT_POPULATION } from '../config/archetypes';
import { DEFAULT_CRITERIA } from '../config/criteria';
import type { ReportData } from '../sim/metrics';
import type { ReportWorkerMessage, ReportWorkerRequest } from '../sim/report.worker';

// 바꾼 가정값은 이 브라우저에만 저장된다 (SPEC §0: localStorage는 설정값만)
const STORAGE_KEY = 'sado-vote.assumptions';

function loadPopulation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return restorePopulation(raw ? JSON.parse(raw) : null);
  } catch {
    return structuredClone(DEFAULT_POPULATION);
  }
}

function savePopulation(p: SimConfig['population']) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializePopulation(p)));
  } catch {
    // 저장이 막힌 환경이면 새로고침 시 기본값으로 돌아간다
  }
}

interface ReportState {
  /** 지금 입력칸에 있는 설정 */
  config: SimConfig;
  /** 화면에 보이는 결과를 만든 설정 */
  ranConfig: SimConfig | null;
  status: 'idle' | 'running' | 'done' | 'error';
  progress: { done: number; total: number; label: string };
  data: ReportData | null;
  ms: number;
  error: string | null;
  setRun: (patch: Partial<SimConfig['run']>) => void;
  setAssumption: (id: string, value: number | string | null) => void;
  resetAssumptions: (ids?: string[]) => void;
  run: () => void;
}

let worker: Worker | null = null;

function initialConfig(): SimConfig {
  const c = defaultSimConfig();
  c.population = loadPopulation();
  return c;
}

export const useReportStore = create<ReportState>((set, get) => ({
  config: initialConfig(),
  ranConfig: null,
  status: 'idle',
  progress: { done: 0, total: 1, label: '' },
  data: null,
  ms: 0,
  error: null,
  setRun: (patch) => set((s) => ({ config: { ...s.config, run: { ...s.config.run, ...patch } } })),
  setAssumption: (id, value) =>
    set((s) => {
      const population = applyField(s.config.population, id, value);
      savePopulation(population);
      return { config: { ...s.config, population } };
    }),
  resetAssumptions: (ids) =>
    set((s) => {
      let population = structuredClone(DEFAULT_POPULATION);
      if (ids) {
        // 지정한 칸만 기본값으로: 나머지는 현재 값을 유지
        population = s.config.population;
        for (const id of ids) population = applyField(population, id, defaultValueOf(id));
      }
      savePopulation(population);
      return { config: { ...s.config, population } };
    }),
  run: () => {
    worker?.terminate();
    worker = new Worker(new URL('../sim/report.worker.ts', import.meta.url), { type: 'module' });
    const config = structuredClone(get().config);
    set({ status: 'running', error: null, progress: { done: 0, total: 1, label: '준비 중' } });
    worker.onmessage = (e: MessageEvent<ReportWorkerMessage>) => {
      const m = e.data;
      if (m.type === 'progress') set({ progress: { done: m.done, total: m.total, label: m.label } });
      else if (m.type === 'done') set({ status: 'done', data: m.data, ms: m.ms, ranConfig: config });
      else set({ status: 'error', error: m.message });
    };
    worker.onerror = (e) => set({ status: 'error', error: e.message });
    const req: ReportWorkerRequest = { config, criteria: DEFAULT_CRITERIA };
    worker.postMessage(req);
  },
}));

function defaultValueOf(id: string): number | string | null {
  return fieldById(id)?.get(DEFAULT_POPULATION) ?? null;
}
