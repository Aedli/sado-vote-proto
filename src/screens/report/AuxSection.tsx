import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ARCHETYPE_IDS } from '../../config/archetypes';
import { AUX_TEXT, archetypeLabel } from '../../config/reportText';
import { HelpButton } from '../../components/Help';
import { Metric } from '../../components/Metric';
import type { ReportData } from '../../sim/metrics';
import { num, pct } from './format';

const LINE_COLORS = ['#86a83a', '#c9b458', '#5b8bd6', '#c0392b', '#8e6bbf', '#4aa3a1'];

export function AuxSection({ d }: { d: ReportData }) {
  const a = d.aux;
  const daily = a.daily.map((x) => ({
    name: `${x.phase === 'prelim' ? '예선' : '본선'}${x.day}`,
    전체: +(x.rate * 100).toFixed(1),
    ...Object.fromEntries(ARCHETYPE_IDS.map((k) => [archetypeLabel(k), +(x.byArchetype[k] * 100).toFixed(1)])),
  }));
  const prelim = a.daily.filter((x) => x.phase === 'prelim');
  const final = a.daily.filter((x) => x.phase === 'final');
  const avg = (xs: typeof a.daily) => xs.reduce((s, x) => s + x.rate, 0) / Math.max(1, xs.length);

  return (
    <div className="card hyp" id="aux">
      <div className="hyp-head">
        <h2>{AUX_TEXT.title}</h2>
        <HelpButton k="connectRate" label="접속률" />
      </div>

      <Metric
        text={AUX_TEXT.daily}
        verdict="info"
        reading={
          <p>
            예선 평균 참여율 <b>{pct(avg(prelim))}</b>, 본선 평균 참여율 <b>{pct(avg(final))}</b>입니다(참여 가능한 봇 기준).
          </p>
        }
      >
        <p className="chart-title">일차별 참여율 (가정값 기반)</p>
        <div className="chart" style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis unit="%" domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line dataKey="전체" stroke="#222" strokeWidth={3} dot={false} />
              {ARCHETYPE_IDS.map((k, i) => (
                <Line key={k} dataKey={archetypeLabel(k)} stroke={LINE_COLORS[i]} dot={false} strokeDasharray="4 2" />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Metric>

      <Metric
        text={AUX_TEXT.late}
        verdict="info"
        reading={
          <p>
            처음부터 참여한 봇은 평균 {num(a.late.fullAvgVotes, 1)}표를 얻었습니다. 예선 중에 들어온 중도 진입형은 그 <b>{pct(a.late.prelimEntryRatio)}</b>,
            본선에 처음 들어온 중도 진입형은 <b>{pct(a.late.finalEntryRatio)}</b>를 얻었습니다. 늦게 온 만큼 받을 수 있는 표가 줄어드는 규칙이 그대로
            반영된 결과입니다.
          </p>
        }
      />

      <Metric
        text={AUX_TEXT.gini}
        verdict="info"
        reading={
          <p>
            예선 득표 지니계수 <b>{a.prelimGini.toFixed(3)}</b>, 본선 득표 지니계수 <b>{a.finalGini.toFixed(3)}</b>입니다. 예선은 {d.h2.points.length}명에게 표가
            나뉘므로 소수 인기 사도에 쏠린 정도가 크고, 본선은 진출자끼리만 나누므로 상대적으로 덜 쏠립니다.
          </p>
        }
      />
    </div>
  );
}
