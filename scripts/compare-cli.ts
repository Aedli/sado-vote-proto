// 시나리오 비교 결과를 명령줄에서 확인 (npm run compare -- --repeats 20 --bots 10000)
import { DEFAULT_POPULATION } from '../src/config/archetypes';
import { DEFAULT_CRITERIA } from '../src/config/criteria';
import { DEFAULT_COMPARE_RUN } from '../src/config/scenarios';
import { METRIC_DEFS, defaultScenarios, runScenarioSeed, scenarioConfig, seedList, summarize } from '../src/sim/scenarios';

const args = process.argv.slice(2);
const arg = (n: string) => (args.indexOf(`--${n}`) >= 0 ? Number(args[args.indexOf(`--${n}`) + 1]) : undefined);
const run = { ...DEFAULT_COMPARE_RUN, repeats: arg('repeats') ?? DEFAULT_COMPARE_RUN.repeats, botCount: arg('bots') ?? DEFAULT_COMPARE_RUN.botCount, seed: arg('seed') ?? DEFAULT_COMPARE_RUN.seed };
const scenarios = defaultScenarios(DEFAULT_POPULATION);
const t0 = performance.now();
const sums = scenarios.map((s) => summarize(seedList(run).map((seed) => runScenarioSeed(scenarioConfig(s, run, seed))), DEFAULT_CRITERIA));
console.log(`시드 ${run.seed}~${run.seed + run.repeats - 1}, 봇 ${run.botCount}, ${((performance.now() - t0) / 1000).toFixed(1)}초`);
console.log(['지표', ...scenarios.map((s) => s.name)].join(' | '));
for (const g of ['h1', 'h2', 'h3'] as const) {
  console.log([`${g.toUpperCase()} 종합`, ...sums.map((x) => `${x.hypotheses[g].meanVerdict} (${x.hypotheses[g].counts.pass}/${x.hypotheses[g].counts.warn}/${x.hypotheses[g].counts.fail})`)].join(' | '));
}
for (const m of METRIC_DEFS) {
  console.log([m.label, ...sums.map((x) => `${x.metrics[m.id].mean.toFixed(3)}±${x.metrics[m.id].sd.toFixed(3)}${x.metrics[m.id].counts ? ` (${x.metrics[m.id].counts!.pass}/${x.metrics[m.id].counts!.warn}/${x.metrics[m.id].counts!.fail})` : ''}`)].join(' | '));
}
