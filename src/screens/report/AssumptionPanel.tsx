import { useEffect, useState } from 'react';
import { ARCHETYPE_IDS, DEFAULT_POPULATION } from '../../config/archetypes';
import {
  ARCHETYPE_COLUMNS,
  ASSUMPTION_FIELDS,
  ASSUMPTION_GROUPS,
  diffFromDefault,
  formatFieldValue,
  type AssumptionField,
} from '../../config/assumptionFields';
import { archetypeLabel } from '../../config/reportText';
import { HelpButton } from '../../components/Help';
import { useReportStore } from '../../store/reportStore';

const isPercent = (f: AssumptionField) => f.kind === 'percent';
const toView = (f: AssumptionField, v: number) => (isPercent(f) ? Math.round(v * 1000) / 10 : v);
const fromView = (f: AssumptionField, v: number) => (isPercent(f) ? v / 100 : v);

/** 숫자 입력칸: 입력 중에는 자유롭게, 칸을 벗어나거나 Enter를 누르면 범위 안으로 맞춰 저장 */
function NumberInput({ f, compact }: { f: AssumptionField; compact?: boolean }) {
  const population = useReportStore((s) => s.config.population);
  const setAssumption = useReportStore((s) => s.setAssumption);
  const value = f.get(population);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    setDraft(value === null ? '' : String(toView(f, Number(value))));
  }, [value, f]);
  const commit = () => {
    const v = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(v)) {
      setDraft(value === null ? '' : String(toView(f, Number(value))));
      return;
    }
    setAssumption(f.id, fromView(f, v));
  };
  const scale = isPercent(f) ? 100 : 1;
  return (
    <span className="num-input">
      <input
        type="number"
        value={draft}
        disabled={value === null}
        min={f.min !== undefined ? f.min * scale : undefined}
        max={f.max !== undefined ? f.max * scale : undefined}
        step={f.step !== undefined ? f.step * scale : undefined}
        style={compact ? { width: 64 } : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        aria-label={f.label}
      />
      {isPercent(f) && '%'}
    </span>
  );
}

function ResetButton({ f }: { f: AssumptionField }) {
  const population = useReportStore((s) => s.config.population);
  const reset = useReportStore((s) => s.resetAssumptions);
  const changed = formatFieldValue(f, f.get(population)) !== formatFieldValue(f, f.get(DEFAULT_POPULATION));
  if (!changed) return null;
  return (
    <button className="reset-btn" title={`기본값(${formatFieldValue(f, f.get(DEFAULT_POPULATION))})으로 되돌리기`} onClick={() => reset([f.id])}>
      ↺
    </button>
  );
}

function FieldRow({ f }: { f: AssumptionField }) {
  const population = useReportStore((s) => s.config.population);
  const setAssumption = useReportStore((s) => s.setAssumption);
  const value = f.get(population);
  const def = f.get(DEFAULT_POPULATION);
  const changed = formatFieldValue(f, value) !== formatFieldValue(f, def);
  return (
    <div className={`field-row${changed ? ' changed' : ''}`}>
      <div className="field-label">
        {f.label} {f.help && <HelpButton k={f.help} />}
        <div className="muted field-desc">{f.desc}</div>
      </div>
      <div className="field-input">
        {f.kind === 'select' ? (
          <select value={String(value)} onChange={(e) => setAssumption(f.id, e.target.value)} aria-label={f.label}>
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            {f.nullable && (
              <label className="nullable">
                <input
                  type="checkbox"
                  checked={value === null}
                  onChange={(e) => setAssumption(f.id, e.target.checked ? null : (f.nullable?.fallback ?? null))}
                />
                {f.nullable.label}
              </label>
            )}
            <NumberInput f={f} />
          </>
        )}
        <ResetButton f={f} />
      </div>
      <div className="muted field-default">기본값 {formatFieldValue(f, def)}</div>
    </div>
  );
}

function ArchetypeTable() {
  const population = useReportStore((s) => s.config.population);
  const fields = ASSUMPTION_FIELDS.filter((f) => f.group === 'archetype');
  const ratioSum = ARCHETYPE_IDS.reduce((a, id) => a + population.archetypes[id].ratio, 0);
  return (
    <>
      <table className="data assume-table">
        <thead>
          <tr>
            <th>유형</th>
            {ARCHETYPE_COLUMNS.map((c) => (
              <th key={c.id}>
                {c.label} <HelpButton k={c.help} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ARCHETYPE_IDS.map((id) => (
            <tr key={id}>
              <td>{archetypeLabel(id)}</td>
              {ARCHETYPE_COLUMNS.map((c) => {
                const f = fields.find((x) => x.archetype === id && x.column === c.id);
                if (!f) return <td key={c.id} className="muted">—</td>;
                const changed = formatFieldValue(f, f.get(population)) !== formatFieldValue(f, f.get(DEFAULT_POPULATION));
                return (
                  <td key={c.id} className={changed ? 'changed' : ''} title={`기본값 ${formatFieldValue(f, f.get(DEFAULT_POPULATION))}`}>
                    <NumberInput f={f} compact />
                    <ResetButton f={f} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: 13 }}>
        비율 합계 {Math.round(ratioSum * 1000) / 10}%{Math.abs(ratioSum - 1) > 1e-6 ? ' → 100%가 아니므로 입력한 비율대로 자동으로 맞춰 계산합니다.' : ''} &quot;—&quot;는
        그 유형에 해당하지 않는 칸입니다(보상 최적화형·루틴 무관심형은 최애 탈락에 영향을 받지 않음). 중도 진입형의 접속률은 진입 다음 날부터 적용됩니다.
        칸 위에 마우스를 올리면 기본값이 보이고, 노란 칸은 기본값에서 바꾼 칸입니다.
      </p>
    </>
  );
}

/** 기획자가 가정값을 바꿔 보는 패널 (부록 B22) */
export function AssumptionPanel() {
  const population = useReportStore((s) => s.config.population);
  const resetAll = useReportStore((s) => s.resetAssumptions);
  const changes = diffFromDefault(population);
  return (
    <div className="card" id="assumptions">
      <div className="hyp-head">
        <h2>가정값 바꿔 보기</h2>
        <span className="chip assume">가정값</span>
        <HelpButton k="assumption" />
        <span style={{ flex: 1 }} />
        <span className="muted">기본값에서 바꾼 칸 {changes.length}개</span>
        <button className="btn ghost" onClick={() => resetAll()} disabled={changes.length === 0}>
          모두 기본값으로
        </button>
      </div>
      <p className="muted">
        봇이 어떻게 행동할지에 대한 짐작(가정값)을 직접 바꿔 볼 수 있습니다. 값을 바꾼 뒤 위의 <b>실행</b>을 눌러야 결과에 반영됩니다. 바꾼 값은 이
        브라우저에만 저장되어, 다시 열어도 유지되고 다른 사람에게는 영향을 주지 않습니다. 진출 인원·보상표 같은 규칙과 판정 기준은 기획자 패널(M5)에서
        바꿀 수 있게 할 예정입니다.
      </p>
      {ASSUMPTION_GROUPS.map((g) => (
        <details key={g.id} className="assume-group" open={g.id === 'archetype' || g.id === 'optimizer' || g.id === 'fervor'}>
          <summary>
            {g.title}
            {changes.some((c) => c.field.group === g.id) && <span className="chip assume" style={{ marginLeft: 8 }}>바뀜</span>}
          </summary>
          <p className="muted" style={{ margin: '4px 0 8px' }}>
            {g.desc}
          </p>
          {g.id === 'archetype' ? (
            <ArchetypeTable />
          ) : (
            <div className="field-list">
              {ASSUMPTION_FIELDS.filter((f) => f.group === g.id).map((f) => (
                <FieldRow key={f.id} f={f} />
              ))}
            </div>
          )}
        </details>
      ))}
    </div>
  );
}
