// 기획자가 리포트 화면에서 바꿀 수 있는 가정값 목록 (부록 B22). 기본값은 archetypes.ts의 DEFAULT_POPULATION.
// 화면은 이 목록만 읽어서 입력칸을 만들고, 범위·단위·설명도 여기서 가져온다.

import { ARCHETYPE_IDS, DEFAULT_POPULATION, type ArchetypeId, type PopulationConfig } from './archetypes';
import type { HelpKey } from './help';
import { DEFAULT_RULES, SPEC_TIERS, type SpecTier } from './rules';

export type FieldKind = 'percent' | 'number' | 'int' | 'select';

export interface AssumptionField {
  id: string;
  group: AssumptionGroupId;
  label: string;
  desc: string;
  help?: HelpKey;
  kind: FieldKind;
  /** percent는 0~1 값 기준 */
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  /** 체크하면 값 대신 "자동"(null)을 쓰는 칸 */
  nullable?: { label: string; /** '자동'을 끌 때 처음 넣어 줄 값 */ fallback: number };
  archetype?: ArchetypeId;
  column?: ArchetypeColumn;
  get: (p: PopulationConfig) => number | string | null;
  set: (p: PopulationConfig, v: number | string | null) => void;
}

export type AssumptionGroupId = 'archetype' | 'spec' | 'optimizer' | 'fervor' | 'popularity' | 'late' | 'elimination';

export const ASSUMPTION_GROUPS: { id: AssumptionGroupId; title: string; desc: string }[] = [
  { id: 'archetype', title: '봇 유형별 행동', desc: '유형마다 몇 %인지, 얼마나 자주 접속하고 미션을 하는지, 최애가 예선에서 떨어지면 어떻게 하는지입니다.' },
  { id: 'spec', title: '스펙 분포', desc: '봇의 스펙 등급 구성입니다. 유형과는 따로 정해집니다.' },
  { id: 'optimizer', title: '보상 최적화형의 판 고르기', desc: '보상을 노리는 봇이 본선 사도를 고를 때 보상과 애정을 얼마나 저울질하는지입니다.' },
  { id: 'fervor', title: '열성도', desc: '사도마다 팬층이 얼마나 열심인지, 그게 접속에 얼마나 영향을 주는지입니다.' },
  { id: 'popularity', title: '인기 분포', desc: '사도 사이에 인기가 얼마나 쏠려 있는지, 봇이 인기를 얼마나 정확히 짐작하는지입니다.' },
  { id: 'late', title: '중도 진입형', desc: '이벤트 도중에 들어오는 봇의 진입 시점과 행동입니다.' },
  { id: 'elimination', title: '좋아하던 사도가 전부 탈락했을 때', desc: '"다음으로 좋아하던 사도"로 옮기려는데 선호 사도가 모두 떨어진 경우의 처리입니다.' },
];

export type ArchetypeColumn = 'ratio' | 'connectRate' | 'missionRate' | 'leave' | 'nextFavorite' | 'popular' | 'favoriteProb' | 'retryProb' | 'strategicSwitch';

export const ARCHETYPE_COLUMNS: { id: ArchetypeColumn; label: string; help: HelpKey }[] = [
  { id: 'ratio', label: '비율', help: 'archetypeRatio' },
  { id: 'connectRate', label: '접속률', help: 'connectRate' },
  { id: 'missionRate', label: '미션 수행률', help: 'missionRate' },
  { id: 'leave', label: '탈락 시 그만둠', help: 'favoriteEliminated' },
  { id: 'nextFavorite', label: '탈락 시 다음 선호 사도', help: 'favoriteEliminated' },
  { id: 'popular', label: '탈락 시 유명한 사도', help: 'favoriteEliminated' },
  { id: 'favoriteProb', label: '예선 최애 투표 확률', help: 'favoriteProb' },
  { id: 'retryProb', label: '본선 재도전 확률', help: 'retryProb' },
  { id: 'strategicSwitch', label: '순위 공개 시 표 옮김', help: 'strategicSwitch' },
];

const ARCHETYPE_NAMES: Record<ArchetypeId, string> = Object.fromEntries(
  ARCHETYPE_IDS.map((id) => [id, DEFAULT_POPULATION.archetypes[id].label]),
) as Record<ArchetypeId, string>;

const SPEC_NAMES: Record<SpecTier, string> = { high: '고스펙', mid: '중스펙', low: '저스펙' };

const clamp = (v: number, min = -Infinity, max = Infinity) => Math.min(max, Math.max(min, v));
const n = (v: number | string | null) => Number(v);

function archetypeFields(): AssumptionField[] {
  const out: AssumptionField[] = [];
  for (const id of ARCHETYPE_IDS) {
    const a = DEFAULT_POPULATION.archetypes[id];
    const name = ARCHETYPE_NAMES[id];
    const base = { group: 'archetype' as const, archetype: id, kind: 'percent' as const, min: 0, max: 1, step: 0.01 };
    out.push({ ...base, id: `${id}.ratio`, column: 'ratio', label: `${name} 비율`, desc: '전체 봇 중 이 유형의 비율', help: 'archetypeRatio', get: (p) => p.archetypes[id].ratio, set: (p, v) => (p.archetypes[id].ratio = n(v)) });
    if (id === 'late') {
      out.push({ ...base, id: 'late.connectRateAfterEntry', column: 'connectRate', label: `${name} 접속률(진입 후)`, desc: '진입 당일은 반드시 접속하고, 그 뒤 하루 접속 확률', help: 'connectRate', get: (p) => p.late.connectRateAfterEntry, set: (p, v) => (p.late.connectRateAfterEntry = n(v)) });
    } else {
      out.push({ ...base, id: `${id}.connectRate`, column: 'connectRate', label: `${name} 접속률`, desc: '하루 접속 확률', help: 'connectRate', get: (p) => p.archetypes[id].connectRate, set: (p, v) => (p.archetypes[id].connectRate = n(v)) });
    }
    out.push({ ...base, id: `${id}.missionRate`, column: 'missionRate', label: `${name} 미션 수행률`, desc: '접속한 날 미션 하나를 해낼 확률', help: 'missionRate', get: (p) => p.archetypes[id].missionRate, set: (p, v) => (p.archetypes[id].missionRate = n(v)) });
    if (a.onFavoriteEliminated) {
      for (const k of ['leave', 'nextFavorite', 'popular'] as const) {
        const label = { leave: '그만둠', nextFavorite: '다음 선호 사도', popular: '유명한 사도' }[k];
        out.push({
          ...base,
          id: `${id}.elim.${k}`,
          column: k,
          label: `${name} 최애 탈락 시 ${label}`,
          desc: '세 칸의 합이 100%가 아니면 비율대로 자동으로 맞춤',
          help: 'favoriteEliminated',
          get: (p) => p.archetypes[id].onFavoriteEliminated?.[k] ?? 0,
          set: (p, v) => {
            const b = p.archetypes[id].onFavoriteEliminated;
            if (b) b[k] = n(v);
          },
        });
      }
    }
    if (a.prelimChoice === 'mostlyFavorite') {
      out.push({ ...base, id: `${id}.favoriteProb`, column: 'favoriteProb', label: `${name} 예선 최애 투표 확률`, desc: '나머지는 선호 2·3순위에게 투표', help: 'favoriteProb', get: (p) => p.archetypes[id].favoriteProb, set: (p, v) => (p.archetypes[id].favoriteProb = n(v)) });
    }
    out.push({ ...base, id: `${id}.strategicSwitch`, column: 'strategicSwitch', label: `${name} 순위 공개 시 표 옮길 확률`, desc: '순위 공개 시나리오에서만 쓰임', help: 'strategicSwitch', get: (p) => p.archetypes[id].strategicSwitch, set: (p, v) => (p.archetypes[id].strategicSwitch = n(v)) });
    if (a.finalPlay === 'retry') {
      out.push({ ...base, id: `${id}.retryProb`, column: 'retryProb', label: `${name} 본선 재도전 확률`, desc: '2·3번째 입장에서 소탕 대신 직접 도전할 확률', help: 'retryProb', get: (p) => p.archetypes[id].retryProb, set: (p, v) => (p.archetypes[id].retryProb = n(v)) });
    }
  }
  return out;
}

const prelimDays = DEFAULT_RULES.prelim.days;
const finalDays = DEFAULT_RULES.final.days;

export const ASSUMPTION_FIELDS: AssumptionField[] = [
  ...archetypeFields(),
  ...SPEC_TIERS.map(
    (s): AssumptionField => ({
      id: `spec.${s}`,
      group: 'spec',
      label: SPEC_NAMES[s],
      desc: '합이 100%가 아니면 비율대로 자동으로 맞춤',
      help: 'specDistribution',
      kind: 'percent',
      min: 0,
      max: 1,
      step: 0.01,
      get: (p) => p.specDistribution[s],
      set: (p, v) => (p.specDistribution[s] = n(v)),
    }),
  ),
  { id: 'rewardSensitivity', group: 'optimizer', label: '보상 민감도', desc: '0이면 애정만, 1이면 보상만 봄', help: 'rewardSensitivity', kind: 'number', min: 0, max: 1, step: 0.05, get: (p) => p.rewardSensitivity, set: (p, v) => (p.rewardSensitivity = n(v)) },
  ...[0, 1, 2].map(
    (i): AssumptionField => ({
      id: `preferenceBonus.${i}`,
      group: 'optimizer',
      label: `애정 점수 (선호 ${i + 1}순위)`,
      desc: '좋아하는 사도에 얹는 점수. 클수록 덜 옮김',
      help: 'preferenceBonus',
      kind: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      get: (p) => p.preferenceBonus[i] ?? 0,
      set: (p, v) => (p.preferenceBonus[i] = n(v)),
    }),
  ),
  { id: 'fervor.perUnit', group: 'fervor', label: '열성도 보정 세기', desc: '열성도가 1을 넘는 만큼에 곱해 접속률·미션 수행률에 더하는 값', help: 'fervor', kind: 'number', min: 0, max: 0.5, step: 0.01, get: (p) => p.fervorBonus.perUnit, set: (p, v) => (p.fervorBonus.perUnit = n(v)) },
  { id: 'fervor.cap', group: 'fervor', label: '보정 후 최대 확률', desc: '아무리 열심이어도 이 확률을 넘지 않음', help: 'fervor', kind: 'percent', min: 0.5, max: 1, step: 0.01, get: (p) => p.fervorBonus.cap, set: (p, v) => (p.fervorBonus.cap = n(v)) },
  {
    id: 'fervor.mode',
    group: 'fervor',
    label: '보정 방향',
    desc: '열성도가 1보다 낮은 사도의 팬 접속률을 깎을지',
    help: 'fervor',
    kind: 'select',
    options: [
      { value: 'upOnly', label: '올리기만 (낮아도 깎지 않음)' },
      { value: 'both', label: '양방향 (낮으면 깎음)' },
    ],
    get: (p) => p.fervorBonus.mode,
    set: (p, v) => (p.fervorBonus.mode = v === 'both' ? 'both' : 'upOnly'),
  },
  { id: 'saints.fervorSigma', group: 'fervor', label: '사도별 열성도 퍼짐', desc: '클수록 사도마다 열성도 차이가 커짐', help: 'fervor', kind: 'number', min: 0, max: 1, step: 0.05, get: (p) => p.saints.fervorSigma, set: (p, v) => (p.saints.fervorSigma = n(v)) },
  {
    id: 'saints.fervorMin',
    group: 'fervor',
    label: '열성도 최소',
    desc: '사도 열성도의 하한',
    help: 'fervor',
    kind: 'number',
    min: 0.1,
    max: 1,
    step: 0.05,
    get: (p) => p.saints.fervorMin,
    set: (p, v) => {
      p.saints.fervorMin = n(v);
      p.saints.fervorMax = Math.max(p.saints.fervorMax, p.saints.fervorMin);
    },
  },
  {
    id: 'saints.fervorMax',
    group: 'fervor',
    label: '열성도 최대',
    desc: '사도 열성도의 상한',
    help: 'fervor',
    kind: 'number',
    min: 1,
    max: 3,
    step: 0.05,
    get: (p) => p.saints.fervorMax,
    set: (p, v) => {
      p.saints.fervorMax = n(v);
      p.saints.fervorMin = Math.min(p.saints.fervorMin, p.saints.fervorMax);
    },
  },
  { id: 'saints.zipfS', group: 'popularity', label: '인기 쏠림 정도', desc: '클수록 소수 사도에 팬이 몰림 (0이면 모두 같은 인기)', help: 'popularity', kind: 'number', min: 0, max: 2, step: 0.05, get: (p) => p.saints.zipfS, set: (p, v) => (p.saints.zipfS = n(v)) },
  { id: 'perceptionSigma', group: 'popularity', label: '인기 짐작 오차', desc: '클수록 봇이 사도 인기를 잘못 짐작함 (0이면 정확히 앎)', help: 'perceivedPopularity', kind: 'number', min: 0, max: 1, step: 0.05, get: (p) => p.perceptionSigma, set: (p, v) => (p.perceptionSigma = n(v)) },
  { id: 'routinePrelimTopN', group: 'popularity', label: '루틴 무관심형이 보는 인기 상위 사도 수', desc: '예선에서 이 안에서만 고름', help: 'routine', kind: 'int', min: 1, max: DEFAULT_RULES.saintCount, step: 1, get: (p) => p.routinePrelimTopN, set: (p, v) => (p.routinePrelimTopN = Math.round(n(v))) },
  {
    id: 'late.prelimEntryFrom',
    group: 'late',
    label: '예선 진입 가장 이른 날',
    desc: `예선 1~${prelimDays}일차`,
    help: 'lateEntry',
    kind: 'int',
    min: 1,
    max: prelimDays,
    step: 1,
    get: (p) => p.late.prelimEntryDays[0],
    set: (p, v) => {
      p.late.prelimEntryDays[0] = clamp(Math.round(n(v)), 1, prelimDays);
      p.late.prelimEntryDays[1] = Math.max(p.late.prelimEntryDays[1], p.late.prelimEntryDays[0]);
    },
  },
  {
    id: 'late.prelimEntryTo',
    group: 'late',
    label: '예선 진입 가장 늦은 날',
    desc: `예선 1~${prelimDays}일차`,
    help: 'lateEntry',
    kind: 'int',
    min: 1,
    max: prelimDays,
    step: 1,
    get: (p) => p.late.prelimEntryDays[1],
    set: (p, v) => {
      p.late.prelimEntryDays[1] = clamp(Math.round(n(v)), 1, prelimDays);
      p.late.prelimEntryDays[0] = Math.min(p.late.prelimEntryDays[0], p.late.prelimEntryDays[1]);
    },
  },
  { id: 'late.finalEntryShare', group: 'late', label: '본선에 처음 들어오는 비율', desc: '중도 진입형 중 본선 기간에 처음 들어오는 비율', help: 'lateEntry', kind: 'percent', min: 0, max: 1, step: 0.01, get: (p) => p.late.finalEntryShare, set: (p, v) => (p.late.finalEntryShare = n(v)) },
  {
    id: 'late.finalEntryFrom',
    group: 'late',
    label: '본선 진입 가장 이른 날',
    desc: `본선 1~${finalDays}일차`,
    help: 'lateEntry',
    kind: 'int',
    min: 1,
    max: finalDays,
    step: 1,
    get: (p) => p.late.finalEntryDays[0],
    set: (p, v) => {
      p.late.finalEntryDays[0] = clamp(Math.round(n(v)), 1, finalDays);
      p.late.finalEntryDays[1] = Math.max(p.late.finalEntryDays[1], p.late.finalEntryDays[0]);
    },
  },
  {
    id: 'late.finalEntryTo',
    group: 'late',
    label: '본선 진입 가장 늦은 날',
    desc: `본선 1~${finalDays}일차`,
    help: 'lateEntry',
    kind: 'int',
    min: 1,
    max: finalDays,
    step: 1,
    get: (p) => p.late.finalEntryDays[1],
    set: (p, v) => {
      p.late.finalEntryDays[1] = clamp(Math.round(n(v)), 1, finalDays);
      p.late.finalEntryDays[0] = Math.min(p.late.finalEntryDays[0], p.late.finalEntryDays[1]);
    },
  },
  {
    id: 'late.favoriteSurvivedRate',
    group: 'late',
    label: '본선 진입 시 최애가 본선에 남아 있을 확률',
    desc: '"자동"이면 실제 예선 결과로 정해짐(기본). 숫자를 넣으면 그 확률로 맞춤',
    help: 'lateEntry',
    kind: 'percent',
    min: 0,
    max: 1,
    step: 0.01,
    nullable: { label: '자동 (예선 결과로 결정)', fallback: 0.5 },
    get: (p) => p.late.favoriteSurvivedRate,
    set: (p, v) => (p.late.favoriteSurvivedRate = v === null ? null : n(v)),
  },
  {
    id: 'noSurvivingPreference',
    group: 'elimination',
    label: '처리 방법',
    desc: '"다음 선호 사도"로 가야 하는데 선호 사도가 모두 탈락한 경우',
    help: 'favoriteEliminated',
    kind: 'select',
    options: [
      { value: 'popular', label: '유명한 사도를 응원 (기본)' },
      { value: 'leave', label: '본선을 그만둠' },
    ],
    get: (p) => p.noSurvivingPreference,
    set: (p, v) => (p.noSurvivingPreference = v === 'leave' ? 'leave' : 'popular'),
  },
];

export function fieldById(id: string): AssumptionField | undefined {
  return ASSUMPTION_FIELDS.find((f) => f.id === id);
}

/** 화면 입력값 → 저장값 (범위 밖이면 범위 안으로) */
export function normalizeInput(f: AssumptionField, raw: number | string | null): number | string | null {
  if (raw === null || f.kind === 'select') return raw;
  let v = Number(raw);
  if (!Number.isFinite(v)) v = Number(f.get(DEFAULT_POPULATION));
  if (f.kind === 'int') v = Math.round(v);
  return clamp(v, f.min, f.max);
}

export function applyField(p: PopulationConfig, id: string, raw: number | string | null): PopulationConfig {
  const f = fieldById(id);
  if (!f) return p;
  const next = structuredClone(p);
  f.set(next, normalizeInput(f, raw));
  return next;
}

export function formatFieldValue(f: AssumptionField, v: number | string | null): string {
  if (v === null) return f.nullable?.label ?? '자동';
  if (f.kind === 'select') return f.options?.find((o) => o.value === v)?.label ?? String(v);
  if (f.kind === 'percent') return `${Math.round(Number(v) * 1000) / 10}%`;
  return String(Math.round(Number(v) * 1000) / 1000);
}

export interface FieldChange {
  field: AssumptionField;
  from: string;
  to: string;
}

/** 기본값과 다른 가정값 목록 */
export function diffFromDefault(p: PopulationConfig): FieldChange[] {
  return ASSUMPTION_FIELDS.flatMap((f) => {
    const a = f.get(DEFAULT_POPULATION);
    const b = f.get(p);
    if (a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9)) return [];
    return [{ field: f, from: formatFieldValue(f, a), to: formatFieldValue(f, b) }];
  });
}

/** 저장해 둔 가정값을 읽는다. 형식이 맞지 않는 칸은 기본값으로 둔다 */
export function restorePopulation(saved: unknown): PopulationConfig {
  const p = structuredClone(DEFAULT_POPULATION);
  if (!saved || typeof saved !== 'object') return p;
  const values = saved as Record<string, unknown>;
  for (const f of ASSUMPTION_FIELDS) {
    if (!(f.id in values)) continue;
    const v = values[f.id];
    if (v === null && f.nullable) f.set(p, null);
    else if (f.kind === 'select' && typeof v === 'string' && f.options?.some((o) => o.value === v)) f.set(p, v);
    else if (f.kind !== 'select' && typeof v === 'number' && Number.isFinite(v)) f.set(p, normalizeInput(f, v));
  }
  return p;
}

/** 저장용: 기본값과 다른 칸만 id → 값으로 */
export function serializePopulation(p: PopulationConfig): Record<string, number | string | null> {
  return Object.fromEntries(diffFromDefault(p).map((c) => [c.field.id, c.field.get(p)]));
}
