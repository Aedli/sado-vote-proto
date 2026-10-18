// 리포트용 실행 묶음: 기본 실행 + 예선 고정(H2 재선택 효과) + 진출 인원 민감도(H3)
import type { SimConfig } from '../config';
import type { CriteriaConfig } from '../config/criteria';
import { computeReport, type ReportData, type ReportRuns } from './metrics';
import { runFull, type Simulation } from './runner';

export type ReportProgress = (done: number, total: number, label: string) => void;

export function runReportBundle(config: SimConfig, criteria: CriteriaConfig, onProgress?: ReportProgress): ReportData {
  const baseCount = config.rules.prelim.finalistCount;
  const extraCounts = criteria.sensitivityFinalists.filter((n) => n !== baseCount);
  const total = 2 + extraCounts.length;
  let done = 0;
  const step = <T>(label: string, fn: () => T): T => {
    onProgress?.(done, total, label);
    const out = fn();
    done++;
    onProgress?.(done, total, label);
    return out;
  };

  const base = step('기본 시나리오', () => runFull(config));
  const fixed =
    config.rules.prelim.reselect === 'fixed'
      ? null
      : step('예선 사도 고정 시나리오', () => runFull({ ...structuredClone(config), rules: { ...structuredClone(config.rules), prelim: { ...config.rules.prelim, reselect: 'fixed' } } }));
  const sims = new Map<number, Simulation>([[baseCount, base]]);
  for (const n of extraCounts) {
    sims.set(
      n,
      step(`진출 ${n}명 시나리오`, () => {
        const c = structuredClone(config);
        c.rules.prelim.finalistCount = n;
        return runFull(c);
      }),
    );
  }
  const runs: ReportRuns = {
    base,
    fixed,
    sensitivity: [...sims].sort((a, b) => a[0] - b[0]).map(([finalists, sim]) => ({ finalists, sim })),
  };
  return computeReport(runs, criteria);
}
