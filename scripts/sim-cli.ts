// 헤드리스 14일 시뮬레이션 CLI (M1)
// 사용법: npm run sim -- --seed 1 --bots 10000 [--board unified] [--public] [--fixed] [--finalists 20]
import { defaultSimConfig } from '../src/config';
import { SAINTS } from '../src/config/saints';
import { runFull, summarize } from '../src/sim/runner';

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const config = defaultSimConfig();
if (arg('seed')) config.run.seed = Number(arg('seed'));
if (arg('bots')) config.run.botCount = Number(arg('bots'));
if (arg('board') === 'unified') config.rules.final.boardMode = 'unified';
if (arg('finalists')) config.rules.prelim.finalistCount = Number(arg('finalists'));
if (args.includes('--public')) config.rules.prelim.rankingVisibility = 'public';
if (args.includes('--fixed')) config.rules.prelim.reselect = 'fixed';

const t0 = performance.now();
const sim = runFull(config);
const total = performance.now() - t0;
const s = summarize(sim);
const name = (i: number) => SAINTS[i]?.name ?? `#${i}`;
const pop = (i: number) => `인기 ${sim.saints[i].popularityRank}위, 열성 ${sim.saints[i].fervor.toFixed(2)}`;

console.log(`\n=== 시드 ${s.seed} · 봇 ${s.botCount.toLocaleString()}명 (가정값 기반) ===`);
console.log(`전체 ${total.toFixed(0)}ms, 하루 최대 ${s.maxDayMs.toFixed(0)}ms\n`);
console.log('[예선 상위 15] (★ = 본선 진출)');
s.prelimRanking.slice(0, 15).forEach((r, i) =>
  console.log(`${String(i + 1).padStart(2)}. ${s.finalists.includes(r.saint) ? '★' : ' '} ${name(r.saint)}  ${r.votes.toLocaleString()}표  (${pop(r.saint)})`),
);
console.log('\n[본선 결과]');
s.finalRanking.forEach((r, i) => {
  const size = s.boards.find((b) => b.board === r.saint)?.size ?? 0;
  console.log(`${String(i + 1).padStart(2)}. ${name(r.saint)}  ${r.votes.toLocaleString()}표  랭킹판 ${size.toLocaleString()}명`);
});
console.log(`\n우승: ${name(s.winner)}`);
console.log('\n[일차별 접속률]');
for (const d of sim.daily) {
  const e = Object.values(d.eligible).reduce((a, b) => a + b, 0);
  const c = Object.values(d.connected).reduce((a, b) => a + b, 0);
  console.log(`${d.phase === 'prelim' ? '예선' : '본선'} ${String(d.phase === 'prelim' ? d.day : d.day - config.rules.prelim.days)}일차: ${c.toLocaleString()}/${e.toLocaleString()} (${((c / Math.max(1, e)) * 100).toFixed(1)}%)  ${d.ms.toFixed(0)}ms`);
}
