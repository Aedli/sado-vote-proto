// 딜량 추상화 공식 (SPEC §5)
// score = basePower[spec] × affinity(account, boss) × skillFactor × noise

import { PERSONALITIES, type DamageRules, type Personality, type SpecTier } from '../config/rules';
import type { Rng } from './rng';
import type { Account } from './state';

export function drawSkill(rng: Rng, rules: DamageRules): number {
  const v = rng.normal(rules.skillMean, rules.skillSd);
  return Math.min(rules.skillMax, Math.max(rules.skillMin, v));
}

/** 스펙 등급에 맞춰 육성 성격 개수를 균등 랜덤으로 정하고 성격을 뽑는다 */
export function drawTrained(rng: Rng, rules: DamageRules, spec: SpecTier): Personality[] {
  const [min, max] = rules.trainedCount[spec];
  const count = rng.int(min, max);
  return rng.shuffle([...PERSONALITIES]).slice(0, count);
}

export function drawAccount(rng: Rng, rules: DamageRules, spec: SpecTier): Account {
  return { spec, trained: drawTrained(rng, rules, spec), skill: drawSkill(rng, rules) };
}

export function affinity(rules: DamageRules, account: Account, boss: Personality): number {
  return account.trained.includes(boss) ? rules.affinityMatch : rules.affinityMismatch;
}

/** noise를 제외한 기대 점수 (예상 전투력 표시용) */
export function expectedScore(rules: DamageRules, account: Account, boss: Personality): number {
  return rules.basePower[account.spec] * affinity(rules, account, boss) * account.skill;
}

export function drawNoise(rng: Rng, rules: DamageRules): number {
  return rng.logNormal(0, rules.noiseSigma);
}

export function rollScore(rng: Rng, rules: DamageRules, account: Account, boss: Personality): number {
  return Math.round(expectedScore(rules, account, boss) * drawNoise(rng, rules));
}
