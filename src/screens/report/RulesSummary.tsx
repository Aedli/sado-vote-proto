import { ARCHETYPE_IDS } from '../../config/archetypes';
import { DEFAULT_CRITERIA as C, CRITERIA_SOURCE } from '../../config/criteria';
import { RULES_SUMMARY_TITLE, SPEC_LABEL, archetypeLabel } from '../../config/reportText';
import { SPEC_TIERS } from '../../config/rules';
import type { SimConfig } from '../../config';
import { HelpButton } from '../../components/Help';
import { dealTierValue } from '../../engine/rewards';
import { num, pct } from './format';

function conditionText(c: SimConfig['rewards']['dealTiers'][number]['condition']): string {
  if (c.kind === 'rank') return `${c.maxRank}위 이내`;
  if (c.kind === 'percentile') return `상위 ${pct(c.topRatio, 0)} 이내 (판 인원 × ${c.topRatio}, 올림)`;
  return '보스전 1회 이상 참여';
}

export function RulesSummary({ config }: { config: SimConfig }) {
  const { prelim, final, damage, personalityNames } = config.rules;
  const pop = config.population;
  const r = config.rewards;
  return (
    <div className="card" id="rules">
      <h2>{RULES_SUMMARY_TITLE}</h2>
      <p className="muted">시뮬레이션은 아래 규칙과 가정값으로 돌아갑니다. 규칙은 명세서(SPEC.md) 기준이고, 노란 표시가 붙은 것은 가정값입니다.</p>

      <div className="grid2">
        <div>
          <h3>예선 (1주차)</h3>
          <dl className="kv">
            <dt>기간</dt>
            <dd>{prelim.days}일</dd>
            <dt>표 얻는 법</dt>
            <dd>
              일일 미션 {prelim.missionCount}개 × {prelim.votesPerMission}표 = 하루 최대 {prelim.missionCount * prelim.votesPerMission}표, {prelim.days}일 최대{' '}
              {prelim.missionCount * prelim.votesPerMission * prelim.days}표
            </dd>
            <dt>투표 사도</dt>
            <dd>{prelim.reselect === 'daily' ? '매일 다시 고름 (하루 한 명)' : '처음 고른 사도로 고정'}</dd>
            <dt>이월</dt>
            <dd>없음. 그날 받지 않은 표는 사라짐</dd>
            <dt>순위·득표</dt>
            <dd>{prelim.rankingVisibility === 'hidden' ? '전면 비공개' : '공개 (비교용 시나리오)'}</dd>
            <dt>본선 진출</dt>
            <dd>상위 {prelim.finalistCount}명 (동표면 그 표에 먼저 도달한 사도)</dd>
          </dl>
        </div>
        <div>
          <h3>본선 (2주차)</h3>
          <dl className="kv">
            <dt>기간</dt>
            <dd>{final.days}일</dd>
            <dt>표 얻는 법</dt>
            <dd>
              보스전 하루 {final.entriesPerDay}회 × {final.votesPerEntry}표 (딜량과 무관)
            </dd>
            <dt>투표 사도</dt>
            <dd>처음 들어올 때 고르고 끝까지 변경 불가</dd>
            <dt>소탕</dt>
            <dd>그날 1회 도전하면 남은 횟수를 직전 기록으로 처리</dd>
            <dt>보스 성격</dt>
            <dd>
              1~{final.bossRotation.length}일차 {final.bossRotation.map((p) => personalityNames[p]).join(' → ')}, {final.bossChoiceDays.join('·')}일차는 유저가
              서로 다른 성격을 고름
            </dd>
            <dt>딜링 점수</dt>
            <dd>
              {final.days * final.entriesPerDay}회분 합산. 기본 전투력 고 {num(damage.basePower.high)} / 중 {num(damage.basePower.mid)} / 저{' '}
              {num(damage.basePower.low)}, 육성한 성격의 보스면 ×{damage.affinityMatch}, 아니면 ×{damage.affinityMismatch}
            </dd>
            <dt>랭킹판</dt>
            <dd>{final.boardMode === 'perSaint' ? '투표 사도별로 따로' : '전체 통합 한 판'}</dd>
          </dl>
        </div>
      </div>

      <h3>딜링 순위 보상과 보상 점수 환산</h3>
      <p className="muted">
        위에서부터 순서대로 보고 가장 먼저 해당하는 구간을 받습니다. 보상 점수 = 명예 점수 + 엘리프 {r.value.elifPerPoint}개당 1점 + 골드{' '}
        {num(r.value.goldPerPoint)}당 1점. 황금 크레파스는 모든 구간이 같아 환산하지 않습니다.
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>구간</th>
            <th>조건</th>
            <th>이름표</th>
            <th>엘리프</th>
            <th>황금 크레파스</th>
            <th>골드</th>
            <th>명예 점수</th>
            <th>보상 점수</th>
          </tr>
        </thead>
        <tbody>
          {r.dealTiers.map((t) => (
            <tr key={t.id}>
              <td>{t.label}</td>
              <td>{conditionText(t.condition)}</td>
              <td>{t.nameplate}</td>
              <td>{num(t.elif)}</td>
              <td>{t.goldenCrayon}</td>
              <td>{num(t.gold)}</td>
              <td>{t.honorValue}</td>
              <td>
                <b>{num(dealTierValue(t, r.value), 1)}점</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>판정 기준 한눈에 보기</h3>
      <table className="data">
        <thead>
          <tr>
            <th>지표</th>
            <th>통과</th>
            <th>주의</th>
            <th>실패</th>
            <th>출처</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>H1 선택별 기대 보상 격차</td>
            <td>격차 &lt; 참가상의 {pct(C.h1.warnGapRatio, 0)}, 구간 변화 &lt; {C.h1.failTierSteps}칸</td>
            <td>격차 ≥ 참가상의 {pct(C.h1.warnGapRatio, 0)}</td>
            <td>구간 변화 ≥ {C.h1.failTierSteps}칸</td>
            <td>{CRITERIA_SOURCE.h1}</td>
          </tr>
          <tr>
            <td>H2 팬 수·득표 순서 일치도</td>
            <td>≥ {C.h2.spearman.pass}</td>
            <td>
              {C.h2.spearman.warn} ~ {C.h2.spearman.pass}
            </td>
            <td>&lt; {C.h2.spearman.warn}</td>
            <td>{CRITERIA_SOURCE.h2}</td>
          </tr>
          <tr>
            <td>H2 진출자 일치 (10명 기준)</td>
            <td>≥ {C.h2.finalistMatch.pass}명</td>
            <td>
              {C.h2.finalistMatch.warn} ~ {C.h2.finalistMatch.pass - 1}명
            </td>
            <td>≤ {C.h2.finalistMatch.warn - 1}명</td>
            <td>{CRITERIA_SOURCE.h2}</td>
          </tr>
          <tr>
            <td>H3 본선 이탈률</td>
            <td>≤ {pct(C.h3.dropout.pass, 0)}</td>
            <td>
              {pct(C.h3.dropout.pass, 0)} ~ {pct(C.h3.dropout.warn, 0)}
            </td>
            <td>&gt; {pct(C.h3.dropout.warn, 0)}</td>
            <td>{CRITERIA_SOURCE.h3}</td>
          </tr>
          <tr>
            <td>H3 {C.h3.smallBoardSize}명 미만 판</td>
            <td>{C.h3.smallBoards.pass}개</td>
            <td>
              {C.h3.smallBoards.pass + 1} ~ {C.h3.smallBoards.warn}개
            </td>
            <td>≥ {C.h3.smallBoards.warn + 1}개</td>
            <td>{CRITERIA_SOURCE.h3}</td>
          </tr>
        </tbody>
      </table>

      <h3>
        봇 유형 가정값 <span className="chip assume">가정값</span> <HelpButton k="assumption" />
      </h3>
      <table className="data">
        <thead>
          <tr>
            <th>유형</th>
            <th>비율</th>
            <th>
              접속률 <HelpButton k="connectRate" />
            </th>
            <th>
              미션 수행률 <HelpButton k="missionRate" />
            </th>
            <th>
              최애 예선 탈락 시 <HelpButton k="favoriteEliminated" />
            </th>
          </tr>
        </thead>
        <tbody>
          {ARCHETYPE_IDS.map((id) => {
            const a = pop.archetypes[id];
            const b = a.onFavoriteEliminated;
            return (
              <tr key={id}>
                <td>{archetypeLabel(id)}</td>
                <td>{pct(a.ratio, 0)}</td>
                <td>{id === 'late' ? `진입 후 ${pct(pop.late.connectRateAfterEntry, 0)}` : pct(a.connectRate, 0)}</td>
                <td>{pct(a.missionRate, 0)}</td>
                <td>
                  {b
                    ? `그만둠 ${pct(b.leave, 0)} / 다음 선호 사도 ${pct(b.nextFavorite, 0)}${b.popular ? ` / 유명한 사도 ${pct(b.popular, 0)}` : ''}`
                    : '영향 없음'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <dl className="kv">
        <dt>스펙 분포</dt>
        <dd>{SPEC_TIERS.map((s) => `${SPEC_LABEL[s]} ${pct(pop.specDistribution[s], 0)}`).join(' · ')}</dd>
        <dt>
          보상 민감도 <HelpButton k="rewardSensitivity" />
        </dt>
        <dd>{pop.rewardSensitivity} (보상 최적화형이 판을 고를 때 보상을 얼마나 신경 쓰는지)</dd>
        <dt>
          열성도 보정 <HelpButton k="fervor" />
        </dt>
        <dd>
          최애의 열성도가 1을 넘으면 넘는 만큼 × {pop.fervorBonus.perUnit}를 접속률·미션 수행률에 더함, 최대 {pct(pop.fervorBonus.cap, 0)}
        </dd>
        <dt>
          인기 분포 <HelpButton k="popularity" />
        </dt>
        <dd>Zipf 지수 {pop.saints.zipfS} (클수록 소수 사도에 인기가 쏠림)</dd>
        <dt>
          유명한 사도 고르기 <HelpButton k="routine" />
        </dt>
        <dd>루틴 무관심형 예선: 인기 상위 {pop.routinePrelimTopN}명 중 인기 비례 제비뽑기</dd>
      </dl>
    </div>
  );
}
