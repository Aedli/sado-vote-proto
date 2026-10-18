import { defaultSimConfig, type SimConfig } from '../src/config';
import { closeDay } from '../src/engine/day';
import { createEventState, newUser, type EventState } from '../src/engine/state';
import type { Personality } from '../src/config/rules';

export function testConfig(mutate?: (c: SimConfig) => void): SimConfig {
  const c = defaultSimConfig();
  c.run.botCount = 0;
  mutate?.(c);
  return c;
}

/** 봇 없이 유저 n명만 있는 상태 */
export function makeState(userCount = 1, mutate?: (c: SimConfig) => void, joinDays: number[] = []): EventState {
  const config = testConfig(mutate);
  const personality: Personality[] = Array.from({ length: config.rules.saintCount }, (_, i) => (['P1', 'P2', 'P3', 'P4', 'P5'] as const)[i % 5]);
  const users = Array.from({ length: userCount }, (_, i) =>
    newUser(i, { spec: 'mid', trained: ['P1', 'P2'], skill: 1 }, joinDays[i] ?? 1, config, i === 0),
  );
  return createEventState(config, personality, users);
}

export function skipDays(state: EventState, n: number): void {
  for (let i = 0; i < n; i++) closeDay(state);
}

/** 예선을 끝내고 진출자를 직접 지정해 본선 1일차로 */
export function toFinal(state: EventState, finalists?: number[]): void {
  skipDays(state, state.config.rules.prelim.days);
  if (finalists) state.finalists = finalists;
}
