// 규칙 상수 (SPEC §3, §4, §5, 부록 B). 기획자 패널(M5)에서 덮어쓸 수 있도록 값 객체로 둔다.

export const PERSONALITIES = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
export type Personality = (typeof PERSONALITIES)[number];

export const SPEC_TIERS = ['high', 'mid', 'low'] as const;
export type SpecTier = (typeof SPEC_TIERS)[number];

/** 딜링 랭킹판 방식 (§4, §10). 'perSaintPercentile'은 M5에서 정의 확정 후 구현 */
export type BoardMode = 'perSaint' | 'unified';

export interface PrelimRules {
  days: number;
  missionCount: number;
  votesPerMission: number;
  finalistCount: number;
  /** 'daily' = 매일 초기화(원안), 'fixed' = 첫 선택 고정(H2 비교용) */
  reselect: 'daily' | 'fixed';
  /** 'hidden' = 전면 비공개(원안), 'public' = 공개(§7.5 대조군) */
  rankingVisibility: 'hidden' | 'public';
  /** 순위 공개 시 봇이 "진출권"으로 인식하는 여유 순위 (§7.5: 상위 10위 + 여유 5위) */
  publicZoneMargin: number;
}

export interface FinalRules {
  days: number;
  entriesPerDay: number;
  votesPerEntry: number;
  /** 본선 1~5일차 보스 성격 순서 (부록 B2) */
  bossRotation: Personality[];
  /** 유저가 보스 성격을 고르는 본선 일차 (1부터). 이 날들끼리는 서로 다른 성격만 가능 */
  bossChoiceDays: number[];
  boardMode: BoardMode;
}

export interface DamageRules {
  basePower: Record<SpecTier, number>;
  /** 육성 성격 개수 범위 [최소, 최대] (균등 랜덤) */
  trainedCount: Record<SpecTier, [number, number]>;
  affinityMatch: number;
  affinityMismatch: number;
  skillMean: number;
  skillSd: number;
  skillMin: number;
  skillMax: number;
  noiseSigma: number;
}

export interface RulesConfig {
  saintCount: number;
  personalityNames: Record<Personality, string>;
  missionNames: string[];
  prelim: PrelimRules;
  final: FinalRules;
  damage: DamageRules;
}

export const DEFAULT_RULES: RulesConfig = {
  saintCount: 114,
  personalityNames: { P1: '순수', P2: '냉정', P3: '광기', P4: '활발', P5: '우울' },
  missionNames: [
    '일일 접속 1회',
    '세계수 성물 자원 수령 1회',
    '상점에서 아이템 구매 2회',
    '왕사탕 100개 소모',
    '별사탕 100개 소모',
    '배틀젬 수령 1회',
    '스케줄 보내기 2회',
    '교단 펫 선물 수령 1회',
    '일일 던전 1회 클리어',
  ],
  prelim: {
    days: 7,
    missionCount: 9,
    votesPerMission: 3,
    finalistCount: 10,
    reselect: 'daily',
    rankingVisibility: 'hidden',
    publicZoneMargin: 5,
  },
  final: {
    days: 7,
    entriesPerDay: 3,
    votesPerEntry: 9,
    bossRotation: ['P1', 'P2', 'P3', 'P4', 'P5'],
    bossChoiceDays: [6, 7],
    boardMode: 'perSaint',
  },
  damage: {
    basePower: { high: 1_000_000, mid: 550_000, low: 200_000 },
    trainedCount: { high: [3, 5], mid: [2, 4], low: [1, 2] },
    affinityMatch: 1.0,
    affinityMismatch: 0.55,
    skillMean: 1.0,
    skillSd: 0.07,
    skillMin: 0.8,
    skillMax: 1.2,
    noiseSigma: 0.08,
  },
};

/** 플레이어 기본 계정 설정 (§5) */
export const DEFAULT_PLAYER_ACCOUNT = {
  spec: 'mid' as SpecTier,
  trained: ['P1', 'P2'] as Personality[],
};
