import { useState } from 'react';
import { prelimGuide } from '../config/guide';
import { DEFAULT_RULES } from '../config/rules';
import { SAINTS } from '../config/saints';
import { CLAIM_DIRECTION, MISSION_ICONS } from '../config/ui';
import { GuidePopup } from '../components/GuidePopup';
import { SaintFigure } from '../components/SaintFigure';
import { GameHeader } from '../components/TopBar';
import { useGameStore } from '../store/gameStore';

/** 예선 미션 화면 (§8.4, 기획서 p.20). 순위 정보는 없음 */
export function MissionScreen() {
  const { view, send, go } = useGameStore();
  const [flying, setFlying] = useState(0);
  if (!view) return null;
  const p = view.prelim;
  const c = view.clock;
  const rules = DEFAULT_RULES;
  const saint = p.daySaint;
  const claimable = p.canClaim.filter(Boolean).length;

  const fly = (votes: number) => {
    setFlying(votes);
    setTimeout(() => setFlying(0), CLAIM_DIRECTION.ms);
  };
  const claim = async (m: number) => {
    const r = await send({ type: 'claimMission', mission: m });
    if (r.ok && r.value) {
      fly(r.value);
    }
  };
  const claimAll = async () => {
    const r = await send({ type: 'claimAll' });
    if (r.ok && r.value) {
      fly(r.value);
    }
  };

  return (
    <div className="scr scr-mission">
      <GameHeader />
      {saint === -1 ? (
        <div className="mis-nosaint">
          <div className="speech">아직 오늘 응원할 사도를 고르지 않았어요.</div>
          <p className="small">사도를 골라야 미션 보상(표)을 받을 수 있어요.</p>
          <button className="game-btn" onClick={() => go('prelimSelect')}>
            사도 고르러 가기
          </button>
        </div>
      ) : (
        <>
          <div className="speech mis-speech">{SAINTS[saint].lines.missionIdle}</div>
          <div className="mis-figure">
            <SaintFigure saint={saint} height={420} />
            {flying > 0 && (
              <div className="claim-dir">
                <span className="claim-tag">{CLAIM_DIRECTION.tag}</span>
                {CLAIM_DIRECTION.text} · <b>+{flying}표</b>
              </div>
            )}
          </div>
        </>
      )}

      <section className="mis-panel">
        <div className="mis-head">
          <div className="mis-end">
            {c.daysLeft > 0 ? `${c.daysLeft}일 ` : ''}
            {c.hoursLeft}시간 후 종료
          </div>
          <div className="mis-count">
            금일 투표 수: {p.todayVotes}/{p.maxPerDay}
          </div>
          <div className="mis-refresh">{c.hoursToRefresh}시간 후 갱신</div>
        </div>
        <ul className="mis-list">
          {rules.missionNames.map((name, m) => {
            const done = p.missionDone[m];
            const claimed = p.missionClaimed[m];
            const target = rules.missionTargets[m] ?? 1;
            return (
              <li key={name} className={claimed ? 'claimed' : ''}>
                <span className="m-icon">{MISSION_ICONS[m]}</span>
                <span className="m-name">{name}</span>
                <span className="m-prog">
                  {done ? target : 0}/{target}
                </span>
                <span className="m-reward">
                  <span className="ticket" />×{rules.prelim.votesPerMission}
                </span>
                {claimed ? (
                  <button className="row-btn done" disabled>
                    완료
                  </button>
                ) : done ? (
                  <button className="row-btn" disabled={!p.canClaim[m]} title={saint === -1 ? '먼저 응원할 사도를 고르세요' : undefined} onClick={() => claim(m)}>
                    받기
                  </button>
                ) : (
                  <button className="row-btn" onClick={() => send({ type: 'completeMission', mission: m })}>
                    이동
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <button className="game-btn mis-all" disabled={claimable === 0} onClick={claimAll}>
        모두 받기
      </button>

      <section className="mis-history">
        <div className="row" style={{ alignItems: 'center' }}>
          <b>나의 투표 기록</b>
          <span className="spacer" />
          <GuidePopup id="prelim" title="예선 안내" buttonLabel="? 안내" sections={prelimGuide(rules)} />
        </div>
        <div className="hist-chips">
          {p.history.length === 0 && p.todayVotes === 0 && <span className="small muted">아직 기록이 없어요</span>}
          {p.history.map((h) => (
            <span key={h.day} className="hist-chip">
              {h.day}일 {SAINTS[h.saint].name} {h.votes}표
            </span>
          ))}
          {p.todayVotes > 0 && (
            <span className="hist-chip today">
              오늘 {SAINTS[saint].name} {p.todayVotes}표
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
