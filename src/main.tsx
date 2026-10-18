import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReportScreen } from './screens/ReportScreen';
import './styles.css';

// M2: 검증 리포트가 첫 화면. 플레이어 흐름 화면은 M3에서 추가한다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReportScreen />
  </StrictMode>,
);
