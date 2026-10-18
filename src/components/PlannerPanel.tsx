import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { archetypeLabel, SPEC_LABEL } from '../config/reportText';
import { PLANNER_LABEL } from '../config/ui';
import { useGameStore } from '../store/gameStore';
import { num, pct, saintName } from '../screens/report/format';
import { StageIntro } from './StageIntro';

const INTRO = (
  <>
    <p>이 패널은 기획자만 볼 수 있는 실시간 데이터입니다. 실제 유저 화면에는 순위·득표·랭킹판 규모가 전혀 나오지 않습니다.</p>
    <p>봇들은 &quot;다음 날로&quot;를 누르는 순간 그날 하루를 한꺼번에 행동합니다. 그래서 봇 데이터는 전날 마감 기준이고, 내 표와 점수만 지금 상태가 반영됩니다.</p>
    <p>봇의 행동 방식과 확률은 모두 가정값입니다.</p>
  </>
);

/** 기획자 시점 사이드 패널 (§8.10) */
export function PlannerPanel() {
  const { planner, view } = useGameStore();
  if (!planner || !view) return null;
  const p = planner;
  const mySaint = view.clock.phase === 'prelim' ? view.prelim.daySaint : view.final.saint;
  const topData = p.prelim.top.map((t) => ({ name: saintName(t.saint).replace('사도 ', ''), votes: t.votes }));
  const cutName = topData[p.prelim.finalistCount - 1]?.name;
  return (
    <aside className="planner">
      <div className="planner-label">🔒 {PLANNER_LABEL}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <StageIntro key={p.phase} stage={p.phase === 'prelim' ? 'prelimSide' : 'finalSide'} intro={INTRO} />
        <span className="chip assume">가정값 기반</span>
      </div>
      <p className="muted small">{p.asOf}</p>
      <p className="muted small">
        내 계정: {SPEC_LABEL[p.myAccount.spec]}, 실력 보정 ×{p.myAccount.skill.toFixed(2)}
      </p>

      {p.phase === 'prelim' && (
        <>
          <h3>예선 득표 상위 20</h3>
          <p className="small">
            진출 컷({p.prelim.finalistCount}위) <b>{num(p.prelim.cutVotes)}표</b> · {p.prelim.finalistCount + 1}위 {num(p.prelim.nextVotes)}표
            {p.prelim.mySaintRank !== null && (
              <>
                <br />
                오늘 내 응원 사도({saintName(view.prelim.daySaint)}) 현재 <b>{p.prelim.mySaintRank}위</b>
              </>
            )}
          </p>
          <div style={{ height: 420 }}>
            <ResponsiveContainer>
              <BarChart data={topData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={36} fontSize={11} interval={0} />
                <Tooltip formatter={(v) => `${num(Number(v))}표`} />
                {cutName && <ReferenceLine y={cutName} stroke="#c0392b" strokeDasharray="4 2" />}
                <Bar dataKey="votes">
                  {p.prelim.top.map((t, i) => (
                    <Cell key={t.saint} fill={t.saint === mySaint ? '#5b8bd6' : i < p.prelim.finalistCount ? '#86a83a' : '#b8bfae'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small">초록 = 현재 진출권, 회색 = 진출권 밖, 파랑 = 오늘 내 응원 사도. 빨간 점선 = 진출 컷</p>
        </>
      )}

      {p.final && (
        <>
          <h3>본선 랭킹판</h3>
          {p.final.my ? (
            <p className="small">
              내 실제 딜링 순위: <b>{num(p.final.my.rank)}위</b> / {num(p.final.my.boardSize)}명 → 현재 보상 구간 <b>{p.final.my.tierLabel}</b>
            </p>
          ) : (
            <p className="small muted">아직 보스전에 참여하지 않아 순위가 없습니다.</p>
          )}
          <table className="data small">
            <thead>
              <tr>
                <th>사도 (본선 득표순)</th>
                <th>판 인원</th>
                <th>득표</th>
              </tr>
            </thead>
            <tbody>
              {p.final.boards.map((b) => (
                <tr key={b.saint} className={b.saint === mySaint ? 'hl' : ''}>
                  <td>{saintName(b.saint)}</td>
                  <td>{num(b.size)}</td>
                  <td>{num(b.votes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>유형별 본선 이탈률</h3>
          <table className="data small">
            <tbody>
              {p.final.dropout.map((d) => (
                <tr key={d.archetype}>
                  <td>{archetypeLabel(d.archetype)}</td>
                  <td>{d.decided === 0 ? '집계 전' : pct(d.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {p.lastDay && (
        <>
          <h3>봇 참여 ({p.phase === 'final' ? '본선' : '예선'} 직전 하루)</h3>
          <p className="small">
            {num(p.lastDay.connected)}명 / {num(p.lastDay.eligible)}명 접속 ({pct(p.lastDay.connected / Math.max(1, p.lastDay.eligible))})
          </p>
          <table className="data small">
            <tbody>
              {p.lastDay.byArchetype.map((a) => (
                <tr key={a.archetype}>
                  <td>{archetypeLabel(a.archetype)}</td>
                  <td>{a.eligible === 0 ? '아직 진입 전' : pct(a.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </aside>
  );
}
