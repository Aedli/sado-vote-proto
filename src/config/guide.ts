// 유저용 게임 안내 (부록 B26). 예선·본선 첫 진입 시 팝업 1회, 이후 ? 버튼.
// 유저 시점이므로 순위·득표·판 규모는 언급하지 않는다. 숫자는 규칙 설정에서 읽는다.

import type { RulesConfig } from './rules';

export interface GuideSection {
  title: string;
  lines: string[];
}

export function prelimGuide(r: RulesConfig): GuideSection[] {
  const p = r.prelim;
  const perDay = p.missionCount * p.votesPerMission;
  return [
    {
      title: '예선은 이렇게 진행돼요',
      lines: [
        `예선은 ${p.days}일 동안 열리고, 모든 사도 중 ${p.finalistCount}명이 본선에 진출해요.`,
        '매일 응원할 사도를 한 명 고르고, 일일 미션을 하면 그 사도에게 표가 들어가요.',
      ],
    },
    {
      title: '표를 얻는 법',
      lines: [
        `일일 미션 ${p.missionCount}개를 완료하고 보상을 받으면 미션마다 ${p.votesPerMission}표씩, 하루 최대 ${perDay}표를 얻어요.`,
        '사도를 고른 뒤 보상을 받는 순간 표가 자동으로 그 사도에게 들어가요. 재화를 쓰거나 따로 확인할 필요는 없어요.',
        '사도를 고르지 않으면 보상을 받을 수 없어요.',
      ],
    },
    {
      title: '꼭 알아 두세요',
      lines: [
        p.reselect === 'daily'
          ? '응원 사도는 매일 다시 고를 수 있지만, 하루에 한 명만 정할 수 있고 정한 뒤에는 그날 바꿀 수 없어요.'
          : '처음 고른 사도로 예선 내내 응원해요.',
        '그날 받지 않은 표는 다음 날로 넘어가지 않고 사라져요. 하루가 끝나기 전에 꼭 받으세요.',
        '중간에 참여해도 남은 기간만큼 똑같이 표를 받을 수 있어요.',
        '예선 순위와 득표는 공개되지 않아요. 내가 투표한 기록과 남은 기간만 볼 수 있어요.',
      ],
    },
  ];
}

export function finalGuide(r: RulesConfig): GuideSection[] {
  const f = r.final;
  return [
    {
      title: '본선은 이렇게 진행돼요',
      lines: [
        `본선은 ${f.days}일 동안 열리고, 예선을 통과한 ${r.prelim.finalistCount}명 중 수석 사도 한 명을 뽑아요.`,
        '예선에서 얻은 표는 본선으로 넘어가지 않아요. 예선에 참여하지 않았어도 본선에 참여할 수 있어요.',
      ],
    },
    {
      title: '응원 사도는 한 번만 정해요',
      lines: ['본선에 처음 들어올 때 응원 사도를 고르면 본선이 끝날 때까지 바꿀 수 없어요.'],
    },
    {
      title: '보스전으로 표를 얻어요',
      lines: [
        `보스전에 하루 ${f.entriesPerDay}번 들어갈 수 있고, 한 번 들어갈 때마다 ${f.votesPerEntry}표가 응원 사도에게 들어가요. 표는 딜량과 상관없이 똑같아요.`,
        '남은 입장 횟수는 다음 날로 넘어가지 않아요. 입장권을 따로 살 수도 없어요.',
        '그날 한 번 직접 도전하면, 남은 횟수는 직전 기록으로 "소탕"할 수 있어요. 다시 도전해서 기록을 새로 낼 수도 있어요.',
      ],
    },
    {
      title: '보스 성격',
      lines: [
        `1~${f.bossRotation.length}일차에는 모두 같은 순서로 보스 성격이 바뀌어요. ${f.bossChoiceDays.join('·')}일차에는 내가 보스 성격을 고르는데, 두 날은 서로 다른 성격이어야 해요.`,
        '내가 육성한 성격의 보스라면 더 큰 딜을 넣을 수 있어요.',
      ],
    },
    {
      title: '딜링 순위 보상',
      lines: [
        `${f.days * f.entriesPerDay}번의 입장 점수를 모두 더한 딜링 점수로, 같은 사도를 응원한 교주끼리 순위를 겨뤄요.`,
        '순위에 따라 이름표 배경·테두리와 재화를 받아요. 보스전에 한 번이라도 참여하면 참가상을 받아요.',
        '딜링 순위는 이벤트가 끝날 때까지 공개되지 않아요.',
      ],
    },
  ];
}
