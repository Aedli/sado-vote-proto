// 보상 지급 판정 (SPEC §6, 부록 B11)

import type { DealTier, RewardValueConfig, SaintRankReward } from '../config/rewards';

/** 딜링 구간 판정. 위에서부터 순서대로 보고 가장 먼저 해당하는 구간을 준다 */
export function dealTierFor(rank: number, boardSize: number, tiers: DealTier[]): DealTier {
  for (const tier of tiers) {
    const c = tier.condition;
    if (c.kind === 'rank' && rank <= c.maxRank) return tier;
    if (c.kind === 'percentile' && rank <= Math.ceil(boardSize * c.topRatio)) return tier;
    if (c.kind === 'participation') return tier;
  }
  return tiers[tiers.length - 1];
}

/** 보상 가치 환산 (명예 점수 + 엘리프 + 골드) */
export function dealTierValue(tier: DealTier, value: RewardValueConfig): number {
  return tier.honorValue + tier.elif / value.elifPerPoint + tier.gold / value.goldPerPoint;
}

/** 사도 순위 보상 구간. 해당 없으면 null */
export function saintRewardFor(rank: number, table: SaintRankReward[]): SaintRankReward | null {
  if (rank < 1) return null;
  return table.find((r) => rank <= r.maxRank) ?? null;
}
