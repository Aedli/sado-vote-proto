import { useEffect, useState, type ReactNode } from 'react';
import { ASSUMPTION_HELP, STAGE_INTRO_HELP, type HelpKey } from '../config/help';
import { HelpContent } from './Help';
import { Modal } from './Modal';

const storageKey = (stage: string) => `sado-vote.helpSeen.${stage}`;

function seen(stage: string): boolean {
  try {
    return localStorage.getItem(storageKey(stage)) === '1';
  } catch {
    return false;
  }
}

function markSeen(stage: string): void {
  try {
    localStorage.setItem(storageKey(stage), '1');
  } catch {
    // 저장이 막힌 환경이면 다음에도 팝업이 다시 뜬다
  }
}

/** 단계 최초 진입 시 1회 자동으로 뜨고, 이후에는 버튼으로 다시 여는 설명 팝업 (부록 B13) */
export function StageIntro({ stage, intro }: { stage: keyof typeof STAGE_INTRO_HELP; intro: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<HelpKey | null>(null);
  useEffect(() => {
    if (!seen(stage)) setOpen(true);
  }, [stage]);
  const close = () => {
    markSeen(stage);
    setOpen(false);
    setDetail(null);
  };
  const cfg = STAGE_INTRO_HELP[stage];
  return (
    <>
      <button className="help-btn text" onClick={() => setOpen(true)}>
        ? {cfg.title}
      </button>
      {open && (
        <Modal title={detail ? ASSUMPTION_HELP[detail].title : cfg.title} onClose={close}>
          {detail ? (
            <>
              <HelpContent k={detail} />
              <button className="btn ghost" onClick={() => setDetail(null)}>
                ← 처음으로
              </button>
            </>
          ) : (
            <>
              {intro}
              <h3 style={{ marginBottom: 6 }}>먼저 알아 두면 좋은 용어</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {cfg.keys.map((k) => (
                  <button key={k} className="btn ghost" onClick={() => setDetail(k)}>
                    {ASSUMPTION_HELP[k].title}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                이 안내는 처음 한 번만 자동으로 뜹니다. 다시 보려면 화면 위의 &quot;? {cfg.title}&quot; 버튼을 누르세요.
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
