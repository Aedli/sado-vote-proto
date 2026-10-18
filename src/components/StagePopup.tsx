import type { ReactNode } from 'react';

/** 기획서 화면 예시의 공지·발표 팝업: 별 장식 제목 + 회색 안쪽 영역 + 오른쪽 위 X */
export function StagePopup({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="stage-popup-back">
      <button className="x-btn" onClick={onClose} aria-label="닫기">
        ✕
      </button>
      <div className="stage-popup" role="dialog" aria-label={title}>
        <div className="sp-title">
          <span className="stars">✦✧✦</span>
          <h2>{title}</h2>
          <span className="stars">✦✧✦</span>
        </div>
        <div className="sp-inner">{children}</div>
      </div>
    </div>
  );
}
