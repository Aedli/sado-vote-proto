// 플레이스홀더 사도 데이터 생성 (SPEC §2). 이름·소속·대사·이미지는 saints.json에서 직접 교체한다.
// popularity·fervor는 시드마다 시뮬레이션에서 생성하므로 파일에 넣지 않는다(넣으면 그 값을 덮어쓰기로 사용).
import { writeFileSync } from 'node:fs';

const COUNT = 114;
const PERSONALITIES = ['P1', 'P2', 'P3', 'P4', 'P5'];
const saints = Array.from({ length: COUNT }, (_, i) => {
  const no = String(i + 1).padStart(3, '0');
  return {
    id: `s${no}`,
    name: `사도 ${no}`,
    title: '세계수 교단 소속',
    personality: PERSONALITIES[i % PERSONALITIES.length],
    image: null,
    lines: {
      prelimSelect: `사도 ${no}에게 한 표 부탁드려요!`,
      missionIdle: '오늘의 미션, 같이 해 봐요.',
      finalSelect: '본선까지 올라왔어요. 끝까지 함께해 주실 거죠?',
      victory: '교주님 덕분이에요. 정말 고마워요!',
    },
  };
});
writeFileSync(new URL('../src/config/saints.json', import.meta.url), JSON.stringify(saints, null, 2) + '\n');
console.log(`saints.json: ${saints.length}명 생성`);
