// 검증 지표 판정 기준 (SPEC §9, 부록 B17~B18)
// h1은 명세서 기준, h2·h3는 M2 착수 시 기획자가 승인한 "제안 기준"이다.

export interface CriteriaConfig {
  h1: {
    /** 판별 보상 가치 격차가 참가상 가치의 이 비율 이상이면 '주의' */
    warnGapRatio: number;
    /** 판에 따라 딜링 구간이 이 단계 이상 바뀌면 '실패' */
    failTierSteps: number;
  };
  h2: {
    /** 팬 수 vs 예선 득표 스피어만 상관: pass 이상 통과, warn 이상 주의, 그 미만 실패 */
    spearman: { pass: number; warn: number };
    /** 팬 수 상위 N명과 실제 진출자의 교집합 수: pass 이상 통과, warn 이상 주의 */
    finalistMatch: { pass: number; warn: number };
  };
  h3: {
    /** 예선 참여자 중 본선 미참여 비율: pass 이하 통과, warn 이하 주의, 초과 실패 */
    dropout: { pass: number; warn: number };
    /** 이 인원 미만인 판을 "작은 판"으로 센다 */
    smallBoardSize: number;
    /** 작은 판 개수: pass 이하 통과, warn 이하 주의, 초과 실패 */
    smallBoards: { pass: number; warn: number };
  };
  /** 진출 인원 민감도에서 비교할 진출 인원 */
  sensitivityFinalists: number[];
}

export const DEFAULT_CRITERIA: CriteriaConfig = {
  h1: { warnGapRatio: 0.2, failTierSteps: 2 },
  h2: { spearman: { pass: 0.9, warn: 0.7 }, finalistMatch: { pass: 8, warn: 6 } },
  h3: { dropout: { pass: 0.3, warn: 0.5 }, smallBoardSize: 100, smallBoards: { pass: 0, warn: 2 } },
  sensitivityFinalists: [5, 10, 15, 20],
};

/** 기준의 출처 표시 */
export const CRITERIA_SOURCE = {
  h1: '명세서 기준',
  h2: '제안 기준 (기획자 승인, 조정 가능)',
  h3: '제안 기준 (기획자 승인, 조정 가능)',
} as const;
