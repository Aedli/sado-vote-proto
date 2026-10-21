import { create } from 'zustand';
import { defaultSimConfig } from '../config';
import { DEFAULT_PLAYER_ACCOUNT, type Personality, type SpecTier } from '../config/rules';
import type { CommandResult, GameCommand, PlannerView, PlayerView } from '../sim/game';
import type { GameRequest, GameResponse } from '../sim/game.worker';
import { useReportStore } from './reportStore';

export type Screen =
  | 'start'
  | 'opening'
  | 'prelimSelect'
  | 'mission'
  | 'finalSelect'
  | 'invasion'
  | 'party'
  | 'battle'
  | 'results'
  | 'devnote'
  | 'report'
  | 'compare';

export interface Setup {
  seed: number;
  botCount: number;
  spec: SpecTier;
  trained: Personality[];
}

export interface BattleResult {
  score: number;
  votes: number;
  totalAfter: number;
}

interface GameState {
  screen: Screen;
  setup: Setup;
  view: PlayerView | null;
  planner: PlannerView | null;
  plannerOn: boolean;
  busy: string | null;
  toast: { text: string; kind: 'info' | 'error' } | null;
  /** 이번 게임에서 이미 본 연출·팝업 */
  seen: { opening: boolean; announce: boolean; invasion: boolean; results: boolean; announceDir: boolean; resultsDir: boolean };
  battle: BattleResult | null;
  setSetup: (patch: Partial<Setup>) => void;
  start: () => Promise<void>;
  quickRun: () => void;
  go: (screen: Screen) => void;
  goHome: () => void;
  markSeen: (k: keyof GameState['seen']) => void;
  send: (cmd: GameCommand, busyLabel?: string) => Promise<CommandResult>;
  nextDay: () => Promise<void>;
  togglePlanner: () => void;
  showToast: (text: string, kind?: 'info' | 'error') => void;
}

// ───────── Web Worker 연결 ─────────

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (r: GameResponse) => void>();

/** id를 뺀 요청 (유니온 각각에 적용) */
type RequestBody = GameRequest extends infer R ? (R extends unknown ? Omit<R, 'id'> : never) : never;

function request(body: RequestBody): Promise<GameResponse> {
  if (!worker) {
    worker = new Worker(new URL('../sim/game.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<GameResponse>) => {
      pending.get(e.data.id)?.(e.data);
      pending.delete(e.data.id);
    };
  }
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker!.postMessage({ ...body, id } as GameRequest);
  });
}

/** 지금 일차·진행 상태에 맞는 기본 화면 */
export function homeScreen(v: PlayerView): Screen {
  if (v.clock.phase === 'ended') return 'results';
  if (v.clock.phase === 'prelim') return v.prelim.daySaint === -1 ? 'prelimSelect' : 'mission';
  return v.final.saint === -1 ? 'finalSelect' : 'party';
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'start',
  setup: { seed: defaultSimConfig().run.seed, botCount: defaultSimConfig().run.botCount, spec: DEFAULT_PLAYER_ACCOUNT.spec, trained: [...DEFAULT_PLAYER_ACCOUNT.trained] },
  view: null,
  planner: null,
  plannerOn: false,
  busy: null,
  toast: null,
  seen: { opening: false, announce: false, invasion: false, results: false, announceDir: false, resultsDir: false },
  battle: null,

  setSetup: (patch) => set((s) => ({ setup: { ...s.setup, ...patch } })),

  start: async () => {
    const { setup } = get();
    const config = defaultSimConfig();
    config.run = { seed: setup.seed, botCount: setup.botCount };
    // 검증 리포트에서 바꾼 가정값을 플레이에도 그대로 쓴다
    config.population = structuredClone(useReportStore.getState().config.population);
    set({ busy: `봇 ${setup.botCount.toLocaleString('ko-KR')}명을 준비하는 중…`, seen: { opening: false, announce: false, invasion: false, results: false, announceDir: false, resultsDir: false }, battle: null });
    const r = await request({ type: 'init', config, setup: { spec: setup.spec, trained: setup.trained } });
    if (!r.ok) {
      set({ busy: null });
      get().showToast(r.error, 'error');
      return;
    }
    set({ busy: null, view: r.view, planner: r.planner, screen: 'opening' });
  },

  quickRun: () => {
    const { setup } = get();
    const report = useReportStore.getState();
    report.setRun({ seed: setup.seed, botCount: setup.botCount });
    report.run();
    set({ screen: 'report' });
  },

  go: (screen) => set({ screen }),
  goHome: () => {
    const v = get().view;
    if (v) set({ screen: homeScreen(v) });
  },
  markSeen: (k) => set((s) => ({ seen: { ...s.seen, [k]: true } })),

  send: async (cmd, busyLabel) => {
    if (busyLabel) set({ busy: busyLabel });
    const r = await request({ type: 'cmd', cmd });
    set({ busy: null });
    if (!r.ok) {
      get().showToast(r.error, 'error');
      return { ok: false, code: 'WORKER', message: r.error };
    }
    set({ view: r.view, planner: r.planner });
    if (!r.result.ok) get().showToast(r.result.message, 'error');
    return r.result;
  },

  nextDay: async () => {
    const bots = get().setup.botCount.toLocaleString('ko-KR');
    const r = await get().send({ type: 'nextDay' }, `봇 ${bots}명의 하루를 계산하는 중…`);
    if (r.ok) get().goHome();
  },

  togglePlanner: () => set((s) => ({ plannerOn: !s.plannerOn })),

  showToast: (text, kind = 'info') => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { text, kind } });
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },
}));
