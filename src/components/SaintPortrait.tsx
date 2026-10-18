import { SAINTS } from '../config/saints';
import { PERSONALITY_COLORS } from '../config/ui';

/** 사도 원형 초상 (목록·배지용). saints.json에 image가 있으면 그 이미지, 없으면 성격 색상 원 + 번호 */
export function SaintPortrait({ saint, size = 64, dim }: { saint: number; size?: number; dim?: boolean }) {
  const s = SAINTS[saint];
  const color = s ? PERSONALITY_COLORS[s.personality] : '#ccc';
  const style = { width: size, height: size, opacity: dim ? 0.45 : 1 };
  if (s?.image) {
    return <img className="portrait" src={`${import.meta.env.BASE_URL}${s.image}`} alt={s.name} style={style} />;
  }
  return (
    <div className="portrait placeholder" style={{ ...style, background: color, fontSize: size * 0.32 }} title={s?.name} aria-label={s?.name}>
      {String(saint + 1).padStart(3, '0')}
    </div>
  );
}
