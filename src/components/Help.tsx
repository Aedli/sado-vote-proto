import { useState } from 'react';
import { ASSUMPTION_HELP, type HelpEntry, type HelpKey } from '../config/help';
import { Modal } from './Modal';

export function HelpContent({ k }: { k: HelpKey }) {
  const h: HelpEntry = ASSUMPTION_HELP[k];
  return (
    <div>
      <p>
        <b>{h.summary}</b>
      </p>
      <div className="box reading">
        <h4>예시</h4>
        {h.example}
      </div>
      <div className="box how">
        <h4>왜 필요한가</h4>
        {h.why}
      </div>
      {h.formula && (
        <p className="muted" style={{ fontSize: 13 }}>
          참고 공식: <code>{h.formula}</code>
        </p>
      )}
    </div>
  );
}

/** 용어 옆의 ? 버튼. label을 주면 글자 버튼으로 표시 */
export function HelpButton({ k, label }: { k: HelpKey; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`help-btn${label ? ' text' : ''}`} title={`${ASSUMPTION_HELP[k].title} 설명 보기`} onClick={() => setOpen(true)}>
        {label ? `? ${label}` : '?'}
      </button>
      {open && (
        <Modal title={ASSUMPTION_HELP[k].title} onClose={() => setOpen(false)}>
          <HelpContent k={k} />
        </Modal>
      )}
    </>
  );
}
