import { useEffect } from 'react';
import { AUX_TEXT, H1_TEXT, H2_TEXT, H3_TEXT, REPORT_INTRO, SCENARIO_BUTTON } from '../config/reportText';
import { diffFromDefault } from '../config/assumptionFields';
import { StageIntro } from '../components/StageIntro';
import { VerdictBadge } from '../components/Metric';
import { useReportStore } from '../store/reportStore';
import { AssumptionPanel } from './report/AssumptionPanel';
import { AuxSection } from './report/AuxSection';
import { H1Section } from './report/H1Section';
import { H2Section } from './report/H2Section';
import { H3Section } from './report/H3Section';
import { RulesSummary } from './report/RulesSummary';
import { num, saintName } from './report/format';

const INTRO = (
  <>
    {REPORT_INTRO.paragraphs.map((p) => (
      <p key={p}>{p}</p>
    ))}
  </>
);

/** 검증 리포트 (SPEC §8.12, 프로토타입 전용·기획자 시점) */
export function ReportScreen() {
  const { config, ranConfig, status, progress, data, ms, error, setRun, run } = useReportStore();
  const pending = ranConfig !== null && status !== 'running' && JSON.stringify(ranConfig) !== JSON.stringify(config);
  const used = ranConfig ? diffFromDefault(ranConfig.population) : [];

  useEffect(() => {
    if (status === 'idle') run();
  }, [status, run]);

  return (
    <>
      <header className="topbar">
        <h1>검증 리포트</h1>
        <span className="chip assume">가정값 기반 시뮬레이션</span>
        <span className="spacer" />
        <StageIntro stage="report" intro={INTRO} />
        <button className="btn ghost" disabled title={SCENARIO_BUTTON.note}>
          {SCENARIO_BUTTON.label} ({SCENARIO_BUTTON.note})
        </button>
      </header>
      <main className="page">
        <div className="card">
          <div className="controls">
            <label>
              시드 (같으면 결과도 같음)
              <input type="number" value={config.run.seed} onChange={(e) => setRun({ seed: Number(e.target.value) })} />
            </label>
            <label>
              봇 수
              <input type="number" min={1000} max={50000} step={1000} value={config.run.botCount} onChange={(e) => setRun({ botCount: Number(e.target.value) })} />
            </label>
            <button className="btn primary" onClick={run} disabled={status === 'running'}>
              {status === 'running' ? '계산 중…' : '실행'}
            </button>
            {status === 'done' && data && (
              <span className="muted">
                시드 {data.seed} · 봇 {num(data.botCount)}명 · 시나리오 {2 + data.h3.sensitivity.length - 1}회 계산 {num(ms)}ms · 우승 {saintName(data.winner)}
              </span>
            )}
          </div>
          {status === 'running' && (
            <>
              <div className="progress">
                <div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
              <p className="muted">
                {progress.label} ({progress.done}/{progress.total})
              </p>
            </>
          )}
          {status === 'error' && <p className="error">오류: {error}</p>}
          {pending && (
            <div className="banner">
              바꾼 값이 아직 결과에 반영되지 않았습니다. 아래 결과는 이전 설정으로 계산한 것입니다.
              <button className="btn primary" onClick={run}>
                지금 실행
              </button>
            </div>
          )}
          {ranConfig && status === 'done' && (
            <div className="used">
              {used.length === 0 ? (
                <span className="muted">이 결과에 쓰인 가정값: 모두 기본값</span>
              ) : (
                <>
                  <b>이 결과에 쓰인 가정값 중 기본값과 다른 것 {used.length}개</b>
                  <ul>
                    {used.map((c) => (
                      <li key={c.field.id}>
                        {c.field.label}: {c.from} → <b>{c.to}</b>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
        <AssumptionPanel />

        {data && (
          <>
            <div className="card">
              <h2>한눈에 보기</h2>
              <div className="overview">
                {[
                  { id: 'h1', title: H1_TEXT.title, v: data.h1.verdict, s: H1_TEXT.summary },
                  { id: 'h2', title: H2_TEXT.title, v: data.h2.verdict, s: H2_TEXT.summary },
                  { id: 'h3', title: H3_TEXT.title, v: data.h3.verdict, s: H3_TEXT.summary },
                ].map((x) => (
                  <a key={x.id} href={`#${x.id}`}>
                    <b>
                      {x.title} <VerdictBadge v={x.v} />
                    </b>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {x.s.slice(0, 90)}…
                    </span>
                  </a>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                아래로 내려가면 {AUX_TEXT.title}와 &quot;이 리포트가 따르는 규칙&quot;이 이어집니다.
              </p>
            </div>
            <H1Section d={data} />
            <H2Section d={data} />
            <H3Section d={data} />
            <AuxSection d={data} />
          </>
        )}
        <RulesSummary config={ranConfig ?? config} />
      </main>
    </>
  );
}
