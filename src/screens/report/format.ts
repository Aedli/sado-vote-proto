import { SAINTS } from '../../config/saints';

export const saintName = (i: number) => SAINTS[i]?.name ?? `사도 #${i + 1}`;
export const num = (x: number, digits = 0) => x.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
export const signed = (x: number, digits = 1) => `${x > 0 ? '+' : ''}${x.toFixed(digits)}`;

export const CHART_COLORS = {
  main: '#86a83a',
  sub: '#c9b458',
  accent: '#5b8bd6',
  muted: '#b8bfae',
  fail: '#c0392b',
};
