'use client';

import { useState } from 'react';
import { Pet } from '@/types/pet';
import Icon from './ui/Icon';
import Sheet, { SheetHead, Wallet } from './ui/Sheet';
import Character from './character/Character';
import { CharConfig, Equip } from './character/charConfig';
import { useGame } from './game/GameContext';

interface FriendsProps {
  pet: Pet;
  onPetUpdate: (pet: Pet) => void;
  onClose: () => void;
}

const GIFT_COST = 10;   // 선물(밥·청소·샤워 대신 해 주기) 1번
const GIFTS = [
  { action: 'feed', label: '밥', icon: 'i-bowl', color: 'bg-[#ffe9d8] text-[#f07a2a]' },
  { action: 'clean', label: '청소', icon: 'i-sparkle', color: 'bg-[#e6f6e9] text-[#2fa860]' },
  { action: 'shower', label: '샤워', icon: 'i-drop', color: 'bg-[#e3efff] text-[#3f7cf0]' },
] as const;

// 예시 친구 (DB 연결 전 화면 확인용)
// TODO: players(invited_by_id) 로 초대 트리를, visit_logs 로 애정을 읽어 온다 (src/lib/clan.ts · visit.ts, 조원영 담당)
interface Friend { id: string; name: string; level: number; love: number; depth: number; cfg: CharConfig; equip?: Equip }
const DEMO: Friend[] = [
  { id: 'f1', name: '원영', level: 3, love: 12, depth: 1, cfg: { species: 'sheep' }, equip: { head: '분홍 리본 머리띠' } },
  { id: 'f2', name: '연준', level: 5, love: 30, depth: 1, cfg: { species: 'bear' }, equip: { head: '기사 투구' } },
  { id: 'f3', name: '민지', level: 2, love: 4, depth: 2, cfg: { species: 'chick' }, equip: { face: '검은 동그란 안경' } },
  { id: 'f4', name: '도윤', level: 1, love: 0, depth: 3, cfg: { species: 'rabbit' } },
];

// 화면 2·3: 친구 집 방문·선물 / 초대 링크·초대 트리·클랜
export default function Friends({ pet, onPetUpdate, onClose }: FriendsProps) {
  const game = useGame();
  const [tab, setTab] = useState<'friends' | 'clan'>('friends');
  const [shake, setShake] = useState(0);

  const visit = (f: Friend) => {
    // TODO: visit_logs 에 action_type 'visit' 로 저장
    game.bump('visits');
    game.toast(`${f.name}님 집에 놀러 왔어요`);
  };

  const gift = (f: Friend, g: typeof GIFTS[number]) => {
    const now = game.getPet();
    if (now.cash < GIFT_COST) { setShake(n => n + 1); game.openTopup(GIFT_COST, 'gift'); return; }
    // TODO: visit_logs 에 action_type feed / clean / shower, cash_logs 에 reason 'gift' 로 저장
    onPetUpdate({ ...now, cash: now.cash - GIFT_COST });
    game.bump('gifts');
    game.toast(`${f.name}님 펫에게 ${g.label} 선물! 우정 +1`);
  };

  return (
    <Sheet onClose={onClose} labelledBy="friendsTitle">
      <SheetHead id="friendsTitle" title="친구"><Wallet cash={pet.cash} shake={shake} className="ml-auto" /></SheetHead>

      <div role="tablist" className="relative mx-4 grid grid-cols-2 rounded-2xl bg-(--chip-bg) p-1">
        <span className="absolute top-1 left-1 h-[38px] w-[calc((100%-8px)/2)] rounded-xl bg-(--card) shadow-[0_2px_6px_rgba(0,0,0,.08)] transition-transform duration-300 ease-[cubic-bezier(.3,1.2,.5,1)]"
          style={{ transform: `translateX(${tab === 'clan' ? 100 : 0}%)` }} />
        {([['friends', '친구 집', 'i-home'], ['clan', '초대 · 클랜', 'i-link']] as const).map(([k, label, icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className="relative flex h-[38px] items-center justify-center gap-[5px] text-[13px] font-bold text-(--ink-2) transition-colors aria-selected:text-(--ink)">
            <Icon name={icon} className="size-4" />{label}
          </button>
        ))}
      </div>

      <div key={tab} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3 pb-5">
        <p className="rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-[11px] font-bold text-(--ink-2)">
          예시 친구예요. 초대 기능이 연결되면 실제 친구로 바뀌어요
        </p>
        {tab === 'friends'
          ? DEMO.map((f, i) => <FriendCard key={f.id} f={f} i={i} war={game.war} onVisit={visit} onGift={gift} onBattle={() => game.toast('대전은 다음 단계에서 만들어요')} />)
          : <ClanTab pet={pet} cfg={game.cfg} equip={game.equip} />}
      </div>
    </Sheet>
  );
}

function FriendCard({ f, i, war, onVisit, onGift, onBattle }: {
  f: Friend; i: number; war: boolean;
  onVisit: (f: Friend) => void; onGift: (f: Friend, g: typeof GIFTS[number]) => void; onBattle: () => void;
}) {
  return (
    <article style={{ animationDelay: `${i * 30}ms` }} className="animate-pop rounded-2xl bg-(--card) p-3 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
      <div className="flex items-center gap-3">
        <span className="size-11 flex-none overflow-hidden rounded-full bg-linear-135 from-[#ffe1ec] to-[#e4dcff]">
          <Character cfg={f.cfg} equip={f.equip} headOnly className="size-full" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold">{f.name} <span className="text-[11px] font-bold text-(--ink-2)">Lv.{f.level}</span></div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-(--ink-2)">
            <Icon name="i-heart" className="size-3 text-[#ff5d86]" />애정 {f.love} · 초대 {f.depth}단계
          </div>
        </div>
        <button onClick={() => onVisit(f)} className="flex h-8 items-center gap-1 rounded-[10px] bg-(--chip-bg) px-3 text-xs font-extrabold transition-transform active:scale-94">
          <Icon name="i-home" className="size-3.5" />놀러 가기
        </button>
      </div>
      <div className="mt-2.5 flex gap-1.5">
        {war ? (
          <button onClick={onBattle} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-[rgba(255,93,108,.18)] text-xs font-extrabold text-[#ff8791] transition-transform active:scale-97">
            <Icon name="i-swords" className="size-4" />대전 신청
          </button>
        ) : GIFTS.map(g => (
          <button key={g.action} onClick={() => onGift(f, g)} aria-label={`${f.name}님에게 ${g.label} 선물`}
            className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-xl text-xs font-extrabold transition-transform active:scale-95 ${g.color}`}>
            <Icon name={g.icon} className="size-4" />{g.label}
            <span className="flex items-center gap-0.5 text-[10px] opacity-75"><Icon name="i-coin" className="size-2.5" />{GIFT_COST}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function ClanTab({ pet, cfg, equip }: { pet: Pet; cfg: CharConfig; equip: Equip }) {
  const game = useGame();
  // TODO: 초대 코드는 players.invite_code, 클랜은 clans.name, 전적은 battle_logs 를 clan_id 로 센 승리 수 (plan.md)
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/?invite=${pet.userId.replace(/^user_/, '')}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); game.toast('초대 링크를 복사했어요'); }
    catch { game.toast('복사하지 못했어요. 링크를 길게 눌러 복사해 주세요'); }
  };
  const tree = [1, 2, 3].map(d => DEMO.filter(f => f.depth === d));

  return (
    <>
      <section className="rounded-[18px] bg-linear-135 from-[#9585ff] to-[#6c5cf0] p-3.5 text-white shadow-[0_6px_16px_rgba(108,92,240,.25)] war:from-[#ff7a6b] war:to-[#c8364a]">
        <h3 className="flex items-center gap-1.5 text-base font-extrabold"><Icon name="i-invite" className="size-[18px]" />내 초대 링크</h3>
        <p className="mt-0.5 text-xs opacity-85">링크로 들어온 친구는 내 클랜에 들어올지 직접 골라요</p>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-[10px] bg-white/20 px-2.5 py-2 text-xs font-bold select-all">{link}</span>
          <button onClick={copy} className="h-[34px] flex-none rounded-[10px] bg-white px-3 text-xs font-extrabold text-[#6c5cf0] war:text-[#c8364a]">복사</button>
        </div>
      </section>

      <section className="rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Icon name="i-shield" className="size-4 text-(--primary)" />{pet.name}의 클랜</h3>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center">
          {[['클랜원', `${DEMO.length + 1}명`], ['클랜전 승리', '0승'], ['가장 먼 초대', '3단계']].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-(--chip-bg) py-2">
              <b className="block text-[15px] font-extrabold tabular-nums">{v}</b>
              <span className="text-[10px] font-bold text-(--ink-2)">{k}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Icon name="i-link" className="size-4 text-(--primary)" />초대 트리</h3>
        <p className="mt-0.5 text-[11px] font-semibold text-(--ink-2)">친구의 친구의 친구까지 이어져요</p>
        <ol className="mt-3 flex flex-col gap-2">
          <TreeRow depth={0} name={`${pet.name} (나)`} cfg={cfg} equip={equip} />
          {tree.flatMap(level => level.map(f => <TreeRow key={f.id} depth={f.depth} name={f.name} cfg={f.cfg} equip={f.equip} />))}
        </ol>
      </section>
    </>
  );
}

function TreeRow({ depth, name, cfg, equip }: { depth: number; name: string; cfg: CharConfig; equip?: Equip }) {
  return (
    <li className="flex items-center gap-2" style={{ paddingLeft: depth * 18 }}>
      {depth > 0 && <span className="h-3.5 w-2.5 flex-none rounded-bl-md border-b-2 border-l-2 border-(--track)" />}
      <span className="size-7 flex-none overflow-hidden rounded-full bg-linear-135 from-[#ffe1ec] to-[#e4dcff]">
        <Character cfg={cfg} equip={equip} headOnly className="size-full" />
      </span>
      <span className="text-[13px] font-bold">{name}</span>
      {depth > 0 && <span className="ml-auto rounded-md bg-(--chip-bg) px-1.5 py-0.5 text-[10px] font-extrabold text-(--ink-2)">{depth}단계</span>}
    </li>
  );
}
