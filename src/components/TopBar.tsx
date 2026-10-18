import { useState } from 'react';
import { CURRENCY_DECOR, STAGE_TITLES } from '../config/ui';
import { useGameStore, type Screen } from '../store/gameStore';
import { Modal } from './Modal';
import { NextDayButton } from './NextDayButton';

const TITLES: Partial<Record<Screen, string>> = {
  prelimSelect: STAGE_TITLES.prelim,
  mission: STAGE_TITLES.prelim,
  finalSelect: STAGE_TITLES.final,
  party: STAGE_TITLES.boss,
  battle: STAGE_TITLES.boss,
  results: STAGE_TITLES.results,
  devnote: STAGE_TITLES.devnote,
};

/** 뒤로가기 목적지 */
const BACK: Partial<Record<Screen, Screen>> = {
  mission: 'prelimSelect',
  party: 'finalSelect',
  devnote: 'results',
};

export function dayLabel(phase: string, phaseDay: number, daysLeft: number, hoursLeft: number): string {
  if (phase === 'ended') return '이벤트 종료';
  const name = phase === 'prelim' ? '예선' : '본선';
  return `${name} ${phaseDay}일차 · ${daysLeft > 0 ? `${daysLeft}일 ` : ''}${hoursLeft}시간 후 종료`;
}

/** 무대 안 게임 헤더: ◀ 제목 + 재화 + 홈 (기획서 화면 예시) */
export function GameHeader({ dark }: { dark?: boolean }) {
  const { screen, go, goHome } = useGameStore();
  const back = BACK[screen];
  return (
    <header className={`game-header${dark ? ' dark' : ''}`}>
      <button className="sq-btn" disabled={!back} onClick={() => back && go(back)} aria-label="뒤로가기">
        ‹
      </button>
      <h1>{TITLES[screen] ?? ''}</h1>
      <span className="spacer" />
      {CURRENCY_DECOR.slice(0, 2).map((x, i) => (
        <span key={x.label} className="cur-pill" title={`${x.label} (장식)`}>
          <span className={`cur-icon c${i}`} />
          {x.value}
          <span className="cur-plus">+</span>
        </span>
      ))}
      <button className="round-btn" onClick={goHome} aria-label="오늘 할 일 화면으로" title="오늘 할 일 화면으로">
        ⌂
      </button>
    </header>
  );
}

/** 무대 바깥 프로토타입 조작 막대 (§8.0: 일차, 시점 토글, 다음 날로) */
export function ProtoBar() {
  const { view, plannerOn, togglePlanner, go } = useGameStore();
  const [confirmQuit, setConfirmQuit] = useState(false);
  if (!view) return null;
  const c = view.clock;
  return (
    <div className="proto-bar">
      <span className="proto-tag">프로토타입</span>
      <span className="day-label">{dayLabel(c.phase, c.phaseDay, c.daysLeft, c.hoursLeft)}</span>
      <span className="spacer" />
      <div className="view-toggle" role="group" aria-label="시점 전환">
        <button className={!plannerOn ? 'on' : ''} onClick={() => plannerOn && togglePlanner()}>
          유저 시점
        </button>
        <button className={plannerOn ? 'on' : ''} onClick={() => !plannerOn && togglePlanner()}>
          기획자 시점
        </button>
      </div>
      <button className="btn proto-btn" onClick={() => setConfirmQuit(true)}>
        처음으로
      </button>
      {c.phase !== 'ended' && <NextDayButton />}
      {confirmQuit && (
        <Modal title="처음 화면으로 갈까요?" onClose={() => setConfirmQuit(false)}>
          <p>지금 진행 중인 이벤트는 저장되지 않고 사라집니다.</p>
          <button
            className="btn primary"
            onClick={() => {
              setConfirmQuit(false);
              go('start');
            }}
          >
            처음 화면으로
          </button>
        </Modal>
      )}
    </div>
  );
}
