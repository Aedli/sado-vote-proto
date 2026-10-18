import { finalGuide } from '../config/guide';
import { DEFAULT_RULES, PERSONALITIES } from '../config/rules';
import { SPEC_LABEL } from '../config/reportText';
import { SAINTS } from '../config/saints';
import { PERSONALITY_COLORS } from '../config/ui';
import { GuidePopup } from '../components/GuidePopup';
import { SaintFigure } from '../components/SaintFigure';
import { SaintPortrait } from '../components/SaintPortrait';
import { GameHeader } from '../components/TopBar';
import { useGameStore } from '../store/gameStore';
import { num } from './report/format';

/** 보스전 파티 편성 (§8.8, 기획서 p.24) */
export function PartyScreen() {
  const { view, send, go, showToast } = useGameStore();
  if (!view) return null;
  const f = view.final;
  const rules = DEFAULT_RULES;
  const names = rules.personalityNames;
  const dmg = rules.damage;
  const lockedBoss = f.entriesToday > 0;
  const rotation = rules.final.bossRotation;

  const start = async () => {
    const before = f.total;
    const r = await send({ type: 'challenge' });
    if (r.ok && r.value !== undefined) {
      useGameStore.setState({ battle: { score: r.value, votes: rules.final.votesPerEntry, totalAfter: before + r.value } });
      go('battle');
    }
  };
  const doSweep = async () => {
    const r = await send({ type: 'sweep' });
    if (r.ok && r.value) showToast(`소탕 ${r.value}회: 회당 ${num(f.lastScoreToday)}점 · +${r.value * rules.final.votesPerEntry}표`);
  };

  return (
    <div className="scr scr-party">
      <GameHeader dark />

      {/* 왼쪽 위: 보스 성격 로테이션 */}
      <div className="boss-gems">
        {rotation.map((p, i) => (
          <span key={i} className={`gem${!f.isChoiceDay && f.boss === p && view.clock.phaseDay === i + 1 ? ' today' : ''}`} style={{ background: PERSONALITY_COLORS[p] }} title={`${i + 1}일차 ${names[p]}`}>
            {i + 1}
          </span>
        ))}
        <span className="gem multi" title={`${rules.final.bossChoiceDays.join('·')}일차 유저 선택`}>
          선택
        </span>
      </div>
      <div className="boss-today">
        {f.boss ? (
          <>
            오늘의 보스 <b style={{ color: PERSONALITY_COLORS[f.boss] }}>{names[f.boss]}</b>
            <span className={`affinity ${f.favorable ? 'good' : 'bad'}`}>{f.favorable ? '상성 유리' : '상성 불리'}</span>
          </>
        ) : (
          <span className="warn-text">오늘은 보스 성격을 직접 골라요</span>
        )}
      </div>
      {f.isChoiceDay && (
        <div className="boss-choice">
          {PERSONALITIES.map((p) => {
            const ok = f.availableBoss.includes(p);
            return (
              <button
                key={p}
                className={`gem big${f.boss === p ? ' today' : ''}`}
                style={{ background: PERSONALITY_COLORS[p] }}
                disabled={!ok || lockedBoss}
                title={!ok ? '다른 날에 이미 고른 성격' : lockedBoss ? '이미 입장해서 바꿀 수 없음' : `${names[p]} 보스 선택`}
                onClick={() => send({ type: 'chooseBoss', personality: p })}
              >
                {names[p]}
                {view.account.trained.includes(p) ? '★' : ''}
              </button>
            );
          })}
          <span className="small">★ 육성한 성격 · 6·7일차는 서로 다른 성격</span>
        </div>
      )}

      <div className="power">
        ⚔ <b>{f.expectedScore !== null ? num(f.expectedScore) : '-'}</b>
        <span className="small"> 예상 전투력</span>
      </div>

      {/* 가운데: 내 파티 (육성한 성격) */}
      <div className="party-stage">
        {view.account.trained.map((p, i) => (
          <div key={p} className="party-member" style={{ transform: `translateY(${(i % 2) * 34}px)` }}>
            <SaintFigure saint={-1} color={PERSONALITY_COLORS[p]} label={names[p]} height={200} />
          </div>
        ))}
      </div>

      {/* 왼쪽 아래: 투표 사도 표시 (항상 노출) */}
      <div className="vote-saint-box">
        <SaintPortrait saint={f.saint} size={64} />
        <div>
          <div className="small">투표 사도</div>
          <b>{SAINTS[f.saint]?.name}</b>
        </div>
      </div>
      <div className="party-left-btns">
        <button className="dark-btn" disabled title="프로토타입에서는 육성 성격으로 파티가 정해져요">
          덱 설정
        </button>
        <GuidePopup id="final" title="스테이지 정보" sections={finalGuide(rules)} />
      </div>

      {/* 오른쪽: 편성 목록 + 출발 */}
      <section className="roster">
        <div className="panel-head">
          <b>파티 편성</b>
          <span className="spacer" />
          <span className="pill-btn static">{SPEC_LABEL[view.account.spec]}</span>
          <span className="pill-btn static">전투력</span>
        </div>
        <div className="roster-grid">
          {PERSONALITIES.map((p) => {
            const trained = view.account.trained.includes(p);
            const power = Math.round(dmg.basePower[view.account.spec] * view.account.skill * (trained ? dmg.affinityMatch : dmg.affinityMismatch));
            return (
              <div key={p} className={`roster-card${trained ? ' on' : ''}${f.boss === p ? ' vs' : ''}`}>
                <div className="rc-art" style={{ background: `${PERSONALITY_COLORS[p]}55` }}>
                  <SaintFigure saint={-1} color={PERSONALITY_COLORS[p]} label={names[p]} height={86} shadow={!trained} />
                </div>
                <div className="rc-name">{names[p]} 파티</div>
                <div className="rc-power">{trained ? num(power) : '미육성'}</div>
              </div>
            );
          })}
        </div>
        <div className="roster-foot">
          <div className="entries">
            남은 입장 <b>{f.entriesLeft}/{f.entriesPerDay}</b>
          </div>
          <div className="today-scores small">
            {f.entriesToday > 0 ? `오늘: ${f.scores.slice(f.scores.length - f.entriesToday).map((x) => num(x)).join(' / ')}` : '오늘은 아직 입장하지 않았어요'}
            <br />
            누적 딜링 점수 <b>{num(f.total)}</b> ({f.scores.length}/{rules.final.days * rules.final.entriesPerDay}회)
          </div>
          <div className="row">
            <button className="sweep-btn" disabled={!f.canSweep} onClick={doSweep} title={f.entriesToday === 0 ? '오늘 1회 도전하면 소탕할 수 있어요' : `남은 ${f.entriesLeft}회를 ${num(f.lastScoreToday)}점으로 처리`}>
              소탕
            </button>
            <button className="go-btn" disabled={f.entriesLeft === 0 || !f.boss} onClick={start}>
              출발
            </button>
          </div>
        </div>
      </section>
      <p className="party-note">입장 1회당 {rules.final.votesPerEntry}표 · 딜량과 무관 · 남은 입장은 다음 날로 넘어가지 않아요 · 딜링 순위는 종료 후 공개</p>
    </div>
  );
}
