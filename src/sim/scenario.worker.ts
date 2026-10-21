// 시나리오 비교용 Worker: 시드 1개 실행을 받아 지표 값을 돌려준다. 여러 개를 동시에 띄워 나눠 계산한다.
import type { SimConfig } from '../config';
import { runScenarioSeed, type SeedResult } from './scenarios';

export type ScenarioJob = { jobId: number; config: SimConfig };
export type ScenarioJobResult = { jobId: number; ok: true; result: SeedResult } | { jobId: number; ok: false; error: string };

self.onmessage = (e: MessageEvent<ScenarioJob>) => {
  const post = (m: ScenarioJobResult) => (self as unknown as Worker).postMessage(m);
  try {
    post({ jobId: e.data.jobId, ok: true, result: runScenarioSeed(e.data.config) });
  } catch (err) {
    post({ jobId: e.data.jobId, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
