import { useState } from 'react';
import type { GuideSection } from '../config/guide';
import { Modal } from './Modal';
import { useAutoPopup } from './popupQueue';

const key = (id: string) => `sado-vote.guideSeen.${id}`;

function seen(id: string): boolean {
  try {
    return localStorage.getItem(key(id)) === '1';
  } catch {
    return false;
  }
}

function markSeen(id: string): void {
  try {
    localStorage.setItem(key(id), '1');
  } catch {
    // 저장이 막힌 환경이면 다음에도 다시 뜬다
  }
}

/** 유저용 게임 안내: 단계 첫 진입 시 1회 자동, 이후 ? 버튼 (부록 B26) */
export function GuidePopup({ id, title, sections, buttonLabel }: { id: string; title: string; sections: GuideSection[]; buttonLabel?: string }) {
  const [wanted, setWanted] = useState(() => !seen(id));
  const [manual, setManual] = useState(false);
  const auto = useAutoPopup(`guide.${id}`, wanted);
  const close = () => {
    markSeen(id);
    setWanted(false);
    setManual(false);
    auto.done();
  };
  return (
    <>
      <button className="help-btn text" onClick={() => setManual(true)}>
        {buttonLabel ?? `? ${title}`}
      </button>
      {(manual || auto.open) && (
        <Modal title={title} onClose={close}>
          {sections.map((s) => (
            <div key={s.title} className="box how">
              <h4>{s.title}</h4>
              <ul>
                {s.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 13 }}>
            이 안내는 처음 한 번만 자동으로 뜹니다. 다시 보려면 &quot;? {title}&quot; 버튼을 누르세요.
          </p>
        </Modal>
      )}
    </>
  );
}
