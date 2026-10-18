import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// M1은 헤드리스 엔진 단계. 화면은 M2(리포트)·M3(플레이어 흐름)에서 구현한다.
function App() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>세계수 교단 수석 사도 투표 — 프로토타입</h1>
      <p>M1: 규칙 엔진과 봇 시뮬레이션 단계입니다. <code>npm run sim</code>으로 실행하세요.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
