import { useState } from 'react';
import { DIRECTION_TEXT, INVASION_LINES, OPENING_LINES } from '../config/ui';
import { DirectionCard } from '../components/DirectionCard';
import { useGameStore } from '../store/gameStore';

/** 연출 설명 + 대사를 한 줄씩 넘겨 보는 영역 */
function Lines({ lines }: { lines: { speaker: string; text: string }[] }) {
  const [i, setI] = useState(0);
  return (
    <div className="dir-dialog" onClick={() => setI((i + 1) % lines.length)} title="클릭하면 다음 대사">
      <span className="speaker">{lines[i].speaker}</span>
      <span className="line">{lines[i].text}</span>
      <span className="dir-count">
        대사 {i + 1}/{lines.length} ▼
      </span>
    </div>
  );
}

/** 이벤트 시작 연출 자리 (§8.2) */
export function OpeningScreen() {
  const { markSeen, goHome } = useGameStore();
  return (
    <DirectionCard
      text={DIRECTION_TEXT.opening}
      actionLabel="예선 시작"
      onAction={() => {
        markSeen('opening');
        goHome();
      }}
    >
      <Lines lines={OPENING_LINES} />
    </DirectionCard>
  );
}

/** 보스 침공 연출 자리 (§8.7) */
export function InvasionScreen() {
  const { markSeen, go } = useGameStore();
  return (
    <DirectionCard
      text={DIRECTION_TEXT.invasion}
      actionLabel="보스전 준비"
      onAction={() => {
        markSeen('invasion');
        go('party');
      }}
    >
      <div className="dir-slogan">{DIRECTION_TEXT.invasion.slogan}</div>
      <Lines lines={INVASION_LINES} />
    </DirectionCard>
  );
}
