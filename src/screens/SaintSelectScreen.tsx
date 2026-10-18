import { useMemo, useState } from 'react';
import { finalGuide, prelimGuide } from '../config/guide';
import { DEFAULT_RULES, PERSONALITIES, type Personality } from '../config/rules';
import { SAINTS } from '../config/saints';
import { ANNOUNCE_TEXT, FINAL_WARNING, PERSONALITY_COLORS } from '../config/ui';
import { GuidePopup } from '../components/GuidePopup';
import { Modal } from '../components/Modal';
import { useAutoPopup } from '../components/popupQueue';
import { SaintFigure } from '../components/SaintFigure';
import { StagePopup } from '../components/StagePopup';
import { GameHeader } from '../components/TopBar';
import { useGameStore } from '../store/gameStore';

type Sort = 'name' | 'number';

/** 본선 진출 공지 팝업 (§8.5, 기획서 p.21): SD 일렬 배치 + 이름표 */
function AnnouncePopup({ finalists, mine, wanted, onClose }: { finalists: number[]; mine: number[]; wanted: boolean; onClose: () => void }) {
  const auto = useAutoPopup('announce', wanted);
  if (!auto.open) return null;
  return (
    <StagePopup
      title={ANNOUNCE_TEXT.title}
      onClose={() => {
        auto.done();
        onClose();
      }}
    >
      <div className="lineup">
        {finalists.map((s, i) => (
          <div key={s} className="lineup-item" style={{ marginTop: i % 2 ? 30 : 0 }}>
            <SaintFigure saint={s} height={170} />
            <div className="lineup-name">{SAINTS[s]?.name}</div>
            {mine.includes(s) && <div className="my-badge">{ANNOUNCE_TEXT.myBadge}</div>}
          </div>
        ))}
      </div>
    </StagePopup>
  );
}

/** 카드 그림: 정사각 칸 안에 SD 상반신 */
export function SaintCardArt({ saint, size = 112 }: { saint: number; size?: number }) {
  const s = SAINTS[saint];
  return (
    <div className="card-art" style={{ width: size, height: size, background: s ? `${PERSONALITY_COLORS[s.personality]}33` : '#ddd' }}>
      <SaintFigure saint={saint} height={size * 1.25} />
    </div>
  );
}

/** 예선·본선 사도 선택 (§8.3, §8.6, 기획서 p.19·22). 두 화면은 같은 구조 */
export function SaintSelectScreen({ mode }: { mode: 'prelim' | 'final' }) {
  const { view, send, go, seen, markSeen, showToast } = useGameStore();
  const [filter, setFilter] = useState<Personality | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<Sort>('name');
  const [desc, setDesc] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const locked = mode === 'prelim' ? (view?.prelim.daySaint ?? -1) : (view?.final.saint ?? -1);
  const candidates = useMemo(
    () => (mode === 'final' ? (view?.finalists ?? []) : SAINTS.slice(0, DEFAULT_RULES.saintCount).map((_, i) => i)),
    [mode, view?.finalists],
  );
  const [picked, setPicked] = useState<number>(locked !== -1 ? locked : candidates[0]);
  if (!view) return null;

  const list = candidates
    .filter((s) => filter === null || SAINTS[s]?.personality === filter)
    .sort((a, b) => (sort === 'name' ? SAINTS[a].name.localeCompare(SAINTS[b].name, 'ko') : a - b) * (desc ? -1 : 1));
  const s = SAINTS[picked];
  const line = mode === 'prelim' ? s?.lines.prelimSelect : s?.lines.finalSelect;

  const vote = async () => {
    if (mode === 'prelim') {
      const r = await send({ type: 'selectPrelimSaint', saint: picked });
      if (r.ok) {
        showToast(`오늘은 ${s.name}에게 투표합니다`);
        go('mission');
      }
    } else {
      setConfirm(false);
      const r = await send({ type: 'chooseFinalSaint', saint: picked });
      if (r.ok) go(seen.invasion ? 'party' : 'invasion');
    }
  };

  return (
    <div className="scr scr-select">
      <GameHeader />
      {mode === 'final' && view.finalists && (
        <AnnouncePopup finalists={view.finalists} mine={view.myPrelimSaints} wanted={!seen.announce} onClose={() => markSeen('announce')} />
      )}

      <section className="sel-figure">
        <SaintFigure saint={picked} height={430} />
      </section>
      <section className="sel-info">
        {mode === 'final' && (
          <div className="top10-banner">
            <span className="stars">✦✧</span>
            <span className="top10-pill">TOP 10</span>
            <span className="stars">✧✦</span>
          </div>
        )}
        <div className="info-title">{s?.title}</div>
        <div className="info-name">{s?.name}</div>
        <div className="info-line">
          <div>{line}</div>
        </div>
      </section>
      {mode === 'final' && <p className="sel-warning">{FINAL_WARNING}</p>}
      {mode === 'prelim' && locked !== -1 && <p className="sel-note">오늘은 이미 {SAINTS[locked].name}에게 투표하기로 정했어요. 내일 다시 고를 수 있어요.</p>}
      {mode === 'final' && locked !== -1 && <p className="sel-note">본선 응원 사도는 {SAINTS[locked].name}로 확정되어 바꿀 수 없어요.</p>}

      <section className="sel-panel">
        <div className="panel-head">
          <b>투표 사도 선택</b>
          <span className="spacer" />
          <div className="dd">
            <button className="pill-btn" onClick={() => setFilterOpen(!filterOpen)}>
              {filter ? `필터 ${DEFAULT_RULES.personalityNames[filter]}` : '필터 OFF'}
            </button>
            {filterOpen && (
              <div className="dd-menu">
                <button
                  onClick={() => {
                    setFilter(null);
                    setFilterOpen(false);
                  }}
                >
                  전체 (필터 OFF)
                </button>
                {PERSONALITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setFilter(p);
                      setFilterOpen(false);
                    }}
                  >
                    <span className="dot" style={{ background: PERSONALITY_COLORS[p] }} /> {DEFAULT_RULES.personalityNames[p]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="pill-btn" onClick={() => setSort(sort === 'name' ? 'number' : 'name')}>
            {sort === 'name' ? '가나다순' : '번호순'}
          </button>
          <button className="circle-btn" onClick={() => setDesc(!desc)} aria-label="정렬 방향 바꾸기" title="정렬 방향 바꾸기">
            {desc ? '⌃' : '⌄'}
          </button>
          <GuidePopup id={mode} title={mode === 'prelim' ? '예선 안내' : '본선 안내'} buttonLabel="?" sections={mode === 'prelim' ? prelimGuide(DEFAULT_RULES) : finalGuide(DEFAULT_RULES)} />
        </div>
        <div className="sel-grid">
          {list.map((i) => (
            <button key={i} className={`sel-card${i === picked ? ' picked' : ''}`} onClick={() => setPicked(i)}>
              <SaintCardArt saint={i} />
              <span className="sel-card-name">{SAINTS[i].name}</span>
              {i === locked && <span className="corner-tag">{mode === 'prelim' ? '오늘 투표' : '응원 중'}</span>}
              {mode === 'final' && view.myPrelimSaints.includes(i) && <span className="my-badge corner">예선 응원</span>}
            </button>
          ))}
          {list.length === 0 && <p className="muted">이 성격의 사도가 없어요.</p>}
        </div>
        <div className="panel-foot">
          {locked === -1 ? (
            <>
              {mode === 'prelim' && (
                <button className="link-btn" onClick={() => go('mission')}>
                  미션 먼저 보기
                </button>
              )}
              <button className="game-btn" onClick={() => (mode === 'prelim' ? vote() : setConfirm(true))}>
                투표하기
              </button>
            </>
          ) : (
            <button className="game-btn" onClick={() => go(mode === 'prelim' ? 'mission' : 'party')}>
              {mode === 'prelim' ? '미션 화면으로' : '보스전으로'}
            </button>
          )}
        </div>
      </section>

      {confirm && (
        <Modal title="정말 이 사도로 정할까요?" onClose={() => setConfirm(false)}>
          <div className="row" style={{ alignItems: 'center', gap: 16 }}>
            <SaintFigure saint={picked} height={110} />
            <p>
              <b>{s.name}</b>을(를) 본선 응원 사도로 정하면 <b>본선이 끝날 때까지 바꿀 수 없습니다.</b>
            </p>
          </div>
          <button className="btn primary" onClick={vote}>
            확정하기
          </button>
        </Modal>
      )}
    </div>
  );
}
