// 검증 리포트 화면 문구 (SPEC §8.12, 부록 B13·B17). 판정 기준 수치는 criteria.ts에서 읽어 문장에 넣는다.
// 기획 의도 문장은 원본 기획서(docs/ PDF, 저장소 미포함)에서 옮겼고 출처 쪽수를 함께 둔다.

import { DEFAULT_ARCHETYPES, type ArchetypeId } from './archetypes';
import { DEFAULT_CRITERIA as C, CRITERIA_SOURCE } from './criteria';
import { DEFAULT_REWARDS } from './rewards';
import { DEFAULT_RULES, type SpecTier } from './rules';

const PART = DEFAULT_REWARDS.dealTiers.find((t) => t.condition.kind === 'participation')!;
const V = DEFAULT_REWARDS.value;
/** 참가상 보상 점수와 주의 기준 격차 */
const PART_VALUE = PART.honorValue + PART.elif / V.elifPerPoint + PART.gold / V.goldPerPoint;
const WARN_GAP = Math.round(PART_VALUE * C.h1.warnGapRatio);
const PAIRS = (DEFAULT_RULES.saintCount * (DEFAULT_RULES.saintCount - 1)) / 2;
const won = (n: number) => n.toLocaleString('ko-KR');

export const SPEC_LABEL: Record<SpecTier, string> = { high: '고스펙', mid: '중스펙', low: '저스펙' };
export const archetypeLabel = (id: ArchetypeId) => DEFAULT_ARCHETYPES[id].label;

export const VERDICT_TEXT = {
  pass: { label: '통과', desc: '기획 의도대로 작동하고 있습니다.' },
  warn: { label: '주의', desc: '의도에서 벗어날 조짐이 있습니다. 가정값을 바꿔 다시 확인해 볼 필요가 있습니다.' },
  fail: { label: '실패', desc: '이 조건에서는 기획 의도가 달성되지 않습니다.' },
  info: { label: '참고', desc: '판정 없이 참고용으로 보여주는 수치입니다.' },
} as const;

const pct = (x: number) => `${Math.round(x * 100)}%`;

export interface MetricText {
  title: string;
  /** 이 지표가 묻는 질문 (한 줄) */
  question: string;
  /** 연결된 기획 의도 */
  intent: { quote: string; source: string };
  /** 계산 방법 (쉬운 말, 단계별) */
  how: string[];
  /** 판정 기준 (단계별) */
  criteria: string[];
  /** 판정 기준 출처 */
  criteriaSource?: string;
  /** 읽을 때 주의할 점 */
  caution?: string;
}

export const REPORT_INTRO = {
  title: '검증 리포트 읽는 법',
  paragraphs: [
    '이 리포트는 봇(가상 유저)들이 기획서 규칙대로 2주 이벤트를 치른 결과를 보고, 기획서가 노린 효과가 실제로 나타나는지 숫자로 따져 봅니다.',
    '봇이 몇 %의 확률로 접속하는지, 어떤 사도를 좋아하는지 같은 숫자는 실제 데이터가 아니라 기획자가 짐작한 "가정값"입니다. 그래서 결과는 "이 가정이 맞다면 이렇게 된다"로 읽어야 합니다.',
    '가설은 세 가지입니다. H1은 보상이 사도 선택을 비틀지 않는지, H2는 모두에게 같은 표를 주면 득표가 인기를 제대로 보여주는지, H3는 최애가 예선에서 떨어진 유저가 본선에 남는지를 봅니다.',
    '각 지표에는 "무엇을 묻나 → 기획 의도 → 계산 방법 → 판정 기준 → 이번 결과 읽기"가 순서대로 붙어 있습니다. 모르는 용어 옆의 ? 버튼을 누르면 쉬운 설명이 나옵니다.',
    '판정 배지는 통과(초록) · 주의(노랑) · 실패(빨강) · 참고(회색) 네 가지입니다. 한 가설 안에 판정이 여러 개면, 가설 전체 판정은 그중 가장 나쁜 것을 따릅니다.',
    '이 리포트는 시드 1개로 한 번 돌린 결과입니다. 여러 시드로 반복해 평균을 내는 비교는 시나리오 비교(M5)에서 제공합니다.',
  ],
};

export const RULES_SUMMARY_TITLE = '이 리포트가 따르는 규칙';

export const H1_TEXT = {
  title: 'H1. 보상이 사도 선택을 왜곡하지 않는가',
  summary:
    '본선에서는 같은 사도를 고른 사람끼리 딜량으로 순위를 겨룹니다. 그래서 "인기가 적은 사도 판은 경쟁자가 적어 상위권을 받기 쉽다"는 계산이 생길 수 있습니다. H1은 두 층으로 확인합니다. ① 구조 점검: 판만 바꿔도 보상이 크게 달라지는 구조인가? ② 실제 행동 점검: 판 인원을 모른 채 짐작해서 옮긴 봇이 실제로 이득을 봤는가?',
  intent: {
    quote: '보상이 유저의 선택을 왜곡하지 않도록 설계 — 재화를 기준으로 응원 사도를 고르는 일이 없어야 인기투표가 성립',
    source: '기획서 p.15 보상구조 기획의도',
  },
  boards: {
    title: '판별 참여자 수',
    question: '본선 사도마다 랭킹판에 몇 명이 모였나?',
    intent: { quote: '본선은 사도별로 랭킹판이 나뉘며 … 후보를 압축하지 않으면 판당 참여자 밀도가 붕괴할 우려가 있음', source: '기획서 p.11' },
    how: [
      '본선에서 보스전에 1번 이상 들어간 봇을, 응원한 사도별로 셉니다.',
      '같은 사도를 응원한 봇들이 하나의 랭킹판이 됩니다(통합 랭킹판 설정이면 전체가 한 판).',
    ],
    criteria: ['이 지표 자체에는 판정이 없습니다. 아래 "기대 보상 격차"를 읽기 위한 바탕 자료입니다.'],
  } satisfies MetricText,
  gap: {
    title: '① 선택별 기대 보상 격차',
    question: '같은 실력의 유저가 어느 사도 판에 들어가느냐에 따라 보상이 얼마나 달라지나?',
    intent: { quote: '명예 보상 외에는 순위에 따라 차이를 미미하도록 설정 … 재화 보상을 기준으로 응원 사도를 고르는 일이 없도록', source: '기획서 p.16' },
    how: [
      '스펙 등급(고·중·저)마다, 그 등급 본선 참여자 중 최종 딜링 점수가 딱 중간인 봇 1명을 "대표 계정"으로 뽑습니다.',
      '대표 계정의 점수를 그대로 들고 본선 10개 판에 하나씩 넣어 봅니다. 다른 사람들은 원래 판에 그대로 있다고 가정합니다. 판이 바뀌어도 딜량 공식에는 영향이 없으므로 점수는 같습니다. 원래 판이 아닌 곳에 넣을 때는 대표 계정 1명이 더해지므로 그 판 인원이 1명 늘어난 것으로 계산합니다.',
      '판마다 몇 위가 되는지 보고, 그 순위로 받을 딜링 보상 구간(1위 … 참가상)을 정합니다.',
      '구간 보상을 점수로 바꿉니다. 명예 점수(1위 100 · 2위 80 · 3위 70 · 10위권 50 · 상위권 30 · 중위권 10 · 참가상 0) + 엘리프 1개당 1점 + 골드 10만당 1점입니다. 황금 크레파스는 모든 구간이 10개로 같아 빼고 계산합니다.',
      '10개 판 중 가장 좋은 판과 가장 나쁜 판의 점수 차이가 "격차"이고, 구간이 몇 칸 차이 나는지가 "구간 변화"입니다.',
      '참고로 모든 본선 참여 봇에게 같은 계산을 해서 격차가 얼마나 퍼져 있는지도 함께 보여줍니다(판정에는 쓰지 않음).',
    ],
    criteria: [
      `참가상의 점수는 엘리프 ${PART.elif} + 골드 ${won(PART.gold)}(${PART.gold / V.goldPerPoint}점) = ${PART_VALUE}점입니다.`,
      `격차가 참가상의 ${pct(C.h1.warnGapRatio)} (= ${WARN_GAP}점) 이상이면 "주의"입니다. 판 선택만으로 참가상의 5분의 1 이상이 왔다 갔다 한다는 뜻입니다.`,
      `판에 따라 딜링 구간이 ${C.h1.failTierSteps}칸 이상 바뀌면 "실패"입니다. 예: 어떤 판에서는 10위권, 다른 판에서는 중위권(10위권 → 상위권 → 중위권, 2칸).`,
      '둘 다 아니면 "통과"입니다.',
      '스펙 등급마다 판정을 하나씩 내고, H1 전체 판정은 세 등급 중 가장 나쁜 판정을 따릅니다. 어느 한 그룹이라도 "판을 골라야 이득"이면 그 유저들에게는 보상이 선택을 비트는 것이기 때문입니다.',
    ],
    criteriaSource: CRITERIA_SOURCE.h1,
    caution: '이 계산은 "판 인원을 정확히 알고 옮겼다면" 얻을 수 있는 최대 이득입니다. 실제 유저는 판 인원을 모르므로(비공개), 실제로 노려서 얻는 이득은 ②에서 따로 봅니다.',
  } satisfies MetricText,
  access: {
    title: '명예 보상 접근성',
    question: '판마다 상위권(100위 안) 이름표를 받으려면 최소 몇 점이 필요한가?',
    intent: { quote: '딜링 순위는 스펙이 반영되므로 … 경쟁 동기는 명예 보상에 집중', source: '기획서 p.15' },
    how: [
      '판마다 참여자를 최종 딜링 점수 순으로 줄 세우고, 100번째 사람의 점수를 봅니다.',
      '판 인원이 100명 이하면 참여만 해도 상위권 이상이므로 "참여만 하면 상위권"으로 표시합니다.',
    ],
    criteria: ['판정 없이 참고용입니다. 판마다 100위 점수 차이가 크면, 큰 판의 유저일수록 같은 이름표를 받기 어렵다는 뜻입니다.'],
  } satisfies MetricText,
  optimizer: {
    title: '② 최적화형 성과',
    question: '판 인원을 모른 채 "한산해 보이는 판"을 짐작해서 고른 봇이, 실제로 보상을 더 받았나?',
    intent: { quote: '보상이 유저의 선택을 왜곡하지 않도록 설계', source: '기획서 p.15' },
    how: [
      '보상 최적화형 봇(전체의 10%)은 커뮤니티 체감 인기로 판 크기를 짐작해서, 덜 붐빌 것 같은 판을 고릅니다(가정값: 보상 민감도).',
      '본선에 참여한 봇끼리만, 같은 스펙 등급 안에서 비교합니다. 고스펙이 원래 보상을 많이 받으므로 스펙이 섞이면 판 선택 효과와 구분할 수 없기 때문입니다.',
      '"최적화형의 평균 보상 점수"와 "나머지 유형(좋아하는 사도를 고른 봇)의 평균 보상 점수"를 나란히 놓고 차이를 봅니다.',
    ],
    criteria: [
      '판정 없이 참고용입니다(명세서에 기준이 없음).',
      `읽는 법: 차이가 참가상의 ${pct(C.h1.warnGapRatio)}(${WARN_GAP}점)에 가까울수록 "짐작해서 옮겨도 이득이 크다", 0에 가까울수록 "옮겨 봐야 별 이득이 없다"는 뜻입니다.`,
    ],
    caution: '같은 생각을 한 봇들이 함께 옮기면 그 판이 오히려 붐빌 수 있어서, ①의 최대 이득보다 실제 이득은 작아지는 것이 보통입니다.',
  } satisfies MetricText,
};

export const H2_TEXT = {
  title: 'H2. 같은 투표력이 선호를 측정하는가',
  summary:
    '기획서는 스펙·과금·보유와 상관없이 모두에게 같은 양의 표를 주므로, 득표가 곧 "얼마나 많은 사람이 좋아하는가"를 보여준다고 봅니다. H2는 실제로 팬이 많은 사도가 표도 많이 받는지, 열심인 팬층이 결과를 뒤집지는 않는지 확인합니다.',
  intent: {
    quote: '투표권은 일일 미션과 보스전 시행 횟수로만 지급되어 전 계정이 동일한 투표력을 갖는 … 인기투표 이벤트',
    source: '기획서 p.4 콘텐츠 요약',
  },
  spearman: {
    title: '팬 수와 득표의 순서 일치도',
    question: '팬이 많은 순서와 예선 표를 많이 받은 순서가 얼마나 같은가?',
    intent: { quote: '전 계정이 동일한 투표력을 갖는 … 인기투표', source: '기획서 p.4' },
    how: [
      '사도마다 "최애로 둔 봇 수(팬 수)"를 셉니다.',
      '사도 114명을 팬 수 순으로 한 번, 예선 득표 순으로 한 번 줄 세웁니다.',
      '두 줄이 얼마나 같은 순서인지를 -1 ~ 1 사이 숫자(스피어만 순위 상관)로 나타냅니다. 1이면 순서가 완전히 같고, 0이면 관계가 없고, -1이면 정반대입니다.',
    ],
    criteria: [
      `${C.h2.spearman.pass} 이상이면 "통과": 팬 수 순서가 득표 순서에 거의 그대로 반영됩니다.`,
      `${C.h2.spearman.warn} 이상 ${C.h2.spearman.pass} 미만이면 "주의": 대체로 맞지만 뒤바뀌는 사도가 꽤 있습니다.`,
      `${C.h2.spearman.warn} 미만이면 "실패": 득표가 팬 수를 제대로 보여주지 못합니다.`,
    ],
    criteriaSource: CRITERIA_SOURCE.h2,
  } satisfies MetricText,
  inversion: {
    title: '열성 효과 (순위 뒤집힘)',
    question: '팬은 적은데 표는 더 받은 사도가 얼마나 있나? 그게 열성 팬 때문인가?',
    intent: { quote: '모든 유저에게 동일한 투표력을 지급 … 참여형 지표는 상한에 걸려 차이가 나지 않아 투표를 왜곡하지 않으면서', source: '기획서 p.7' },
    how: [
      `사도 ${DEFAULT_RULES.saintCount}명으로 만들 수 있는 모든 두 명 짝(${won(PAIRS)}쌍)을 봅니다. 팬 수나 득표가 같은 짝은 뺍니다.`,
      '그중 "팬은 적은데 표는 더 받은" 짝, 즉 순위가 뒤집힌 짝의 비율을 셉니다.',
      '뒤집힌 짝마다 표를 더 받은 쪽 사도의 열성도가 더 높은지 봅니다. 그 비율이 50%를 크게 넘으면 "열성 팬층이 결과를 뒤집었다"고 읽을 수 있습니다.',
    ],
    criteria: ['판정 없이 참고용입니다. 위 "순서 일치도"의 판정을 해석하는 근거로 씁니다.'],
    caution: '팬이 적은 사도끼리는 표 차이가 작아서 우연히 뒤집히기도 합니다. 뒤집힘 비율이 낮고 열성 우위도 50% 근처라면 우연에 가깝습니다.',
  } satisfies MetricText,
  match: {
    title: '진출자 일치도',
    question: '팬 수 상위 10명과 실제 본선 진출 10명이 몇 명 겹치나?',
    intent: { quote: '순위가 노출되면 … 유저가 기호가 아닌 당선 가능성으로 투표하게 되어 예선이 실제 선호를 측정하지 못함', source: '기획서 p.11' },
    how: ['팬 수 순으로 상위 10명을 뽑고, 실제 예선 결과 진출한 10명과 겹치는 사도 수를 셉니다.'],
    criteria: [
      `${C.h2.finalistMatch.pass}명 이상 겹치면 "통과"`,
      `${C.h2.finalistMatch.warn}~${C.h2.finalistMatch.pass - 1}명이면 "주의"`,
      `${C.h2.finalistMatch.warn - 1}명 이하이면 "실패"`,
      '진출 인원을 바꾼 설정이면 기준도 같은 비율로 바뀝니다(예: 20명 진출이면 16명 이상 통과).',
    ],
    criteriaSource: CRITERIA_SOURCE.h2,
  } satisfies MetricText,
  reselect: {
    title: '재선택 효과',
    question: '예선 투표 사도를 매일 다시 고르는 대신 처음 고른 사도로 고정하면 진출자가 달라지나?',
    intent: { quote: '매일 투표 사도를 다시 고르고, 그날 획득한 표는 전부 해당 사도에게 귀속', source: '기획서 p.11' },
    how: [
      '같은 시드·같은 봇으로, 예선 재선택만 "고정"으로 바꿔 한 번 더 돌립니다.',
      '두 결과의 진출자가 몇 명 겹치는지, 순서 일치도가 어떻게 달라지는지 봅니다.',
    ],
    criteria: ['판정 없이 참고용입니다. 겹침이 10명이면 이 가정값에서는 재선택 규칙이 진출자에 영향을 주지 않는다는 뜻입니다.'],
  } satisfies MetricText,
};

export const H3_TEXT = {
  title: 'H3. 예선 탈락 유저가 본선에 남는가',
  summary:
    '114명 중 10명만 본선에 가므로, 많은 유저의 최애는 예선에서 떨어집니다. 그 유저들이 이벤트를 떠나 버리면 본선 랭킹판이 비어 갑니다. H3는 최애 탈락이 얼마나 생기는지, 그래도 본선에 남는지, 판이 충분히 채워지는지 확인합니다.',
  intent: {
    quote: '예선과 동일한 구조로 설계해 … 이질감을 없애 예선 참여자의 본선 이탈 방지',
    source: '기획서 p.23',
  },
  eliminated: {
    title: '최애 탈락 비율',
    question: '최애가 본선에 못 간 봇이 유형별로 얼마나 되나?',
    intent: { quote: '전체 사도 114명 중 본선 진출자 10명 추출', source: '기획서 p.10' },
    how: ['본선 시작 시점에 각 봇의 최애(선호 1순위)가 진출 10명 안에 있는지 봅니다.', '유형별로 최애가 탈락한 봇의 비율을 셉니다.'],
    criteria: ['판정 없이 참고용입니다. 이 비율이 높을수록 아래 "본선 이탈률"이 중요해집니다.'],
  } satisfies MetricText,
  dropout: {
    title: '본선 이탈률',
    question: '예선에 참여했던 봇 중 본선에 한 번도 안 온 봇은 얼마나 되나?',
    intent: { quote: '예선 참여자의 본선 이탈 방지', source: '기획서 p.23' },
    how: [
      '예선에서 표를 1표 이상 얻은 봇만 셉니다(본선에 처음 들어온 중도 진입형은 제외).',
      '그중 본선 보스전에 한 번도 들어가지 않은 봇의 비율입니다. 최애 탈락으로 떠난 봇과, 본선 7일 내내 접속하지 않은 봇이 모두 포함됩니다.',
    ],
    criteria: [
      `${pct(C.h3.dropout.pass)} 이하면 "통과"`,
      `${pct(C.h3.dropout.pass)} 초과 ${pct(C.h3.dropout.warn)} 이하면 "주의"`,
      `${pct(C.h3.dropout.warn)}를 넘으면 "실패"`,
    ],
    criteriaSource: CRITERIA_SOURCE.h3,
  } satisfies MetricText,
  density: {
    title: '판 밀도',
    question: '본선 랭킹판이 너무 작아지는 사도는 없나?',
    intent: { quote: '후보를 압축하지 않으면 판당 참여자 밀도가 붕괴할 우려가 있음', source: '기획서 p.11' },
    how: ['본선 10개 판의 참여자 수에서 가장 작은 판 · 중간 판 · 가장 큰 판을 봅니다.', `참여자가 ${C.h3.smallBoardSize}명 미만인 판의 개수를 셉니다. 100위까지 주는 상위권 보상 구간이 다 채워지지 않는 판입니다.`],
    criteria: [
      `${C.h3.smallBoardSize}명 미만 판이 ${C.h3.smallBoards.pass}개면 "통과"`,
      `${C.h3.smallBoards.pass + 1}~${C.h3.smallBoards.warn}개면 "주의"`,
      `${C.h3.smallBoards.warn + 1}개 이상이면 "실패"`,
    ],
    criteriaSource: CRITERIA_SOURCE.h3,
  } satisfies MetricText,
  sensitivity: {
    title: '진출 인원 민감도',
    question: '본선 진출 인원을 5·10·15·20명으로 바꾸면 위 수치가 어떻게 달라지나?',
    intent: { quote: '본선 진출 10명 … 전체 사도의 약 9%', source: '기획서 p.4' },
    how: ['같은 시드·같은 봇으로 진출 인원만 바꿔 각각 돌립니다.', '진출 인원이 늘면 최애 탈락은 줄지만 판이 잘게 나뉘어 작아집니다. 그 균형점을 봅니다.'],
    criteria: [`판정 없이 비교용입니다. 표에서 ${C.h3.smallBoardSize}명 미만 판이 생기기 시작하는 진출 인원이 "판 밀도 붕괴"가 시작되는 지점입니다.`],
  } satisfies MetricText,
};

export const AUX_TEXT = {
  title: '보조 지표',
  daily: {
    title: '일차별 참여율',
    question: '매일 몇 %의 봇이 접속했나?',
    intent: { quote: '이월 없는 투표 … 매일 접속해야 할 이유를 추가로 제공', source: '기획서 p.8' },
    how: ['그날 참여할 수 있는 봇(진입 완료, 본선 이탈 전) 중 실제로 접속한 비율입니다.'],
    criteria: ['판정 없이 참고용입니다. 지금 봇은 접속률 가정값에 따라 움직이므로, 이월 없음 규칙이 접속을 늘리는 효과까지는 흉내 내지 않습니다.'],
  } satisfies MetricText,
  late: {
    title: '중도 진입 봇의 획득 표 비율',
    question: '늦게 들어온 봇은 처음부터 참여한 봇에 비해 표를 얼마나 얻었나?',
    intent: { quote: '기간 중 중도 참여 시 잔여 기간만큼 기준대로 표를 제공 · 미참여 기간의 투표권은 소멸', source: '기획서 p.10' },
    how: ['중도 진입 봇 1명이 얻은 평균 표(예선+본선)를, 처음부터 참여한 봇 1명이 얻은 평균 표로 나눕니다.', '예선 중에 들어온 봇과 본선에 처음 들어온 봇을 나눠 봅니다.'],
    criteria: ['판정 없이 참고용입니다. 50%면 처음부터 참여한 봇의 절반쯤을 얻었다는 뜻입니다.'],
  } satisfies MetricText,
  gini: {
    title: '득표 쏠림 정도 (지니계수)',
    question: '표가 소수 사도에게 얼마나 몰렸나?',
    intent: { quote: '전체 유저를 타겟으로 잡아, 특정 유저층만 참여하지 않도록', source: '기획서 p.4' },
    how: ['0이면 모든 사도가 똑같이 받았고, 1에 가까울수록 한 사도가 거의 다 가져갔다는 뜻입니다.', '예선(114명)과 본선(진출자)을 따로 계산합니다.'],
    criteria: ['판정 없이 참고용입니다. 인기 분포 가정값(Zipf)이 쏠려 있으면 지니계수도 높게 나옵니다.'],
  } satisfies MetricText,
};

export const SCENARIO_BUTTON = { label: '시나리오 비교', note: 'M5에서 제공 예정' };
