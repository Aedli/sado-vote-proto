import { DEFAULT_POPULATION, DEFAULT_RUN, type PopulationConfig, type RunConfig } from './archetypes';
import { DEFAULT_REWARDS, type RewardsConfig } from './rewards';
import { DEFAULT_RULES, type RulesConfig } from './rules';

/** 시뮬레이션 1회에 필요한 전체 설정. 기획자 패널·시나리오는 이 객체를 덮어써서 만든다 */
export interface SimConfig {
  rules: RulesConfig;
  rewards: RewardsConfig;
  population: PopulationConfig;
  run: RunConfig;
}

export function defaultSimConfig(): SimConfig {
  return structuredClone({
    rules: DEFAULT_RULES,
    rewards: DEFAULT_REWARDS,
    population: DEFAULT_POPULATION,
    run: DEFAULT_RUN,
  });
}

export * from './archetypes';
export * from './rewards';
export * from './rules';
