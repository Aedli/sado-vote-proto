// 쉬운 설명 문장 (부록 B13). 화면에서는 각 단계 최초 진입 시 팝업으로 1회, 이후 ? 버튼으로 다시 보여준다.
// 통계 지식 없이 읽을 수 있도록 "한 줄 요약 → 예시 → 왜 필요한가" 순서로 쓴다. 공식은 formula에만 둔다.

export interface HelpEntry {
  title: string;
  summary: string;
  example: string;
  why: string;
  formula?: string;
}

export const ASSUMPTION_HELP = {
  assumption: {
    title: '가정값이란?',
    summary: '실제 유저 데이터가 아니라, 시뮬레이션을 돌리기 위해 기획자가 짐작해서 넣은 숫자입니다.',
    example: '"라이트 팬은 하루에 55%가 접속한다"는 실제로 측정한 값이 아니라 그럴 것이라는 가정입니다.',
    why: '가정값을 바꿔 가며 돌려 보면, 가정이 조금 틀려도 기획 의도가 유지되는지 확인할 수 있습니다.',
  },
  connectRate: {
    title: '접속률',
    summary: '그 유형의 봇이 하루에 접속할 가능성입니다.',
    example: '접속률 0.55는 라이트 팬 100명 중 매일 약 55명이 들어온다는 뜻입니다. 누가 들어올지는 매일 제비뽑기처럼 정해집니다.',
    why: '접속하지 않은 날의 표는 사라지므로(이월 없음), 접속률이 곧 그 팬층의 실제 투표량이 됩니다.',
  },
  missionRate: {
    title: '미션 수행률',
    summary: '접속한 날 미션 하나하나를 해낼 가능성입니다.',
    example: '수행률 0.6이면 미션 9개 중 평균 5~6개를 하고 들어갑니다. 미션 하나당 3표입니다.',
    why: '같은 날 접속해도 얼마나 열심히 하느냐에 따라 표가 달라지는 것을 흉내 냅니다.',
  },
  fervor: {
    title: '열성도',
    summary: '사도마다 붙어 있는 "그 사도 팬들이 얼마나 열심인가" 점수입니다. 1.0이 보통입니다.',
    example: '열성도 1.8짜리 사도를 최애로 둔 라이트 팬은 접속률이 55%에서 63%로 올라갑니다. 팬 100명·열성도 1.8인 사도 X가 팬 110명·열성도 1.0인 사도 Y보다 매일 더 많은 팬이 투표하러 와서, 표는 X가 더 받을 수 있습니다.',
    why: '"팬이 많은 사도가 표도 많이 받는가"를 확인하기 위한 장치입니다. 열성도는 인기(팬 수)와 따로 정해지고, 1보다 낮아도 접속률을 깎지는 않습니다.',
    formula: '보정 접속률 = min(0.98, 원래 접속률 + 0.1 × max(0, 열성도 − 1))',
  },
  popularity: {
    title: '인기도',
    summary: '사도마다 팬이 얼마나 많은지를 나타내는 값입니다. 소수의 사도가 큰 인기를 차지하고 대부분은 팬이 적습니다.',
    example: '1등 인기 사도는 2등의 약 2배, 10등의 약 10배 팬을 가집니다. 어느 사도가 몇 등 인기일지는 시드마다 무작위로 정해집니다.',
    why: '현실의 인기투표처럼 쏠림이 있는 상황에서도 규칙이 잘 작동하는지 보기 위해서입니다.',
    formula: 'k등 사도의 인기 비중 ∝ 1 / k^s (s = 1.0)',
  },
  perceivedPopularity: {
    title: '인식 인기도',
    summary: '봇이 "이 사도가 얼마나 인기 있을까"를 짐작한 값입니다. 실제 순위는 비공개라서 커뮤니티 체감으로 짐작하고, 그 짐작은 틀릴 수 있습니다.',
    example: '실제로는 3등 인기 사도인데 어떤 봇은 1등이라고, 다른 봇은 6등쯤이라고 생각할 수 있습니다.',
    why: '보상 최적화형이 판을 고를 때, 그리고 유명한 사도를 고를 때 이 짐작을 씁니다.',
    formula: '인식 인기도 = 인기도 × LogNormal(0, 0.3), 봇마다 1회 고정',
  },
  rewardSensitivity: {
    title: '보상 민감도',
    summary: '보상 최적화형 봇이 사도를 고를 때 보상을 얼마나 신경 쓰는지 나타내는 다이얼입니다. 0이면 애정만, 1이면 보상만 봅니다.',
    example: '최애 A는 1등 인기라서 판이 북적일 것 같고, B는 한산해 보입니다. 민감도 0.7이면 "A를 좋아하지만 너무 붐빈다"며 B로 옮기고, 0.3이면 "그래도 A가 좋다"며 A에 남습니다.',
    why: '보상을 노리고 판을 옮긴 봇이 실제로 이득을 보는지 확인합니다. 이득이 거의 없다면 "보상이 사도 선택을 왜곡하지 않는다"는 기획 의도가 맞는 것입니다.',
    formula: '비용 = 붐빔 정도 × 민감도 − 애정 점수 × (1 − 민감도), 비용이 가장 낮은 사도 선택',
  },
  favoriteEliminated: {
    title: '최애가 예선 탈락했을 때',
    summary: '최애가 본선에 못 가면 유형마다 그만두거나, 다음으로 좋아하던 사도를 응원하거나, 유명한 사도를 응원합니다.',
    example: '열성 최애형은 30%가 그만두고 70%는 2·3번째로 좋아하던 사도로 옮깁니다. 좋아하던 사도가 전부 떨어졌다면 유명한 사도를 응원합니다.',
    why: '"예선에서 최애가 떨어진 유저도 본선에 남는가"를 확인하기 위한 가정입니다.',
  },
  routine: {
    title: '루틴 무관심형',
    summary: '특정 사도에 애착이 없어 유명한 사도에게 표를 주는 봇입니다.',
    example: '예선에서는 인기 상위 20명 중 인기 많은 사도일수록 잘 뽑히는 제비뽑기로 매일 새로 고르고, 본선에서는 진출자 10명 중 같은 방식으로 한 번 고릅니다.',
    why: '모두가 1등 인기 사도만 고르면 한 판에 수천 명이 몰리는 비현실적인 결과가 나오므로, 인기에 비례해 흩어지게 했습니다.',
  },
  lateEntry: {
    title: '중도 진입형',
    summary: '이벤트 도중에 들어오는 봇입니다. 70%는 예선 3~6일차, 30%는 본선 1~3일차에 처음 들어옵니다.',
    example: '본선에 처음 들어온 봇의 최애가 본선에 남아 있는지는 실제 예선 결과로 정해집니다. 인기 사도를 좋아하던 봇일수록 최애가 남아 있을 가능성이 큽니다.',
    why: '이월 없음·중도 참여 규칙이 늦게 온 유저에게 어떤 영향을 주는지 확인합니다.',
  },
} satisfies Record<string, HelpEntry>;

export type HelpKey = keyof typeof ASSUMPTION_HELP;

/** 단계 최초 진입 시 팝업으로 보여줄 설명 묶음 (M2~M5 화면에서 사용) */
export const STAGE_INTRO_HELP: Record<string, { title: string; keys: HelpKey[] }> = {
  report: { title: '검증 리포트 읽는 법', keys: ['assumption', 'popularity', 'fervor', 'rewardSensitivity'] },
  plannerPanel: { title: '기획자 패널의 가정값', keys: ['assumption', 'connectRate', 'missionRate', 'fervor', 'perceivedPopularity', 'rewardSensitivity'] },
  prelimSide: { title: '예선 데이터 보는 법', keys: ['assumption', 'popularity', 'fervor', 'routine', 'lateEntry'] },
  finalSide: { title: '본선 데이터 보는 법', keys: ['favoriteEliminated', 'rewardSensitivity', 'perceivedPopularity'] },
};
