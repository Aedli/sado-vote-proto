import type { ReactNode } from 'react';

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <div className="foot">
          <button className="btn primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
