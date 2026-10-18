import type { ReactNode } from 'react';
import { VERDICT_TEXT, type MetricText } from '../config/reportText';
import type { Verdict } from '../sim/metrics';

export function VerdictBadge({ v, big }: { v: Verdict; big?: boolean }) {
  return (
    <span className={`badge ${v}${big ? ' big' : ''}`} title={VERDICT_TEXT[v].desc}>
      {VERDICT_TEXT[v].label}
    </span>
  );
}

export function Intent({ quote, source }: { quote: string; source: string }) {
  return (
    <div className="intent">
      기획 의도: <q>{quote}</q>
      <small>출처: {source}</small>
    </div>
  );
}

/** 지표 1개: 질문 → 의도 → 이번 결과 읽기 → 자료 → 판정 기준 → 계산 방법 → 주의할 점 */
export function Metric({
  id,
  text,
  verdict,
  reading,
  extraHead,
  children,
}: {
  id?: string;
  text: MetricText;
  verdict?: Verdict;
  reading: ReactNode;
  extraHead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="metric" id={id}>
      <div className="metric-head">
        <h3>{text.title}</h3>
        {verdict && <VerdictBadge v={verdict} />}
        {extraHead}
      </div>
      <p className="question">무엇을 묻나: {text.question}</p>
      <Intent {...text.intent} />
      <div className="box reading">
        <h4>이번 결과 읽기</h4>
        {reading}
      </div>
      {children}
      <div className="box criteria">
        <h4>
          판정 기준{text.criteriaSource && <span className="source">({text.criteriaSource})</span>}
        </h4>
        <ul>
          {text.criteria.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <details className="box how" open>
        <summary>계산 방법</summary>
        <ol>
          {text.how.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
      </details>
      {text.caution && (
        <div className="box caution">
          <h4>읽을 때 주의할 점</h4>
          {text.caution}
        </div>
      )}
    </section>
  );
}
