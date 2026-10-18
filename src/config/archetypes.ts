// 봇(가상 유저) 유형과 시뮬레이션 가정값 (SPEC §7, 부록 B). 여기 있는 값은 모두 실제 데이터가 아닌 "가정값"이다.

import type { SpecTier } from './rules';

export const ARCHETYPE_IDS = ['devoted', 'light', 'multi', 'optimizer', 'routine', 'late'] as const;
export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

/** 최애가 예선에서 탈락했을 때의 분기 확률. null이면 "영향 없음" */
export interface EliminationBranch {
  leave: number;
  nextFavorite: number;
  popular: number;
}

export interface ArchetypeConfig {
  id: ArchetypeId;
  label: string;
  ratio: number;
  connectRate: number;
  missionRate: number;
  /** 예선 투표 방식 */
  prelimChoice: 'favorite' | 'mostlyFavorite' | 'rotate' | 'popularTop';
  /** mostlyFavorite일 때 최애를 고를 확률 (나머지는 선호 2·3순위 균등) */
  favoriteProb: number;
  /** 본선 사도 선택 방식 */
  finalChoice: 'favorite' | 'bestSurviving' | 'optimize' | 'popular';
  /** 본선 도전 방식: 'retry' = 1회 도전 후 2·3회차를 확률적으로 재도전(아니면 소탕), 'sweep' = 1회 도전 후 소탕 */
  finalPlay: 'retry' | 'sweep';
  retryProb: number;
  onFavoriteEliminated: EliminationBranch | null;
  /** 순위 공개 시나리오에서 사표 회피로 표를 옮길 확률 (§7.5) */
  strategicSwitch: number;
}

export interface SaintDistributionConfig {
  zipfS: number;
  fervorSigma: number;
  fervorMin: number;
  fervorMax: number;
}

export interface LateEntryConfig {
  /** 예선 진입 일차 범위 [시작, 끝] (예선 일차) */
  prelimEntryDays: [number, number];
  /** 본선에 처음 진입하는 비율 */
  finalEntryShare: number;
  /** 본선 진입 일차 범위 [시작, 끝] (본선 일차) */
  finalEntryDays: [number, number];
  /** 진입 후 접속률 (진입 당일은 반드시 접속) */
  connectRateAfterEntry: number;
  /** 본선 진입 late의 최애가 진출자일 확률. null = 자연 발생(부록 B10) */
  favoriteSurvivedRate: number | null;
}

export interface PopulationConfig {
  archetypes: Record<ArchetypeId, ArchetypeConfig>;
  specDistribution: Record<SpecTier, number>;
  /** optimizer가 보상을 얼마나 신경 쓰는지 0~1 (부록 B5) */
  rewardSensitivity: number;
  /** 선호 1·2·3순위 애정 점수 (부록 B5) */
  preferenceBonus: number[];
  /** 인식 인기도 오차 σ (§7.4) */
  perceptionSigma: number;
  /** 열성도 보정 (부록 B6) */
  fervorBonus: { perUnit: number; cap: number; mode: 'upOnly' | 'both' };
  preferenceCount: number;
  /** multi 순환 목록 길이 범위 */
  multiRotation: [number, number];
  /** routine 예선에서 "인기 상위"로 보는 사도 수 (부록 B8) */
  routinePrelimTopN: number;
  /** 차선 최애 분기인데 살아남은 선호 사도가 없을 때 (부록 B7) */
  noSurvivingPreference: 'popular' | 'leave';
  late: LateEntryConfig;
  saints: SaintDistributionConfig;
}

export const DEFAULT_ARCHETYPES: Record<ArchetypeId, ArchetypeConfig> = {
  devoted: {
    id: 'devoted', label: '열성 최애형', ratio: 0.15, connectRate: 0.95, missionRate: 0.95,
    prelimChoice: 'favorite', favoriteProb: 1, finalChoice: 'favorite', finalPlay: 'retry', retryProb: 0.6,
    onFavoriteEliminated: { leave: 0.3, nextFavorite: 0.7, popular: 0 }, strategicSwitch: 0.1,
  },
  light: {
    id: 'light', label: '라이트 팬형', ratio: 0.3, connectRate: 0.55, missionRate: 0.6,
    prelimChoice: 'mostlyFavorite', favoriteProb: 0.85, finalChoice: 'favorite', finalPlay: 'sweep', retryProb: 0,
    onFavoriteEliminated: { leave: 0.5, nextFavorite: 0.3, popular: 0.2 }, strategicSwitch: 0.35,
  },
  multi: {
    id: 'multi', label: '다최애 분산형', ratio: 0.15, connectRate: 0.75, missionRate: 0.85,
    prelimChoice: 'rotate', favoriteProb: 1, finalChoice: 'bestSurviving', finalPlay: 'sweep', retryProb: 0,
    onFavoriteEliminated: { leave: 0.1, nextFavorite: 0.9, popular: 0 }, strategicSwitch: 0.35,
  },
  optimizer: {
    id: 'optimizer', label: '보상 최적화형', ratio: 0.1, connectRate: 0.85, missionRate: 0.9,
    prelimChoice: 'favorite', favoriteProb: 1, finalChoice: 'optimize', finalPlay: 'sweep', retryProb: 0,
    onFavoriteEliminated: null, strategicSwitch: 0.35,
  },
  routine: {
    id: 'routine', label: '루틴 무관심형', ratio: 0.2, connectRate: 0.7, missionRate: 0.8,
    prelimChoice: 'popularTop', favoriteProb: 1, finalChoice: 'popular', finalPlay: 'sweep', retryProb: 0,
    onFavoriteEliminated: null, strategicSwitch: 0.35,
  },
  // 예선·본선 행동과 탈락 분기는 라이트 팬형과 동일 (§7.1)
  late: {
    id: 'late', label: '중도 진입형', ratio: 0.1, connectRate: 0.7, missionRate: 0.7,
    prelimChoice: 'mostlyFavorite', favoriteProb: 0.85, finalChoice: 'favorite', finalPlay: 'sweep', retryProb: 0,
    onFavoriteEliminated: { leave: 0.5, nextFavorite: 0.3, popular: 0.2 }, strategicSwitch: 0.35,
  },
};

export const DEFAULT_POPULATION: PopulationConfig = {
  archetypes: DEFAULT_ARCHETYPES,
  specDistribution: { high: 0.2, mid: 0.5, low: 0.3 },
  rewardSensitivity: 0.7,
  preferenceBonus: [1.0, 0.6, 0.3],
  perceptionSigma: 0.3,
  fervorBonus: { perUnit: 0.1, cap: 0.98, mode: 'upOnly' },
  preferenceCount: 3,
  multiRotation: [2, 4],
  routinePrelimTopN: 20,
  noSurvivingPreference: 'popular',
  late: {
    prelimEntryDays: [3, 6],
    finalEntryShare: 0.3,
    finalEntryDays: [1, 3],
    connectRateAfterEntry: 0.7,
    favoriteSurvivedRate: null,
  },
  saints: { zipfS: 1.0, fervorSigma: 0.25, fervorMin: 0.6, fervorMax: 1.8 },
};

export interface RunConfig {
  seed: number;
  botCount: number;
}

export const DEFAULT_RUN: RunConfig = { seed: 20261018, botCount: 10_000 };
