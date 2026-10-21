import { diffFromDefault } from '../config/assumptionFields';
import { SPEC_LABEL } from '../config/reportText';
import { DEFAULT_RULES, PERSONALITIES, SPEC_TIERS } from '../config/rules';
import { PERSONALITY_COLORS } from '../config/ui';
import { useGameStore } from '../store/gameStore';
import { useReportStore } from '../store/reportStore';

/** 시작 화면 / 내 계정 설정 (§8.1, 프로토타입 전용) */
export function StartScreen() {
  const { setup, setSetup, start, quickRun, busy, go } = useGameStore();
  const population = useReportStore((s) => s.config.population);
  const changed = diffFromDefault(population).length;
  const range = DEFAULT_RULES.damage.trainedCount[setup.spec];
  const toggle = (p: (typeof PERSONALITIES)[number]) => {
    const has = setup.trained.includes(p);
    if (has && setup.trained.length === 1) return;
    setSetup({ trained: has ? setup.trained.filter((x) => x !== p) : [...setup.trained, p] });
  };
  return (
    <div className="start">
      <div className="start-card card">
        <h1>세계수 교단 수석 사도 투표</h1>
        <p className="muted">교주가 되어 2주 이벤트를 몇 분 안에 체험합니다. 같은 규칙으로 움직이는 봇들과 함께 투표하고 경쟁합니다.</p>

        <h3>시뮬레이션 설정</h3>
        <div className="controls">
          <label>
            시드 (같으면 결과도 같음)
            <input type="number" value={setup.seed} onChange={(e) => setSetup({ seed: Number(e.target.value) })} />
          </label>
          <label>
            봇 수 (1,000~50,000)
            <input
              type="number"
              min={1000}
              max={50000}
              step={1000}
              value={setup.botCount}
              onChange={(e) => setSetup({ botCount: Math.min(50000, Math.max(1000, Number(e.target.value) || 1000)) })}
            />
          </label>
        </div>
        <p className="muted small">
          봇 행동 가정값:{' '}
          {changed === 0 ? '모두 기본값' : <b>검증 리포트에서 바꾼 가정값 {changed}개가 적용됩니다</b>}
        </p>

        <h3>내 계정 설정</h3>
        <div className="controls">
          <label>
            스펙 등급
            <select value={setup.spec} onChange={(e) => setSetup({ spec: e.target.value as typeof setup.spec })}>
              {SPEC_TIERS.map((s) => (
                <option key={s} value={s}>
                  {SPEC_LABEL[s]} (기본 전투력 {DEFAULT_RULES.damage.basePower[s].toLocaleString('ko-KR')})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="trained">
          <span className="muted small">육성한 성격 (1~{PERSONALITIES.length}개, 보스 성격과 맞으면 딜이 강해짐)</span>
          <div className="trained-row">
            {PERSONALITIES.map((p) => (
              <label key={p} className={`trained-chip${setup.trained.includes(p) ? ' on' : ''}`} style={{ borderColor: PERSONALITY_COLORS[p] }}>
                <input type="checkbox" checked={setup.trained.includes(p)} onChange={() => toggle(p)} />
                <span className="dot" style={{ background: PERSONALITY_COLORS[p] }} />
                {DEFAULT_RULES.personalityNames[p]}
              </label>
            ))}
          </div>
          <span className="muted small">
            참고: 봇은 {SPEC_LABEL[setup.spec]}일 때 보통 {range[0]}~{range[1]}개를 육성합니다.
          </span>
        </div>

        <div className="start-actions">
          <button className="btn primary big" onClick={start} disabled={busy !== null}>
            이벤트 시작
          </button>
          <button className="btn ghost big" onClick={quickRun} disabled={busy !== null}>
            빠른 실행 (플레이 없이 14일 → 검증 리포트)
          </button>
          <button className="btn ghost big" onClick={() => go('compare')} disabled={busy !== null}>
            기획자 패널 · 시나리오 비교
          </button>
        </div>
      </div>
    </div>
  );
}
