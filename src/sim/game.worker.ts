// 플레이 세션을 화면과 분리된 스레드에서 실행 (SPEC §7.6). 봇 하루 계산 중에도 화면이 멈추지 않는다.
import type { SimConfig } from '../config';
import { applyCommand, createGame, playerView, plannerView, type CommandResult, type GameCommand, type PlannerView, type PlayerView } from './game';
import type { PlayerSetup, Simulation } from './runner';

export type GameRequest =
  | { id: number; type: 'init'; config: SimConfig; setup: PlayerSetup }
  | { id: number; type: 'cmd'; cmd: GameCommand };

export type GameResponse =
  | { id: number; ok: true; result: CommandResult; view: PlayerView; planner: PlannerView }
  | { id: number; ok: false; error: string };

let sim: Simulation | null = null;

self.onmessage = (e: MessageEvent<GameRequest>) => {
  const req = e.data;
  const post = (m: GameResponse) => (self as unknown as Worker).postMessage(m);
  try {
    let result: CommandResult = { ok: true };
    if (req.type === 'init') sim = createGame(req.config, req.setup);
    else if (!sim) throw new Error('게임이 시작되지 않았습니다.');
    else result = applyCommand(sim, req.cmd);
    post({ id: req.id, ok: true, result, view: playerView(sim!), planner: plannerView(sim!) });
  } catch (err) {
    post({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
