import type { ReactNode } from 'react';

/** 연출 설명 카드 (부록 B29): 검은 화면에 연출 내용을 글로 보여준다 */
export function DirectionCard({
  text,
  children,
  actionLabel,
  onAction,
}: {
  text: { title: string; source: string; lines: string[]; purpose: string };
  children?: ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="scr direction">
      <div className="dir-tag">연출 자리</div>
      <h2 className="dir-title">{text.title}</h2>
      <p className="dir-source">{text.source}</p>
      <ol className="dir-lines">
        {text.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ol>
      <p className="dir-purpose">연출 의도 · {text.purpose}</p>
      {children}
      <button className="dir-btn" onClick={onAction}>
        {actionLabel} ▶
      </button>
    </div>
  );
}
