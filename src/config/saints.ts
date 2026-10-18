// 사도 표시 데이터 (SPEC §2). 실제 내용은 saints.json에서 교체한다.
import type { Personality } from './rules';
import saintsJson from './saints.json';

export interface SaintData {
  id: string;
  name: string;
  title: string;
  personality: Personality;
  image?: string | null;
  lines: {
    prelimSelect: string;
    missionIdle: string;
    finalSelect: string;
    victory: string;
  };
  /** 지정하면 시드 생성값 대신 사용 (§7.3) */
  popularity?: number;
  fervor?: number;
}

export const SAINTS: SaintData[] = saintsJson as SaintData[];
