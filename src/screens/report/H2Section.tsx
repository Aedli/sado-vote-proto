import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { DEFAULT_CRITERIA } from '../../config/criteria';
import { H2_TEXT, VERDICT_TEXT } from '../../config/reportText';
import { HelpButton } from '../../components/Help';
import { Intent, Metric, VerdictBadge } from '../../components/Metric';
import { ranks, type ReportData } from '../../sim/metrics';
import { CHART_COLORS, num, pct, saintName } from './format';

export function H2Section({ d }: { d: ReportData }) {
  const h = d.h2;
  const c = DEFAULT_CRITERIA.h2;
  const fans = h.points.map((p) => p.fans);
  const votes = h.points.map((p) => p.votes);
  // 큰 값이 1위가 되도록 뒤집은 순위
  const fanRank = ranks(fans.map((x) => -x));
  const voteRank = ranks(votes.map((x) => -x));
  const byVotes = [...h.points].sort((a, b) => b.votes - a.votes);
  const missed = h.fanTop.filter((s) => !h.points[s].finalist);
  const scale = d.finalistCount / 10;
  // 로그 눈금이라 0인 사도는 그리지 않는다
  const plotted = h.points.filter((p) => p.fans > 0 && p.votes > 0);

  return (
    <div className="card hyp" id="h2">
      <div className="hyp-head">
        <h2>{H2_TEXT.title}</h2>
        <VerdictBadge v={h.verdict} big />
        <HelpButton k="fervor" label="열성도" />
        <HelpButton k="popularity" label="인기도" />
      </div>
      <p className="summary">{H2_TEXT.summary}</p>
      <Intent {...H2_TEXT.intent} />
      <div className="box reading">
        <h4>H2 종합 판정: {VERDICT_TEXT[h.verdict].label}</h4>
        <p>
          순서 일치도 {VERDICT_TEXT[h.spearmanVerdict].label}, 진출자 일치도 {VERDICT_TEXT[h.finalistMatchVerdict].label}이고, 종합 판정은 이 중
          가장 나쁜 &quot;{VERDICT_TEXT[h.verdict].label}&quot;를 따릅니다.
        </p>
      </div>

      <Metric
        text={H2_TEXT.spearman}
        verdict={h.spearmanVerdict}
        reading={
          <p>
            순서 일치도는 <b>{h.spearman.toFixed(3)}</b>입니다.{' '}
            {h.spearman >= c.spearman.pass
              ? `기준 ${c.spearman.pass} 이상이라 "통과": 팬이 많은 사도일수록 표도 거의 그 순서대로 받았습니다.`
              : h.spearman >= c.spearman.warn
                ? `기준 ${c.spearman.pass}에는 못 미치고 ${c.spearman.warn} 이상이라 "주의": 대체로 맞지만 뒤바뀐 사도가 꽤 있습니다.`
                : `기준 ${c.spearman.warn} 미만이라 "실패": 득표 순서가 팬 수 순서와 많이 다릅니다.`}
          </p>
        }
      >
        <p className="chart-title">사도별 팬 수(가로)와 예선 득표(세로) — 초록 = 본선 진출, 두 축 모두 로그 눈금(큰 값 차이를 압축해 작은 사도도 보이게 함) (가정값 기반)</p>
        <div className="chart" style={{ height: 320 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="fans" name="팬 수" scale="log" domain={['auto', 'auto']} fontSize={12} />
              <YAxis type="number" dataKey="votes" name="예선 득표" scale="log" domain={['auto', 'auto']} fontSize={12} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(v) => num(Number(v))}
                labelFormatter={() => ''}
              />
              <Legend />
              <Scatter name="본선 진출" data={plotted.filter((p) => p.finalist)} fill={CHART_COLORS.main} />
              <Scatter name="예선 탈락" data={plotted.filter((p) => !p.finalist)} fill={CHART_COLORS.muted} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Metric>

      <Metric
        text={H2_TEXT.inversion}
        verdict="info"
        reading={
          <p>
            비교할 수 있는 {num(h.comparablePairs)}쌍 중 <b>{num(h.invertedPairs)}쌍({pct(h.invertedRatio)})</b>이 뒤집혔습니다. 뒤집힌 쌍 중{' '}
            <b>{pct(h.fervorWinShare)}</b>는 표를 더 받은 쪽 사도의 열성도가 더 높았습니다.{' '}
            {h.fervorWinShare > 0.5
              ? '50%보다 높으므로, 뒤집힘의 일부는 열성 팬층의 영향으로 볼 수 있습니다.'
              : '50% 이하이므로, 뒤집힘은 열성도보다 우연에 가깝습니다.'}
          </p>
        }
      >
        <p className="chart-title">예선 득표 상위 15명 (가정값 기반)</p>
        <table className="data">
          <thead>
            <tr>
              <th>사도</th>
              <th>득표 순위</th>
              <th>팬 수 순위</th>
              <th>예선 득표</th>
              <th>팬 수</th>
              <th>열성도</th>
              <th>진출</th>
            </tr>
          </thead>
          <tbody>
            {byVotes.slice(0, 15).map((p) => (
              <tr key={p.saint} className={p.finalist ? 'hl' : ''}>
                <td>{saintName(p.saint)}</td>
                <td>{voteRank[p.saint]}위</td>
                <td>
                  {fanRank[p.saint]}위{fanRank[p.saint] !== voteRank[p.saint] ? ' ⇄' : ''}
                </td>
                <td>{num(p.votes)}</td>
                <td>{num(p.fans)}</td>
                <td>{p.fervor.toFixed(2)}</td>
                <td>{p.finalist ? '진출' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 13 }}>
          ⇄ = 팬 수 순위와 득표 순위가 다른 사도
        </p>
      </Metric>

      <Metric
        text={H2_TEXT.match}
        verdict={h.finalistMatchVerdict}
        reading={
          <p>
            팬 수 상위 {d.finalistCount}명 중 <b>{h.finalistMatch}명</b>이 실제로 진출했습니다(통과 기준 {Math.ceil(c.finalistMatch.pass * scale)}명 이상).{' '}
            {missed.length > 0
              ? `팬 수로는 상위권인데 진출하지 못한 사도: ${missed.map(saintName).join(', ')}.`
              : '팬 수 상위 사도가 모두 진출했습니다.'}
          </p>
        }
      />

      <Metric
        text={H2_TEXT.reselect}
        verdict="info"
        reading={
          h.fixed ? (
            <p>
              예선 사도를 고정했을 때의 진출자는 매일 재선택(원안)과 <b>{h.fixed.overlapWithDaily}명</b>이 겹칩니다. 순서 일치도는 원안{' '}
              {h.spearman.toFixed(3)} → 고정 {h.fixed.spearman.toFixed(3)}입니다.{' '}
              {h.fixed.overlapWithDaily === d.finalistCount
                ? '이 가정값에서는 재선택 규칙이 진출자를 바꾸지 않았습니다.'
                : `${d.finalistCount - h.fixed.overlapWithDaily}명이 바뀌었습니다.`}
            </p>
          ) : (
            <p>현재 설정이 이미 &quot;고정&quot;이라 비교하지 않았습니다.</p>
          )
        }
      />
    </div>
  );
}
