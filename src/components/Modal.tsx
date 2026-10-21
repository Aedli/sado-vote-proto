import type { ReactNode } from 'react';

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
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
