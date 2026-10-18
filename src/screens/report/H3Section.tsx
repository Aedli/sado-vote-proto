import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEFAULT_CRITERIA } from '../../config/criteria';
import { H3_TEXT, VERDICT_TEXT, archetypeLabel } from '../../config/reportText';
import { HelpButton } from '../../components/Help';
import { Intent, Metric, VerdictBadge } from '../../components/Metric';
import type { ReportData } from '../../sim/metrics';
import { CHART_COLORS, num, pct } from './format';

export function H3Section({ d }: { d: ReportData }) {
  const h = d.h3;
  const c = DEFAULT_CRITERIA.h3;
  const worstDrop = [...h.dropout].sort((a, b) => b.rate - a.rate)[0];
  const firstSmall = h.sensitivity.find((s) => s.smallBoards > 0);

  return (
    <div className="card hyp" id="h3">
      <div className="hyp-head">
        <h2>{H3_TEXT.title}</h2>
        <VerdictBadge v={h.verdict} big />
        <HelpButton k="favoriteEliminated" label="최애 탈락 시 행동" />
        <HelpButton k="lateEntry" label="중도 진입형" />
      </div>
      <p className="summary">{H3_TEXT.summary}</p>
      <Intent {...H3_TEXT.intent} />
      <div className="box reading">
        <h4>H3 종합 판정: {VERDICT_TEXT[h.verdict].label}</h4>
        <p>
          본선 이탈률 {VERDICT_TEXT[h.dropoutVerdict].label}, 판 밀도 {VERDICT_TEXT[h.smallBoardsVerdict].label}이고, 종합 판정은 이 중 가장 나쁜
          &quot;{VERDICT_TEXT[h.verdict].label}&quot;를 따릅니다.
        </p>
      </div>

      <Metric
        text={H3_TEXT.eliminated}
        verdict="info"
        reading={
          <p>
            전체 봇의 <b>{pct(h.favoriteEliminatedRate)}</b>가 최애를 예선에서 잃었습니다. 사도 {num(d.h2.points.length)}명 중{' '}
            {d.finalistCount}명만 진출하지만 인기 사도에 팬이 몰려 있어, 나머지 {pct(1 - h.favoriteEliminatedRate)}는 최애가 본선에 남았습니다.
          </p>
        }
      >
        <div className="grid2">
          <table className="data">
            <thead>
              <tr>
                <th>유형</th>
                <th>봇 수</th>
                <th>최애 탈락 비율</th>
              </tr>
            </thead>
            <tbody>
              {h.favoriteEliminated.map((x) => (
                <tr key={x.archetype}>
                  <td>{archetypeLabel(x.archetype)}</td>
                  <td>{num(x.count)}</td>
                  <td>{pct(x.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="chart" style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={h.favoriteEliminated.map((x) => ({ name: archetypeLabel(x.archetype), 탈락: +(x.rate * 100).toFixed(1) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis unit="%" fontSize={12} />
                <Tooltip />
                <Bar dataKey="탈락" fill={CHART_COLORS.sub} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Metric>

      <Metric
        text={H3_TEXT.dropout}
        verdict={h.dropoutVerdict}
        reading={
          <p>
            예선 참여 봇의 <b>{pct(h.dropoutRate)}</b>가 본선에 오지 않았습니다.{' '}
            {h.dropoutRate <= c.dropout.pass
              ? `기준 ${pct(c.dropout.pass, 0)} 이하라 "통과"입니다.`
              : h.dropoutRate <= c.dropout.warn
                ? `기준 ${pct(c.dropout.pass, 0)}를 넘고 ${pct(c.dropout.warn, 0)} 이하라 "주의"입니다.`
                : `기준 ${pct(c.dropout.warn, 0)}를 넘어 "실패"입니다.`}{' '}
            유형별로는 {archetypeLabel(worstDrop.archetype)}이 {pct(worstDrop.rate)}로 가장 높습니다.
          </p>
        }
      >
        <table className="data">
          <thead>
            <tr>
              <th>유형</th>
              <th>예선 참여 봇</th>
              <th>본선 이탈률</th>
            </tr>
          </thead>
          <tbody>
            {h.dropout.map((x) => (
              <tr key={x.archetype}>
                <td>{archetypeLabel(x.archetype)}</td>
                <td>{num(x.prelimParticipants)}</td>
                <td>{pct(x.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Metric>

      <Metric
        text={H3_TEXT.density}
        verdict={h.smallBoardsVerdict}
        reading={
          <p>
            본선 판 크기는 가장 작은 판 <b>{num(h.boardMin)}명</b> · 중간 {num(h.boardMedian)}명 · 가장 큰 판 {num(h.boardMax)}명입니다.{' '}
            {c.smallBoardSize}명 미만인 판은 <b>{h.smallBoards}개</b>라{' '}
            {h.smallBoards <= c.smallBoards.pass ? '"통과"' : h.smallBoards <= c.smallBoards.warn ? '"주의"' : '"실패"'}입니다.
          </p>
        }
      />

      <Metric
        text={H3_TEXT.sensitivity}
        verdict="info"
        reading={
          <p>
            진출 인원을 늘리면 최애 탈락은 {pct(h.sensitivity[0].favoriteEliminatedRate)}({h.sensitivity[0].finalists}명) →{' '}
            {pct(h.sensitivity[h.sensitivity.length - 1].favoriteEliminatedRate)}({h.sensitivity[h.sensitivity.length - 1].finalists}명)로 줄고,
            가장 작은 판은 {num(h.sensitivity[0].boardMin)}명 → {num(h.sensitivity[h.sensitivity.length - 1].boardMin)}명으로 작아집니다.{' '}
            {firstSmall
              ? `진출 ${firstSmall.finalists}명부터 ${c.smallBoardSize}명 미만 판이 생깁니다.`
              : `비교한 범위에서는 ${c.smallBoardSize}명 미만 판이 생기지 않았습니다.`}
          </p>
        }
      >
        <div className="grid2">
          <table className="data">
            <thead>
              <tr>
                <th>진출 인원</th>
                <th>최애 탈락</th>
                <th>본선 이탈</th>
                <th>판 크기 (최소 / 중간 / 최대)</th>
                <th>{c.smallBoardSize}명 미만 판</th>
              </tr>
            </thead>
            <tbody>
              {h.sensitivity.map((s) => (
                <tr key={s.finalists} className={s.finalists === d.finalistCount ? 'hl' : ''}>
                  <td>
                    {s.finalists}명{s.finalists === d.finalistCount ? ' (현재)' : ''}
                  </td>
                  <td>{pct(s.favoriteEliminatedRate)}</td>
                  <td>{pct(s.dropoutRate)}</td>
                  <td>
                    {num(s.boardMin)} / {num(s.boardMedian)} / {num(s.boardMax)}
                  </td>
                  <td>{s.smallBoards}개</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="chart" style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart
                data={h.sensitivity.map((s) => ({
                  name: `${s.finalists}명`,
                  '최애 탈락(%)': +(s.favoriteEliminatedRate * 100).toFixed(1),
                  '본선 이탈(%)': +(s.dropoutRate * 100).toFixed(1),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip />
                <Legend />
                <Line dataKey="최애 탈락(%)" stroke={CHART_COLORS.sub} strokeWidth={2} />
                <Line dataKey="본선 이탈(%)" stroke={CHART_COLORS.fail} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Metric>
    </div>
  );
}
