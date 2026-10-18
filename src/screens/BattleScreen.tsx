import { DIRECTION_TEXT } from '../config/ui';
import { SAINTS } from '../config/saints';
import { DirectionCard } from '../components/DirectionCard';
import { useGameStore } from '../store/gameStore';
import { num } from './report/format';

/** 보스전 전투 (§8.9): 연출은 설명 카드로 대신하고, 결과만 바로 보여준다 */
export function BattleScreen() {
  const { view, battle, go } = useGameStore();
  if (!view || !battle) return null;
  return (
    <DirectionCard text={DIRECTION_TEXT.battle} actionLabel="편성 화면으로" onAction={() => go('party')}>
      <div className="dir-result">
        <div className="dir-result-head">전투 결과 · 투표 사도 {SAINTS[view.final.saint]?.name}</div>
        <dl>
          <dt>이번 점수</dt>
          <dd>{num(battle.score)}점</dd>
          <dt>오늘 획득 표</dt>
          <dd>+{battle.votes}표</dd>
          <dt>누적 딜링 점수</dt>
          <dd>{num(battle.totalAfter)}점</dd>
        </dl>
      </div>
    </DirectionCard>
  );
}
