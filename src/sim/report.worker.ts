// 리포트 계산을 화면과 분리된 스레드에서 실행 (SPEC §7.6)
import type { SimConfig } from '../config';
import type { CriteriaConfig } from '../config/criteria';
import { runReportBundle } from './report';

export type ReportWorkerRequest = { config: SimConfig; criteria: CriteriaConfig };
export type ReportWorkerMessage =
  | { type: 'progress'; done: number; total: number; label: string }
  | { type: 'done'; data: ReturnType<typeof runReportBundle>; ms: number }
  | { type: 'error'; message: string };

const post = (m: ReportWorkerMessage) => (self as unknown as Worker).postMessage(m);

self.onmessage = (e: MessageEvent<ReportWorkerRequest>) => {
  try {
    const t0 = performance.now();
    const data = runReportBundle(e.data.config, e.data.criteria, (done, total, label) => post({ type: 'progress', done, total, label }));
    post({ type: 'done', data, ms: performance.now() - t0 });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
