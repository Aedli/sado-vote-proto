// 보상 테이블 (SPEC §6, 부록 B11)

export interface SaintRankReward {
  id: string;
  label: string;
  /** 이 구간의 마지막 순위 (위에서부터 판정) */
  maxRank: number;
  skin: string | null;
  extras: string[];
}

export const SAINT_RANK_REWARDS: SaintRankReward[] = [
  {
    id: 'saint1',
    label: '1위',
    maxRank: 1,
    skin: '고등급 스킨 제작 확정',
    extras: ['사도 테마 수집품 1점 전체 지급', '연회장 커뮤니케이션', '로비 보이스'],
  },
  {
    id: 'saint2_3',
    label: '2~3위',
    maxRank: 3,
    skin: '스킨 제작 확정',
    extras: ['사도 테마 수집품 1점 전체 지급', '연회장 커뮤니케이션'],
  },
  {
    id: 'saint4_10',
    label: '4~10위',
    maxRank: 10,
    skin: null,
    extras: ['사도 테마 수집품 1점 전체 지급'],
  },
];

/** 딜링 구간 조건. 위에서부터 순서대로 판정하고 가장 먼저 해당하는 구간을 준다 */
export type DealTierCondition =
  | { kind: 'rank'; maxRank: number }
  /** rank ≤ ceil(N × topRatio) */
  | { kind: 'percentile'; topRatio: number }
  /** 1회 이상 참여한 모두 */
  | { kind: 'participation' };

export interface DealTier {
  id: string;
  label: string;
  condition: DealTierCondition;
  nameplate: string;
  elif: number;
  goldenCrayon: number;
  gold: number;
  /** 명예 보상 가치 점수 (§6.2 환산) */
  honorValue: number;
}

export const DEAL_TIERS: DealTier[] = [
  { id: 'rank1', label: '1위', condition: { kind: 'rank', maxRank: 1 }, nameplate: '1위 배경·테두리', elif: 1000, goldenCrayon: 10, gold: 3_000_000, honorValue: 100 },
  { id: 'rank2', label: '2위', condition: { kind: 'rank', maxRank: 2 }, nameplate: '2위 배경·테두리', elif: 900, goldenCrayon: 10, gold: 2_500_000, honorValue: 80 },
  { id: 'rank3', label: '3위', condition: { kind: 'rank', maxRank: 3 }, nameplate: '3위 배경·테두리', elif: 800, goldenCrayon: 10, gold: 2_000_000, honorValue: 70 },
  { id: 'top10', label: '4~10위', condition: { kind: 'rank', maxRank: 10 }, nameplate: '10위권 배경·테두리', elif: 700, goldenCrayon: 10, gold: 1_500_000, honorValue: 50 },
  { id: 'top100', label: '11~100위', condition: { kind: 'rank', maxRank: 100 }, nameplate: '상위권 배경·테두리', elif: 700, goldenCrayon: 10, gold: 1_200_000, honorValue: 30 },
  { id: 'top50pct', label: '상위 50%', condition: { kind: 'percentile', topRatio: 0.5 }, nameplate: '중위권 배경·테두리', elif: 600, goldenCrayon: 10, gold: 1_000_000, honorValue: 10 },
  { id: 'participation', label: '참가상', condition: { kind: 'participation' }, nameplate: '참가 기념 테두리', elif: 500, goldenCrayon: 10, gold: 1_000_000, honorValue: 0 },
];

/** 보상 가치 환산 (§6.2). 황금 크레파스는 모든 구간이 동일(10)해 격차에 영향이 없으므로 환산하지 않는다 */
export interface RewardValueConfig {
  elifPerPoint: number;
  goldPerPoint: number;
}

export const DEFAULT_REWARD_VALUE: RewardValueConfig = {
  elifPerPoint: 1,
  goldPerPoint: 100_000,
};

export interface RewardsConfig {
  saintRank: SaintRankReward[];
  dealTiers: DealTier[];
  value: RewardValueConfig;
}

export const DEFAULT_REWARDS: RewardsConfig = {
  saintRank: SAINT_RANK_REWARDS,
  dealTiers: DEAL_TIERS,
  value: DEFAULT_REWARD_VALUE,
};
