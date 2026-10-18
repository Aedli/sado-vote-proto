import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Modal } from './Modal';

/** `다음 날로` (§8.0): 소멸할 표·입장 횟수가 있으면 확인 팝업 */
export function NextDayButton() {
  const { view, nextDay, busy } = useGameStore();
  const [confirm, setConfirm] = useState(false);
  if (!view || view.clock.phase === 'ended') return null;
  const lostVotes = view.prelim.unclaimedVotes;
  const lostEntries = view.clock.phase === 'final' ? view.final.entriesLeft : 0;
  const last = view.clock.phaseDay === view.clock.phaseDays;
  const label = view.clock.phase === 'final' && last ? '본선 종료 · 결과 발표' : last ? '예선 종료 · 다음 날로' : '다음 날로';
  const onClick = () => (lostVotes > 0 || lostEntries > 0 ? setConfirm(true) : nextDay());
  return (
    <>
      <button className="btn primary next-day" onClick={onClick} disabled={busy !== null}>
        {label} ▶
      </button>
      {confirm && (
        <Modal title="정말 다음 날로 넘어갈까요?" onClose={() => setConfirm(false)}>
          {lostVotes > 0 && (
            <p>
              미수령 표 <b>{lostVotes}표</b>는 소멸합니다.
            </p>
          )}
          {lostEntries > 0 && (
            <p>
              오늘 남은 보스전 입장 <b>{lostEntries}회</b>는 다음 날로 넘어가지 않고 소멸합니다.
            </p>
          )}
          <button
            className="btn primary"
            onClick={() => {
              setConfirm(false);
              nextDay();
            }}
          >
            그래도 다음 날로
          </button>
        </Modal>
      )}
    </>
  );
}
