// 시나리오 비교 설정 (SPEC §10, 부록 B31). 규칙은 기본 시나리오에서 고르기만 하고, 가정값과 판정 기준만 바꿀 수 있다.

import type { SimConfig } from '.';
import type { CriteriaConfig } from './criteria';

export const SCENARIO_PRESET_IDS = ['original', 'unified', 'public', 'finalists20', 'fixedPrelim'] as const;
export type ScenarioPresetId = (typeof SCENARIO_PRESET_IDS)[number];

export interface ScenarioPreset {
  id: ScenarioPresetId;
  label: string;
  /** 원안과 무엇이 다른지 한 줄 */
  change: string;
  /** 이 시나리오로 무엇을 확인하나 */
  checks: string;
  apply: (c: SimConfig) => void;
}

export const SCENARIO_PRESETS: Record<ScenarioPresetId, ScenarioPreset> = {
  original: {
    id: 'original',
    label: '기획서 원안',
    change: '기획서 규칙 그대로 (예선 순위 비공개, 매일 재선택, 진출 10명, 사도별 랭킹판)',
    checks: '다른 시나리오와 비교할 기준선입니다.',
    apply: () => {},
  },
  unified: {
    id: 'unified',
    label: '통합 랭킹판',
    change: '본선 딜링 순위를 사도별로 나누지 않고 전체 한 판으로 겨룸',
    checks: '판을 하나로 합치면 "판 선택에 따른 보상 차이(H1)"가 사라지는 대신 무엇을 잃는지 봅니다.',
    apply: (c) => {
      c.rules.final.boardMode = 'unified';
    },
  },
  public: {
    id: 'public',
    label: '순위 공개',
    change: '예선 순위를 매일 공개하고, 봇은 응원 사도가 진출권 밖이면 표를 옮기기도 함',
    checks: '기획서가 순위를 비공개로 한 이유("사표 회피로 선호 측정이 왜곡된다", H2)가 맞는지 봅니다.',
    apply: (c) => {
      c.rules.prelim.rankingVisibility = 'public';
    },
  },
  finalists20: {
    id: 'finalists20',
    label: '진출 20명',
    change: '본선 진출 인원을 10명에서 20명으로 늘림',
    checks: '최애 탈락이 줄어드는 대신 판이 잘게 나뉘어 작아지는지(H3) 봅니다.',
    apply: (c) => {
      c.rules.prelim.finalistCount = 20;
    },
  },
  fixedPrelim: {
    id: 'fixedPrelim',
    label: '예선 사도 고정',
    change: '예선에서 처음 고른 사도로 7일 내내 투표 (매일 재선택 없음)',
    checks: '"매일 다시 고르기" 규칙이 진출자와 득표 분포를 바꾸는지(H2 재선택 효과) 봅니다.',
    apply: (c) => {
      c.rules.prelim.reselect = 'fixed';
    },
  },
};

/** 처음 열었을 때의 시나리오 (명세서 §10 기본 프리셋) */
export const DEFAULT_SCENARIO_PRESETS: ScenarioPresetId[] = ['original', 'unified', 'public', 'finalists20'];
export const MAX_SCENARIOS = 4;

export interface CompareRunConfig {
  seed: number;
  botCount: number;
  repeats: number;
}

export const DEFAULT_COMPARE_RUN: CompareRunConfig = { seed: 20261018, botCount: 10_000, repeats: 20 };
export const COMPARE_LIMITS = { botMin: 1000, botMax: 50_000, repeatMin: 1, repeatMax: 50 };

// ───────── 판정 기준 입력칸 (부록 B19, B31) ─────────

export interface CriteriaField {
  id: string;
  group: 'h1' | 'h2' | 'h3';
  label: string;
  desc: string;
  kind: 'percent' | 'number' | 'int';
  min: number;
  max: number;
  step: number;
  get: (c: CriteriaConfig) => number;
  set: (c: CriteriaConfig, v: number) => void;
}

export const CRITERIA_FIELDS: CriteriaField[] = [
  { id: 'h1.warnGapRatio', group: 'h1', label: 'H1 주의: 보상 격차', desc: '판에 따른 보상 차이가 참가상 점수의 이 비율 이상이면 주의', kind: 'percent', min: 0, max: 1, step: 0.01, get: (c) => c.h1.warnGapRatio, set: (c, v) => (c.h1.warnGapRatio = v) },
  { id: 'h1.failTierSteps', group: 'h1', label: 'H1 실패: 구간 변화', desc: '판에 따라 보상 구간이 이 칸 수 이상 바뀌면 실패', kind: 'int', min: 1, max: 6, step: 1, get: (c) => c.h1.failTierSteps, set: (c, v) => (c.h1.failTierSteps = v) },
  { id: 'h2.spearman.pass', group: 'h2', label: 'H2 순서 일치도 통과', desc: '이 값 이상이면 통과', kind: 'number', min: 0, max: 1, step: 0.01, get: (c) => c.h2.spearman.pass, set: (c, v) => (c.h2.spearman.pass = v) },
  { id: 'h2.spearman.warn', group: 'h2', label: 'H2 순서 일치도 주의', desc: '이 값 이상이면 주의, 미만이면 실패', kind: 'number', min: 0, max: 1, step: 0.01, get: (c) => c.h2.spearman.warn, set: (c, v) => (c.h2.spearman.warn = v) },
  { id: 'h2.finalistMatch.pass', group: 'h2', label: 'H2 진출자 일치 통과 (10명 기준)', desc: '이 인원 이상 겹치면 통과', kind: 'int', min: 0, max: 10, step: 1, get: (c) => c.h2.finalistMatch.pass, set: (c, v) => (c.h2.finalistMatch.pass = v) },
  { id: 'h2.finalistMatch.warn', group: 'h2', label: 'H2 진출자 일치 주의 (10명 기준)', desc: '이 인원 이상이면 주의, 미만이면 실패', kind: 'int', min: 0, max: 10, step: 1, get: (c) => c.h2.finalistMatch.warn, set: (c, v) => (c.h2.finalistMatch.warn = v) },
  { id: 'h3.dropout.pass', group: 'h3', label: 'H3 본선 이탈률 통과', desc: '이 비율 이하면 통과', kind: 'percent', min: 0, max: 1, step: 0.01, get: (c) => c.h3.dropout.pass, set: (c, v) => (c.h3.dropout.pass = v) },
  { id: 'h3.dropout.warn', group: 'h3', label: 'H3 본선 이탈률 주의', desc: '이 비율 이하면 주의, 넘으면 실패', kind: 'percent', min: 0, max: 1, step: 0.01, get: (c) => c.h3.dropout.warn, set: (c, v) => (c.h3.dropout.warn = v) },
  { id: 'h3.smallBoardSize', group: 'h3', label: 'H3 작은 판 기준 인원', desc: '참여자가 이 인원 미만이면 "작은 판"', kind: 'int', min: 1, max: 1000, step: 10, get: (c) => c.h3.smallBoardSize, set: (c, v) => (c.h3.smallBoardSize = v) },
  { id: 'h3.smallBoards.pass', group: 'h3', label: 'H3 작은 판 개수 통과', desc: '작은 판이 이 개수 이하면 통과', kind: 'int', min: 0, max: 20, step: 1, get: (c) => c.h3.smallBoards.pass, set: (c, v) => (c.h3.smallBoards.pass = v) },
  { id: 'h3.smallBoards.warn', group: 'h3', label: 'H3 작은 판 개수 주의', desc: '이 개수 이하면 주의, 넘으면 실패', kind: 'int', min: 0, max: 20, step: 1, get: (c) => c.h3.smallBoards.warn, set: (c, v) => (c.h3.smallBoards.warn = v) },
];

// ───────── 비교 화면 쉬운 설명 ─────────

export const COMPARE_INTRO = [
  '여기서는 규칙이나 봇 가정값이 다른 시나리오를 최대 4개 만들어, 같은 조건으로 여러 번 돌린 결과를 나란히 비교합니다.',
  '규칙은 직접 고치지 않고 기본 시나리오(기획서 원안, 통합 랭킹판, 순위 공개, 진출 20명, 예선 사도 고정) 중에서 고릅니다. 시나리오마다 봇 가정값은 따로 바꿀 수 있습니다.',
  '결과표는 지표마다 "평균 ± 흔들림 폭", 평균 기준 판정, 그리고 반복한 횟수 중 통과·주의·실패가 몇 번 나왔는지를 보여 줍니다.',
  '모든 시나리오는 같은 세상(시드)들에서 돌아가므로, 결과 차이는 규칙·가정값 차이에서만 생깁니다.',
  '판정 기준은 이 화면에서 바꿀 수 있고, 모든 시나리오에 똑같이 적용됩니다. 단일 검증 리포트의 기준은 바뀌지 않습니다.',
];
