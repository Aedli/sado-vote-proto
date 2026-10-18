import { SAINTS } from '../config/saints';
import { PERSONALITY_COLORS } from '../config/ui';

/** 색을 어둡게/밝게 (자리표시 그림용) */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

/**
 * 사도 SD 전신 자리표시 (§2 이미지 슬롯). saints.json에 image가 있으면 그 이미지를 쓴다.
 * 특정 IP의 그림을 쓰지 않도록 머리·몸만 있는 단순 실루엣으로 그린다.
 */
export function SaintFigure({
  saint,
  height = 300,
  shadow,
  crown,
  color,
  label,
}: {
  saint: number;
  height?: number;
  shadow?: boolean;
  crown?: boolean;
  /** 사도가 아닌 인물(파티원 등)을 그릴 때 색 */
  color?: string;
  /** 번호 대신 표시할 글자 */
  label?: string;
}) {
  const s = SAINTS[saint];
  if (s?.image && !shadow) {
    return <img className="figure-img" src={`${import.meta.env.BASE_URL}${s.image}`} alt={s.name} style={{ height }} />;
  }
  const base = shadow ? '#2b2b2b' : (color ?? (s ? PERSONALITY_COLORS[s.personality] : '#aaa'));
  const hair = shadow ? '#1c1c1c' : shade(base, -45);
  const cloth = shadow ? '#333' : shade(base, 35);
  const no = label ?? String(saint + 1).padStart(3, "0");
  return (
    <svg className="figure" viewBox="0 0 100 140" style={{ height }} role="img" aria-label={s?.name}>
      {crown && <path d="M32 8 L38 20 L44 6 L50 20 L56 6 L62 20 L68 8 L66 26 L34 26 Z" fill="#f5c542" stroke="#8a6d10" strokeWidth="1.5" />}
      {/* 몸 */}
      <path d="M28 128 Q26 92 36 82 L64 82 Q74 92 72 128 Z" fill={cloth} stroke="#222" strokeWidth="2" />
      <rect x="40" y="126" width="8" height="10" rx="3" fill={hair} />
      <rect x="52" y="126" width="8" height="10" rx="3" fill={hair} />
      {/* 머리 */}
      <circle cx="50" cy="52" r="34" fill={shadow ? '#2b2b2b' : '#fbe7da'} stroke="#222" strokeWidth="2" />
      <path d="M16 52 Q14 16 50 16 Q86 16 84 52 Q78 32 50 30 Q24 32 16 52 Z" fill={hair} stroke="#222" strokeWidth="2" />
      {!shadow && (
        <>
          <ellipse cx="38" cy="58" rx="4" ry="5.5" fill="#333" />
          <ellipse cx="62" cy="58" rx="4" ry="5.5" fill="#333" />
          <ellipse cx="32" cy="68" rx="5" ry="2.5" fill="#f4a6a6" opacity="0.7" />
          <ellipse cx="68" cy="68" rx="5" ry="2.5" fill="#f4a6a6" opacity="0.7" />
          <path d="M45 70 Q50 74 55 70" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="36" y="94" width="28" height="14" rx="7" fill="#fff" stroke="#222" strokeWidth="1.5" />
          <text x="50" y="105" textAnchor="middle" fontSize="11" fontWeight="700" fill="#222">
            {no}
          </text>
        </>
      )}
    </svg>
  );
}
