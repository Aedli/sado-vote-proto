import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { STAGE_SIZE } from '../config/ui';

/** 16:9 게임 화면. 1280×720 기준으로 그리고 남은 공간에 맞춰 확대·축소한다 */
export function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.max(0.3, Math.min(r.width / STAGE_SIZE.w, r.height / STAGE_SIZE.h)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="stage-wrap" ref={ref}>
      <div className="stage" style={{ width: STAGE_SIZE.w, height: STAGE_SIZE.h, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
