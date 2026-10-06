'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stats } from '../game/useGameState';

// 미션 목록. 목업 home.html 의 MISSION_TIERS 를 옮긴 것
// 단계가 오를수록 목표가 커지고 보상도 커진다. 보상은 그 단계에서 쓰는 캐시(돌봄 1회 10)보다 조금 많게.
// soon: 아직 없는 기능(초대·방문·선물·대전). 기능이 생기면 soon 만 지우면 된다
// TODO: 진행도와 받은 보상은 DB 가 붙으면 care_logs · cash_logs 등을 세서 계산 (지금은 브라우저에 저장)

export interface Reward { cash?: number; item?: string }
export interface Mission { id: string; icon: string; title: string; desc: string; goal: number; get: (s: Stats, level: number) => number; reward: Reward; soon?: boolean }
export interface Tier { lv: number; name: string; title: string; desc: string; bonus: number; missions: Mission[] }

const M = (id: string, icon: string, title: string, desc: string, goal: number, get: Mission['get'], reward: Reward, soon?: boolean): Mission =>
  ({ id, icon, title, desc, goal, get, reward, soon });
const careTotal = (s: Stats) => s.feed + s.clean + s.shower;
const level = (_: Stats, lv: number) => lv;

export const MISSION_TIERS: Tier[] = [
  { lv: 1, name: '입문', title: '튜토리얼', desc: '버튼을 하나씩 눌러 보며 익혀요', bonus: 50, missions: [
    M('t-feed', 'i-bowl', '첫 밥주기', '아래 밥주기 버튼을 눌러요', 1, s => s.feed, { cash: 15 }),
    M('t-clean', 'i-sparkle', '첫 청소', '아래 청소 버튼을 눌러요', 1, s => s.clean, { cash: 15 }),
    M('t-shower', 'i-drop', '첫 샤워', '아래 샤워 버튼을 눌러요', 1, s => s.shower, { cash: 15 }),
    M('t-shop', 'i-bag', '상점 구경', '오른쪽 위 상점을 열어 봐요', 1, s => s.shopOpen, { cash: 10 }),
    M('t-buy', 'i-coin', '첫 쇼핑', '상점에서 아무 물건이나 사요', 1, s => s.buy, { cash: 20, item: '하얀 벽 액자' }),
    M('t-custom', 'i-edit', '나만의 캐릭터', '캐릭터를 눌러 꾸미고 저장해요', 1, s => s.customSave, { cash: 20 }),
    M('t-mode', 'i-swords', '전쟁모드 구경', '위쪽 가운데 스위치를 눌러요', 1, s => s.modeSwitch, { cash: 10 }),
  ] },
  { lv: 2, name: '초보', title: '초보 집사', desc: '꾸준히 돌보고 첫 친구를 데려와요', bonus: 100, missions: [
    M('b-care', 'i-heart', '돌봄 10번', '밥주기·청소·샤워 아무거나', 10, careTotal, { cash: 60 }),
    M('b-feed', 'i-bowl', '밥주기 5번', '배고프지 않게 챙겨 줘요', 5, s => s.feed, { cash: 30 }),
    M('b-lv', 'i-star', '레벨 2 달성', '돌봄 10번마다 레벨이 올라요', 2, level, { cash: 80 }),
    M('b-clothes', 'i-shirt', '새 옷 사기', '상점에서 옷을 1벌 사요', 1, s => s.buyClothes, { item: '빨간 털모자' }),
    M('b-invite', 'i-invite', '첫 친구 초대', '초대 링크로 친구 1명을 데려와요', 1, s => s.invites, { cash: 100, item: '초록 화분' }, true),
  ] },
  { lv: 3, name: '숙련', title: '숙련 집사', desc: '친구들과 우정을 쌓아요', bonus: 200, missions: [
    M('s-care', 'i-heart', '돌봄 30번', '밥주기·청소·샤워 아무거나', 30, careTotal, { cash: 150 }),
    M('s-lv', 'i-star', '레벨 4 달성', '돌봄 10번마다 레벨이 올라요', 4, level, { cash: 150, item: '하얀 스탠드 조명' }),
    M('s-visit', 'i-home', '친구 집 방문 3번', '친구 집에 놀러 가요', 3, s => s.visits, { cash: 80 }, true),
    M('s-gift', 'i-gift', '선물 5번', '친구 펫에게 밥·청소를 대신 해 줘요', 5, s => s.gifts, { cash: 120, item: '원목 의자' }, true),
    M('s-invite', 'i-invite', '친구 3명 초대', '내 초대 링크로 3명을 데려와요', 3, s => s.invites, { cash: 250 }, true),
  ] },
  { lv: 4, name: '마스터', title: '클랜 마스터', desc: '클랜을 키우고 전쟁에서 이겨요', bonus: 500, missions: [
    M('m-care', 'i-heart', '돌봄 100번', '최고의 집사가 되어요', 100, careTotal, { cash: 500 }),
    M('m-lv', 'i-star', '레벨 8 달성', '돌봄 10번마다 레벨이 올라요', 8, level, { cash: 400 }),
    M('m-chain', 'i-link', '친구의 친구의 친구', '내 초대가 3단계까지 이어지게 해요', 3, s => s.chainDepth, { cash: 500, item: '푹신 소파' }, true),
    M('m-invite', 'i-invite', '친구 10명 초대', '내 초대 링크로 10명을 데려와요', 10, s => s.invites, { cash: 600 }, true),
    M('m-battle', 'i-swords', '대전 5번 승리', '전쟁모드에서 대전을 신청해요', 5, s => s.battleWins, { cash: 300 }, true),
    M('m-clan', 'i-shield', '클랜전 승리', '클랜원과 함께 클랜전에서 이겨요', 1, s => s.clanWins, { cash: 400 }, true),
  ] },
];

// 받은 보상·알린 미션을 기억하고, 새로 끝난 미션을 toast 로 알린다
export function useMissions(stats: Stats, lv: number, toast: (m: string) => void, grant: (r: Reward) => void) {
  const [saved, setSaved] = useState<{ claimed: string[]; bonus: number[]; seen: boolean }>(() => {
    const init = { claimed: [] as string[], bonus: [] as number[], seen: false };
    try { return { ...init, ...JSON.parse(localStorage.getItem('atlas.missions') || '{}') }; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem('atlas.missions', JSON.stringify(saved)); } catch { /* 무시 */ } }, [saved]);

  const progress = (m: Mission) => Math.min(m.goal, m.get(stats, lv));
  const isDone = (m: Mission) => progress(m) >= m.goal;
  const claimed = (id: string) => saved.claimed.includes(id);
  const bonusClaimed = (t: number) => saved.bonus.includes(t);
  const unlocked = (t: number) => t === 1 || bonusClaimed(t - 1);
  const allClaimed = (t: Tier) => t.missions.every(m => m.soon || claimed(m.id));
  // 그 단계에서 지금 받을 수 있는 보상 수 (미션 + 보너스)
  const claimable = (t: Tier) => !unlocked(t.lv) ? 0
    : t.missions.filter(m => !m.soon && isDone(m) && !claimed(m.id)).length + (allClaimed(t) && !bonusClaimed(t.lv) ? 1 : 0);
  const count = MISSION_TIERS.reduce((s, t) => s + claimable(t), 0);
  const badge = count ? String(count) : saved.seen ? '' : '!';

  // 행동 뒤에 새로 끝난 미션 알림 (한 번씩만)
  const notified = useRef(new Set<string>());
  const first = useRef(true);
  useEffect(() => {
    MISSION_TIERS.forEach(t => {
      if (!unlocked(t.lv)) return;
      t.missions.forEach(m => {
        if (m.soon || !isDone(m) || claimed(m.id) || notified.current.has(m.id)) return;
        notified.current.add(m.id);
        if (!first.current) toast(`미션 완료! ${m.title}`);   // 처음 열 때 이미 끝나 있던 것은 조용히
      });
    });
    first.current = false;
  });   // 매 렌더: 진행도가 바뀌면 바로 확인

  const claim = useCallback((m: Mission) => {
    setSaved(s => ({ ...s, claimed: [...s.claimed, m.id] }));
    grant(m.reward);
  }, [grant]);
  const claimBonus = useCallback((t: Tier) => {
    setSaved(s => ({ ...s, bonus: [...s.bonus, t.lv] }));
    grant({ cash: t.bonus });
    if (t.lv < MISSION_TIERS.length) toast(`Lv.${t.lv + 1} ${MISSION_TIERS[t.lv].name} 미션이 열렸어요!`);
  }, [grant, toast]);
  const markSeen = useCallback(() => setSaved(s => (s.seen ? s : { ...s, seen: true })), []);

  return { progress, isDone, claimed, bonusClaimed, unlocked, claimable, badge, claim, claimBonus, markSeen };
}
export type MissionState = ReturnType<typeof useMissions>;
