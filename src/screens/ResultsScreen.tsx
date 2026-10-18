import { DEFAULT_REWARDS } from '../config/rewards';
import { SAINTS } from '../config/saints';
import { DIRECTION_TEXT, RESULT_TEXT } from '../config/ui';
import { DirectionCard } from '../components/DirectionCard';
import { useAutoPopup } from '../components/popupQueue';
import { SaintFigure } from '../components/SaintFigure';
import { SaintPortrait } from '../components/SaintPortrait';
import { StagePopup } from '../components/StagePopup';
import { GameHeader } from '../components/TopBar';
import { useGameStore } from '../store/gameStore';
import { useReportStore } from '../store/reportStore';
import { num } from './report/format';

/** 우승 발표 본문 (기획서 p.26): 왕관 쓴 사도 + 대사 상자 + 소속·이름 */
function WinnerBody({ winner }: { winner: number }) {
  const s = SAINTS[winner];
  return (
    <div className="winner-body">
      <div className="winner-fig">
        <SaintFigure saint={winner} height={330} crown />
        <div className="info-title">{s?.title}</div>
        <div className="info-name">{s?.name}</div>
      </div>
      <div className="info-line winner-line">
        <div>{s?.lines.victory}</div>
      </div>
    </div>
  );
}

/** 결과 발표 (§8.11) */
export function ResultsScreen() {
  const { view, go, setup, seen, markSeen } = useGameStore();
  const popup = useAutoPopup('results', seen.resultsDir && !seen.results);
  const r = view?.results;
  if (!view || !r) return null;
  // 결과 발표 연출 설명 카드 → 우승 팝업 (부록 B29)
  if (!seen.resultsDir) {
    return <DirectionCard text={DIRECTION_TEXT.results} actionLabel="결과 보기" onAction={() => markSeen('resultsDir')} />;
  }
  const winner = SAINTS[r.winner];
  const tier = DEFAULT_REWARDS.dealTiers.find((t) => t.id === r.myDealTier);
  const groups = DEFAULT_REWARDS.saintRank.map((g, i, arr) => {
    const from = i === 0 ? 1 : arr[i - 1].maxRank + 1;
    return { ...g, saints: r.finalRanking.slice(from - 1, g.maxRank).map((x) => x.saint) };
  });
  const openReport = () => {
    const report = useReportStore.getState();
    report.setRun({ seed: setup.seed, botCount: setup.botCount });
    report.run();
    go('report');
  };

  return (
    <div className="scr scr-results">
      <GameHeader />
      {popup.open && (
        <StagePopup
          title={RESULT_TEXT.title}
          onClose={() => {
            markSeen('results');
            popup.done();
          }}
        >
          <WinnerBody winner={r.winner} />
        </StagePopup>
      )}

      <section className="res-winner panel-box">
        <div className="panel-title">
          {RESULT_TEXT.title} · {winner?.name}
        </div>
        <WinnerBody winner={r.winner} />
      </section>

      <section className="res-mine panel-box">
        <div className="panel-title">나의 딜링 순위 보상</div>
        {tier ? (
          <>
            <div className="tier-pill">{tier.label}</div>
            <div className="nameplate-prev">{tier.nameplate}</div>
            <div className="reward-items">
              <span>엘리프 {num(tier.elif)}</span>
              <span>황금 크레파스 {num(tier.goldenCrayon)}</span>
              <span>골드 {num(tier.gold)}</span>
            </div>
            <p className="small">
              {SAINTS[view.final.saint]?.name} 랭킹판 · 누적 딜링 점수 {num(view.final.total)}점
            </p>
          </>
        ) : (
          <p>{RESULT_TEXT.noDeal}</p>
        )}
      </section>

      <section className="res-saints panel-box">
        <div className="panel-title">사도 순위 보상 (전 유저 공통)</div>
        {groups.map((g) => (
          <div key={g.id} className="rank-row">
            <span className="tier-pill small">{g.label}</span>
            <span className="rank-faces">
              {g.saints.map((s) => (
                <SaintPortrait key={s} saint={s} size={30} />
              ))}
            </span>
            <span className="small">
              {g.skin && <b>{g.skin} · </b>}
              {g.extras.join(' · ')}
            </span>
          </div>
        ))}
      </section>

      <div className="res-actions">
        <button className="game-btn" onClick={() => go('devnote')}>
          투표 총 결과 보기
        </button>
        <button className="pill-btn" onClick={openReport}>
          같은 시드로 검증 리포트
        </button>
        <button className="pill-btn" onClick={() => go('start')}>
          새 이벤트
        </button>
      </div>
    </div>
  );
}

/** 투표 총 결과 (개발자 노트 형식, §8.11) */
export function DevNoteScreen() {
  const { view } = useGameStore();
  const r = view?.results;
  if (!r) return null;
  return (
    <div className="scr scr-devnote">
      <GameHeader />
      <div className="devnote-doc">
        <h2>[개발자 노트] 제 1회 수석 사도 투표 결과</h2>
        <p className="small">이벤트에 참여해 주신 교주님들께 감사드립니다. 예선과 본선의 전체 득표를 공개합니다.</p>
        <div className="devnote-cols">
          <section>
            <h3>본선 득표 ({r.finalRanking.length}명)</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>순위</th>
                  <th>사도</th>
                  <th>본선 득표</th>
                </tr>
              </thead>
              <tbody>
                {r.finalRanking.map((x, i) => (
                  <tr key={x.saint} className={view.final.saint === x.saint ? 'hl' : ''}>
                    <td>{i + 1}위</td>
                    <td>{SAINTS[x.saint]?.name}</td>
                    <td>{num(x.votes)}표</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h3>예선 득표 ({r.prelimRanking.length}명)</h3>
            <div className="scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>사도</th>
                    <th>예선 득표</th>
                    <th>본선</th>
                  </tr>
                </thead>
                <tbody>
                  {r.prelimRanking.map((x, i) => (
                    <tr key={x.saint} className={view.myPrelimSaints.includes(x.saint) ? 'hl' : ''}>
                      <td>{i + 1}위</td>
                      <td>{SAINTS[x.saint]?.name}</td>
                      <td>{num(x.votes)}표</td>
                      <td>{r.finalists.includes(x.saint) ? '진출' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">초록 줄 = 내가 예선에서 투표한 사도</p>
          </section>
        </div>
      </div>
    </div>
  );
}
