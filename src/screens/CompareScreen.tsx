import { useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { diffFromDefault } from '../config/assumptionFields';
import { H1_TEXT, H2_TEXT, H3_TEXT, VERDICT_TEXT } from '../config/reportText';
import {
  COMPARE_INTRO,
  COMPARE_LIMITS,
  CRITERIA_FIELDS,
  MAX_SCENARIOS,
  SCENARIO_PRESETS,
  SCENARIO_PRESET_IDS,
  type CriteriaField,
  type ScenarioPresetId,
} from '../config/scenarios';
import { HelpButton } from '../components/Help';
import { VerdictBadge } from '../components/Metric';
import { Modal } from '../components/Modal';
import { StageIntro } from '../components/StageIntro';
import { METRIC_DEFS, scenarioKey, summarize, type MetricDef, type Scenario, type ScenarioSummary } from '../sim/scenarios';
import { useCompareStore } from '../store/compareStore';
import { AssumptionEditor } from './report/AssumptionPanel';
import { num } from './report/format';

const LETTERS = ['A', 'B', 'C', 'D'];
const COLORS = ['#86a83a', '#5b8bd6', '#e8a317', '#8e7cc3'];

function fmt(m: MetricDef, v: number): string {
  if (m.unit === 'pct') return `${(v * 100).toFixed(m.digits)}%`;
  if (m.unit === 'point') return `${v.toFixed(m.digits)}점`;
  if (m.unit === 'num') return num(v, m.digits);
  return v.toFixed(m.digits);
}

function Counts({ c }: { c: { pass: number; warn: number; fail: number } }) {
  return (
    <div className="counts">
      <span className="c-pass">통과 {c.pass}</span> · <span className="c-warn">주의 {c.warn}</span> · <span className="c-fail">실패 {c.fail}</span>
    </div>
  );
}

const INTRO = (
  <>
    {COMPARE_INTRO.map((p) => (
      <p key={p}>{p}</p>
    ))}
  </>
);

/** 판정 기준 입력칸 (화면 입력은 %로) */
function CriteriaInput({ f }: { f: CriteriaField }) {
  const value = useCompareStore((s) => f.get(s.criteria));
  const setCriterion = useCompareStore((s) => s.setCriterion);
  const pct = f.kind === 'percent';
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(pct ? Math.round(value * 1000) / 10 : value);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (draft.trim() !== '' && Number.isFinite(v)) setCriterion(f.id, pct ? v / 100 : v);
    setDraft(null);
  };
  return (
    <span className="num-input">
      <input type="number" value={shown} step={pct ? f.step * 100 : f.step} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} aria-label={f.label} />
      {pct && '%'}
    </span>
  );
}

function ScenarioCard({ s, index, summary, running }: { s: Scenario; index: number; summary?: ScenarioSummary; running: boolean }) {
  const { updateScenario, removeScenario, setScenarioAssumption, resetScenarioAssumptions, copyReportAssumptions, scenarios } = useCompareStore();
  const [editing, setEditing] = useState(false);
  const p = SCENARIO_PRESETS[s.preset];
  const changes = diffFromDefault(s.population);
  return (
    <div className="scn-card" style={{ borderTopColor: COLORS[index] }}>
      <div className="scn-head">
        <span className="scn-letter" style={{ background: COLORS[index] }}>
          {LETTERS[index]}
        </span>
        <input className="scn-name" value={s.name} maxLength={40} onChange={(e) => updateScenario(s.id, { name: e.target.value })} aria-label="시나리오 이름" />
        {scenarios.length > 1 && (
          <button className="reset-btn" title="이 시나리오 삭제" onClick={() => removeScenario(s.id)}>
            ✕
          </button>
        )}
      </div>
      <label className="small muted">규칙 (기본 시나리오에서 선택)</label>
      <select value={s.preset} onChange={(e) => updateScenario(s.id, { preset: e.target.value as ScenarioPresetId })}>
        {SCENARIO_PRESET_IDS.map((id) => (
          <option key={id} value={id}>
            {SCENARIO_PRESETS[id].label}
          </option>
        ))}
      </select>
      <p className="small">
        <b>바뀌는 점:</b> {p.change}
      </p>
      <p className="small muted">
        <b>확인하는 것:</b> {p.checks}
      </p>
      <div className="scn-assume">
        <span className="small">
          봇 가정값: {changes.length === 0 ? '모두 기본값' : <b>기본값과 다른 칸 {changes.length}개</b>}
        </span>
        <div className="row">
          <button className="btn ghost small-btn" onClick={() => setEditing(true)}>
            가정값 편집
          </button>
          <button className="btn ghost small-btn" title="검증 리포트에서 바꿔 둔 가정값을 이 시나리오로 복사" onClick={() => copyReportAssumptions(s.id)}>
            리포트 가정값 가져오기
          </button>
        </div>
        {changes.length > 0 && (
          <ul className="small scn-changes">
            {changes.slice(0, 4).map((c) => (
              <li key={c.field.id}>
                {c.field.label}: {c.from} → <b>{c.to}</b>
              </li>
            ))}
            {changes.length > 4 && <li>…외 {changes.length - 4}개</li>}
          </ul>
        )}
      </div>
      <div className="small scn-status">{summary ? `결과 있음 (${summary.runs}번 반복)` : running ? '계산 중…' : '아직 실행 전'}</div>
      {editing && (
        <Modal title={`시나리오 ${LETTERS[index]} · ${s.name} · 봇 가정값`} onClose={() => setEditing(false)} wide>
          <AssumptionEditor
            binding={{
              population: s.population,
              set: (id, v) => setScenarioAssumption(s.id, id, v),
              reset: (ids) => resetScenarioAssumptions(s.id, ids),
            }}
            header={<HelpButton k="assumption" label="가정값이란?" />}
            intro={<p className="muted small">이 시나리오의 봇만 이 값으로 움직입니다. 바꾼 뒤 비교 화면의 실행을 누르면 반영됩니다.</p>}
          />
        </Modal>
      )}
    </div>
  );
}

const CHART_METRICS = ['h1.gap.high', 'h1.opt.high', 'h2.spearman', 'h3.dropout', 'h3.favElim', 'h3.boardMin'];

/** 기획자 패널 · 시나리오 비교 (SPEC §10, 부록 B31) */
export function CompareScreen({ onBack }: { onBack: () => void }) {
  const st = useCompareStore();
  const { run, scenarios, cache, criteria, status, progress } = st;
  const [addPreset, setAddPreset] = useState<ScenarioPresetId>('fixedPrelim');
  const fileRef = useRef<HTMLInputElement>(null);
  const summaries = scenarios.map((s) => {
    const r = cache[scenarioKey(s, run)];
    return r ? summarize(r, criteria) : undefined;
  });
  const any = summaries.some(Boolean);
  const running = status === 'running';

  const download = () => {
    const blob = new Blob([st.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sado-vote-scenarios.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      st.importJson(await file.text());
    } catch {
      alert('불러올 수 없는 파일입니다. 이 화면에서 내보낸 JSON 파일을 선택하세요.');
    }
  };

  const groups: { id: 'h1' | 'h2' | 'h3' | 'aux'; title: string }[] = [
    { id: 'h1', title: H1_TEXT.title },
    { id: 'h2', title: H2_TEXT.title },
    { id: 'h3', title: H3_TEXT.title },
    { id: 'aux', title: '보조 지표' },
  ];

  return (
    <>
      <header className="topbar">
        <button className="btn top-btn" onClick={onBack}>
          ◀ 시작 화면
        </button>
        <h1>기획자 패널 · 시나리오 비교</h1>
        <span className="chip assume">가정값 기반 시뮬레이션</span>
        <span className="spacer" />
        <StageIntro stage="compare" intro={INTRO} />
      </header>
      <main className="page">
        <div className="card">
          <div className="controls">
            <label>
              봇 수
              <input type="number" min={COMPARE_LIMITS.botMin} max={COMPARE_LIMITS.botMax} step={1000} value={run.botCount} onChange={(e) => st.setRun({ botCount: Math.min(COMPARE_LIMITS.botMax, Math.max(COMPARE_LIMITS.botMin, Number(e.target.value) || COMPARE_LIMITS.botMin)) })} />
            </label>
            <label>
              첫 시드 <HelpButton k="compareSameWorlds" />
              <input type="number" value={run.seed} onChange={(e) => st.setRun({ seed: Number(e.target.value) || 0 })} />
            </label>
            <label>
              반복 횟수 ({COMPARE_LIMITS.repeatMin}~{COMPARE_LIMITS.repeatMax})
              <input type="number" min={COMPARE_LIMITS.repeatMin} max={COMPARE_LIMITS.repeatMax} value={run.repeats} onChange={(e) => st.setRun({ repeats: Math.min(COMPARE_LIMITS.repeatMax, Math.max(COMPARE_LIMITS.repeatMin, Math.round(Number(e.target.value)) || 1)) })} />
            </label>
            <button className="btn primary" disabled={running} onClick={st.run_}>
              {running ? '계산 중…' : '실행'}
            </button>
            <span className="spacer" />
            <button className="btn ghost" onClick={download}>
              설정 내보내기 (JSON)
            </button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>
              설정 불러오기
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>
            시나리오 {scenarios.length}개 × {run.repeats}번 = 최대 {scenarios.length * run.repeats}회 실행. 모든 시나리오가 시드 {run.seed}~{run.seed + run.repeats - 1}의 같은 세상에서
            돌아갑니다. 설정이 바뀌지 않은 시나리오는 이전 결과를 그대로 씁니다.
            {status === 'done' && st.ms > 0 && ` 방금 계산: ${num(st.ms / 1000, 1)}초.`}
          </p>
          {running && (
            <div className="progress">
              <div style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </div>
          )}
          {status === 'error' && <p className="error">오류: {st.error}</p>}
        </div>

        <div className="card">
          <h2>시나리오</h2>
          <div className="scn-grid">
            {scenarios.map((s, i) => (
              <ScenarioCard key={s.id} s={s} index={i} summary={summaries[i]} running={running} />
            ))}
            {scenarios.length < MAX_SCENARIOS && (
              <div className="scn-card add">
                <b>시나리오 추가</b>
                <select value={addPreset} onChange={(e) => setAddPreset(e.target.value as ScenarioPresetId)}>
                  {SCENARIO_PRESET_IDS.map((id) => (
                    <option key={id} value={id}>
                      {SCENARIO_PRESETS[id].label}
                    </option>
                  ))}
                </select>
                <p className="small muted">{SCENARIO_PRESETS[addPreset].change}</p>
                <button className="btn primary" onClick={() => st.addScenario(addPreset)}>
                  + 추가
                </button>
              </div>
            )}
          </div>
        </div>

        <details className="card criteria-card">
          <summary>
            <b>판정 기준</b> <span className="muted small">— 모든 시나리오에 똑같이 적용 · 바꿔도 다시 실행할 필요 없음 · 단일 검증 리포트에는 적용되지 않음</span>
          </summary>
          <div className="crit-grid">
            {(['h1', 'h2', 'h3'] as const).map((g) => (
              <div key={g}>
                <h4>{g === 'h1' ? 'H1 (명세서 기준)' : `${g.toUpperCase()} (제안 기준)`}</h4>
                {CRITERIA_FIELDS.filter((f) => f.group === g).map((f) => (
                  <div key={f.id} className="crit-row">
                    <div>
                      {f.label}
                      <div className="muted small">{f.desc}</div>
                    </div>
                    <CriteriaInput f={f} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button className="btn ghost" onClick={st.resetCriteria}>
            판정 기준 기본값으로
          </button>
        </details>

        <div className="card">
          <div className="hyp-head">
            <h2>비교 결과</h2>
            <HelpButton k="compareMean" label="평균 ± 흔들림 폭" />
            <HelpButton k="compareCount" label="판정 횟수" />
          </div>
          {!any ? (
            <p className="muted">아직 결과가 없습니다. 위의 실행을 누르세요.</p>
          ) : (
            <>
              <p className="muted small">
                각 칸: 위 = 평균 ± 흔들림 폭, 배지 = 평균에 판정 기준을 적용한 결과, 아래 = 반복한 횟수 중 통과·주의·실패 횟수. 지표 이름 옆 ?에 쉬운 설명이
                있습니다.
              </p>
              <div className="cmp-scroll">
                <table className="data cmp-table">
                  <thead>
                    <tr>
                      <th>지표</th>
                      {scenarios.map((s, i) => (
                        <th key={s.id} style={{ borderBottom: `3px solid ${COLORS[i]}` }}>
                          {LETTERS[i]}. {s.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <Group key={g.id} g={g} scenarios={scenarios} summaries={summaries} />
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>주요 지표 차트 (막대 = 평균, 가는 선 = 흔들림 폭)</h3>
              <div className="cmp-charts">
                {CHART_METRICS.map((id) => {
                  const m = METRIC_DEFS.find((x) => x.id === id)!;
                  const scale = m.unit === 'pct' ? 100 : 1;
                  const data = scenarios.map((_, i) => ({
                    name: LETTERS[i],
                    mean: summaries[i] ? summaries[i]!.metrics[id].mean * scale : 0,
                    err: summaries[i] ? summaries[i]!.metrics[id].sd * scale : 0,
                    has: !!summaries[i],
                  }));
                  return (
                    <div key={id} className="cmp-chart">
                      <div className="chart-title">
                        {m.label}
                        {m.unit === 'pct' ? ' (%)' : ''}
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis fontSize={11} />
                          <Tooltip formatter={(v) => Number(v).toFixed(m.digits)} />
                          <Bar dataKey="mean">
                            {data.map((d, i) => (
                              <Cell key={i} fill={d.has ? COLORS[i] : '#ddd'} />
                            ))}
                            <ErrorBar dataKey="err" width={6} stroke="#333" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Group({ g, scenarios, summaries }: { g: { id: 'h1' | 'h2' | 'h3' | 'aux'; title: string }; scenarios: Scenario[]; summaries: (ScenarioSummary | undefined)[] }) {
  const metrics = METRIC_DEFS.filter((m) => m.group === g.id);
  return (
    <>
      <tr className="grp-row">
        <td>
          <b>{g.title}</b>
        </td>
        {scenarios.map((s, i) => {
          const sm = summaries[i];
          if (g.id === 'aux') return <td key={s.id} />;
          if (!sm) return <td key={s.id} className="muted">-</td>;
          const h = sm.hypotheses[g.id];
          return (
            <td key={s.id}>
              <VerdictBadge v={h.meanVerdict} /> <span className="small">종합</span>
              <Counts c={h.counts} />
            </td>
          );
        })}
      </tr>
      {metrics.map((m) => (
        <tr key={m.id}>
          <td>
            {m.label}
            <span className="metric-desc"> — {m.desc}</span>
          </td>
          {scenarios.map((s, i) => {
            const sm = summaries[i]?.metrics[m.id];
            if (!sm) return <td key={s.id} className="muted">-</td>;
            return (
              <td key={s.id} className={sm.meanVerdict ? `v-${sm.meanVerdict}` : ''} title={`최소 ${fmt(m, sm.min)} · 최대 ${fmt(m, sm.max)}`}>
                <div>
                  {fmt(m, sm.mean)} <span className="muted">± {fmt(m, sm.sd)}</span>
                </div>
                {sm.meanVerdict && (
                  <>
                    <span className={`badge ${sm.meanVerdict}`}>{VERDICT_TEXT[sm.meanVerdict].label}</span>
                    {sm.counts && <Counts c={sm.counts} />}
                  </>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
