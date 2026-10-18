import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEFAULT_CRITERIA } from '../../config/criteria';
import { H1_TEXT, SPEC_LABEL, VERDICT_TEXT } from '../../config/reportText';
import { HelpButton } from '../../components/Help';
import { Intent, Metric, VerdictBadge } from '../../components/Metric';
import type { RepresentativeGap, ReportData } from '../../sim/metrics';
import { CHART_COLORS, num, pct, saintName, signed } from './format';

function gapReason(r: RepresentativeGap, warnGap: number): string {
  if (r.score === null) return '이 스펙 등급의 본선 참여자가 없어 판정하지 않았습니다.';
  if (r.tierSteps >= DEFAULT_CRITERIA.h1.failTierSteps) {
    return `판에 따라 딜링 구간이 ${r.tierSteps}칸 바뀌어, 기준(${DEFAULT_CRITERIA.h1.failTierSteps}칸 이상)에 걸려 "실패"입니다.`;
  }
  if (r.gap >= warnGap) {
    return `구간 변화는 ${r.tierSteps}칸이라 실패는 아니지만, 격차 ${num(r.gap, 1)}점이 기준 ${num(warnGap)}점 이상이라 "주의"입니다.`;
  }
  return `격차 ${num(r.gap, 1)}점이 기준 ${num(warnGap)}점 미만이고 구간 변화도 ${r.tierSteps}칸이라 "통과"입니다.`;
}

export function H1Section({ d }: { d: ReportData }) {
  const h = d.h1;
  const boards = [...h.boards].sort((a, b) => b.size - a.size);
  const big = boards[0];
  const small = boards[boards.length - 1];
  const withCut = boards.filter((b) => b.top100Cutoff !== null);
  const cutHi = withCut[0];
  const cutLo = withCut[withCut.length - 1];

  return (
    <div className="card hyp" id="h1">
      <div className="hyp-head">
        <h2>{H1_TEXT.title}</h2>
        <VerdictBadge v={h.verdict} big />
        <HelpButton k="rewardSensitivity" label="보상 민감도" />
      </div>
      <p className="summary">{H1_TEXT.summary}</p>
      <Intent {...H1_TEXT.intent} />
      <div className="box reading">
        <h4>H1 종합 판정: {VERDICT_TEXT[h.verdict].label}</h4>
        <p>
          스펙 등급별 ① 기대 보상 격차 판정은{' '}
          {h.representatives.map((r) => `${SPEC_LABEL[r.spec]} ${VERDICT_TEXT[r.verdict].label}`).join(', ')}
          이고, 종합 판정은 이 중 가장 나쁜 &quot;{VERDICT_TEXT[h.verdict].label}&quot;를 따릅니다.
        </p>
      </div>

      <Metric
        text={H1_TEXT.boards}
        reading={
          <p>
            가장 큰 판은 <b>{saintName(big.saint)}</b>({num(big.size)}명, 인기 {big.popularityRank}위), 가장 작은 판은{' '}
            <b>{saintName(small.saint)}</b>({num(small.size)}명, 인기 {small.popularityRank}위)입니다. 가장 큰 판이 가장 작은 판의{' '}
            {(big.size / Math.max(1, small.size)).toFixed(1)}배입니다.
          </p>
        }
      >
        <p className="chart-title">본선 사도별 랭킹판 참여자 수 (가정값 기반)</p>
        <div className="chart">
          <ResponsiveContainer>
            <BarChart data={boards.map((b) => ({ name: saintName(b.saint), 참여자: b.size }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="참여자" fill={CHART_COLORS.main} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Metric>

      <Metric
        text={H1_TEXT.gap}
        verdict={h.verdict}
        reading={
          <>
            {h.representatives.map((r) => (
              <p key={r.spec}>
                <VerdictBadge v={r.verdict} /> <b>{SPEC_LABEL[r.spec]} 대표 계정</b>
                {r.score !== null && r.best && r.worst ? (
                  <>
                    (최종 딜링 점수 {num(r.score)}점, 실제로는 {saintName(r.homeSaint)} 판): 가장 좋은 판은 {saintName(r.best.saint)}(
                    {num(r.best.rank)}위/{num(r.best.boardSize)}명 → {r.best.tierLabel}, {num(r.best.value, 1)}점), 가장 나쁜 판은{' '}
                    {saintName(r.worst.saint)}({num(r.worst.rank)}위/{num(r.worst.boardSize)}명 → {r.worst.tierLabel},{' '}
                    {num(r.worst.value, 1)}점). {gapReason(r, d.warnGap)}
                  </>
                ) : (
                  <> {gapReason(r, d.warnGap)}</>
                )}
              </p>
            ))}
          </>
        }
      >
        <p className="chart-title">대표 계정을 각 판에 넣었을 때의 순위와 구간 (초록 = 가장 좋은 판, 빨강 = 가장 나쁜 판)</p>
        <table className="data">
          <thead>
            <tr>
              <th>판 (참여자 수)</th>
              {h.representatives.map((r) => (
                <th key={r.spec}>
                  {SPEC_LABEL[r.spec]} 대표 ({r.score === null ? '-' : `${num(r.score)}점`})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boards.map((b) => (
              <tr key={b.saint}>
                <td>
                  {saintName(b.saint)} ({num(b.size)}명)
                </td>
                {h.representatives.map((r) => {
                  const p = r.placements.find((x) => x.saint === b.saint);
                  if (!p) return <td key={r.spec}>-</td>;
                  const cls = r.best?.saint === p.saint ? 'cell-best' : r.worst?.saint === p.saint ? 'cell-worst' : '';
                  return (
                    <td key={r.spec} className={cls}>
                      {num(p.rank)}위 · {p.tierLabel} · {num(p.value, 1)}점{r.homeSaint === p.saint ? ' (실제 판)' : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="chart-title">참고: 모든 본선 참여 봇에게 같은 계산을 했을 때 (판정에는 쓰지 않음)</p>
        <table className="data">
          <thead>
            <tr>
              <th>스펙</th>
              <th>참여 봇 수</th>
              <th>격차 중앙값</th>
              <th>주의 수준({num(d.warnGap)}점 이상) 비율</th>
              <th>실패 수준(구간 {DEFAULT_CRITERIA.h1.failTierSteps}칸 이상) 비율</th>
            </tr>
          </thead>
          <tbody>
            {h.distributions.map((x) => (
              <tr key={x.spec}>
                <td>{SPEC_LABEL[x.spec]}</td>
                <td>{num(x.participants)}</td>
                <td>{num(x.medianGap, 1)}점</td>
                <td>{pct(x.warnShare)}</td>
                <td>{pct(x.failShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Metric>

      <Metric
        text={H1_TEXT.access}
        reading={
          cutHi && cutLo ? (
            <p>
              100위 점수가 가장 높은 판은 {saintName(cutHi.saint)}({num(cutHi.top100Cutoff!)}점), 가장 낮은 판은 {saintName(cutLo.saint)}(
              {num(cutLo.top100Cutoff!)}점)로 {(cutHi.top100Cutoff! / cutLo.top100Cutoff!).toFixed(2)}배 차이입니다. 큰 판일수록 같은 상위권
              이름표를 받는 데 더 높은 점수가 필요합니다.
            </p>
          ) : (
            <p>모든 판이 100명 이하라 참여만 하면 상위권 이상입니다.</p>
          )
        }
      >
        <table className="data">
          <thead>
            <tr>
              <th>판</th>
              <th>참여자 수</th>
              <th>상위권(100위) 최소 점수</th>
              <th>1위 점수</th>
            </tr>
          </thead>
          <tbody>
            {[...boards]
              .sort((a, b) => (b.top100Cutoff ?? 0) - (a.top100Cutoff ?? 0))
              .map((b) => (
                <tr key={b.saint}>
                  <td>{saintName(b.saint)}</td>
                  <td>{num(b.size)}</td>
                  <td>{b.top100Cutoff === null ? '참여만 하면 상위권' : `${num(b.top100Cutoff)}점`}</td>
                  <td>{num(b.topScore)}점</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Metric>

      <Metric
        text={H1_TEXT.optimizer}
        verdict="info"
        reading={
          <>
            {h.optimizer.map((o) => (
              <p key={o.spec}>
                <b>{SPEC_LABEL[o.spec]}</b>: 최적화형 평균 {num(o.optimizerAvg, 1)}점({num(o.optimizerCount)}명), 나머지 평균{' '}
                {num(o.othersAvg, 1)}점({num(o.othersCount)}명) → 차이 {signed(o.diff)}점, 참가상 점수의 {pct(o.diffRatio)}.{' '}
                {o.diff >= d.warnGap
                  ? '짐작해서 판을 고른 봇이 주의 기준 이상의 이득을 봤습니다.'
                  : o.diff > 0
                    ? '짐작해서 판을 고른 봇이 이득을 봤지만 주의 기준보다는 작습니다.'
                    : '짐작해서 판을 골라도 이득이 없었습니다.'}
              </p>
            ))}
          </>
        }
      >
        <p className="chart-title">스펙별 평균 딜링 보상 점수 (본선 참여 봇, 가정값 기반)</p>
        <div className="chart">
          <ResponsiveContainer>
            <BarChart data={h.optimizer.map((o) => ({ name: SPEC_LABEL[o.spec], 최적화형: +o.optimizerAvg.toFixed(1), 나머지: +o.othersAvg.toFixed(1) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[Math.floor(d.participationValue * 0.9), 'auto']} />
              <Tooltip />
              <Legend />
              <Bar dataKey="최적화형" fill={CHART_COLORS.accent} />
              <Bar dataKey="나머지" fill={CHART_COLORS.muted} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Metric>
    </div>
  );
}
