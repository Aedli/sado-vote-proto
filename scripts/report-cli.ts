// 리포트 지표를 명령줄에서 확인 (npm run report -- --seed 1 --bots 10000)
import { defaultSimConfig } from '../src/config';
import { DEFAULT_CRITERIA } from '../src/config/criteria';
import { runReportBundle } from '../src/sim/report';

const args = process.argv.slice(2);
const arg = (n: string) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : undefined);
const config = defaultSimConfig();
if (arg('seed')) config.run.seed = Number(arg('seed'));
if (arg('bots')) config.run.botCount = Number(arg('bots'));
const t0 = performance.now();
const r = runReportBundle(config, DEFAULT_CRITERIA);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(`시드 ${r.seed}, 봇 ${r.botCount}, ${(performance.now() - t0).toFixed(0)}ms`);
console.log('\n[H1]', r.h1.verdict);
for (const rep of r.h1.representatives) console.log(` ${rep.spec}: 점수 ${rep.score?.toFixed(0)}, 격차 ${rep.gap.toFixed(1)}점, 구간 ${rep.tierSteps}단계 (${rep.best?.tierLabel} ~ ${rep.worst?.tierLabel}) → ${rep.verdict}`);
for (const d of r.h1.distributions) console.log(` 분포 ${d.spec}: 중앙 격차 ${d.medianGap.toFixed(1)}, 주의 ${pct(d.warnShare)}, 실패 ${pct(d.failShare)}`);
for (const o of r.h1.optimizer) console.log(` 최적화형 ${o.spec}: ${o.optimizerAvg.toFixed(1)} vs ${o.othersAvg.toFixed(1)} (차이 ${o.diff.toFixed(1)}, n=${o.optimizerCount})`);
for (const b of r.h1.boards) console.log(` 판 사도#${b.saint}: ${b.size}명, 100위 컷 ${b.top100Cutoff?.toFixed(0) ?? '-'}`);
console.log('\n[H2]', r.h2.verdict, `스피어만 ${r.h2.spearman.toFixed(3)}, 뒤집힘 ${pct(r.h2.invertedRatio)}, 열성 우위 ${pct(r.h2.fervorWinShare)}, 진출 일치 ${r.h2.finalistMatch}, 고정 시 겹침 ${r.h2.fixed?.overlapWithDaily}`);
console.log('\n[H3]', r.h3.verdict, `최애 탈락 ${pct(r.h3.favoriteEliminatedRate)}, 이탈 ${pct(r.h3.dropoutRate)}, 판 ${r.h3.boardMin}/${r.h3.boardMedian}/${r.h3.boardMax}, 작은 판 ${r.h3.smallBoards}`);
for (const d of r.h3.dropout) console.log(` 이탈 ${d.archetype}: ${pct(d.rate)} (n=${d.prelimParticipants})`);
for (const s of r.h3.sensitivity) console.log(` 진출 ${s.finalists}: 탈락 ${pct(s.favoriteEliminatedRate)}, 이탈 ${pct(s.dropoutRate)}, 판 ${s.boardMin}/${s.boardMedian}/${s.boardMax}, 작은 판 ${s.smallBoards}`);
console.log('\n[보조]', `late 예선진입 ${pct(r.aux.late.prelimEntryRatio)}, 본선진입 ${pct(r.aux.late.finalEntryRatio)}, 지니 ${r.aux.prelimGini.toFixed(3)}/${r.aux.finalGini.toFixed(3)}`);
