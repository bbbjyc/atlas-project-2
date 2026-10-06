'use client';

import { useState } from 'react';
import { Pet } from '@/types/pet';
import Icon from './ui/Icon';
import Sheet, { SheetHead, Wallet } from './ui/Sheet';
import Character from './character/Character';
import { CharConfig, Equip } from './character/charConfig';
import { useGame } from './game/GameContext';
import { BattleKind, formatRemaining, pvpCooldownLeft } from '@/lib/war';
import BattleSheet from './war/BattleSheet';
import type { WarMember } from './war/demo';
import ClanPanel from './war/ClanPanel';
import ClanWarCard from './war/ClanWarCard';
import { useNow } from './war/useNow';
import { useWar, WarApi } from './war/useWar';
import { removeFriend } from '@/lib/friends';
import type { PlayerRow } from '@/lib/auth';
import { useAccount } from './auth/AccountContext';
import AddFriendPanel from './friends/AddFriendPanel';
import FriendAvatar, { speciesForPlayer } from './friends/FriendAvatar';
import FriendRemove from './friends/FriendRemove';
import { FriendsEmpty, FriendsLoadError, FriendsLoading } from './friends/FriendStatus';
import { copyText } from './friends/clipboard';
import { useFriendData } from './friends/useFriendData';

interface FriendsProps {
  pet: Pet;
  onPetUpdate: (pet: Pet) => void;
  onClose: () => void;
  initialTab?: 'friends' | 'clan';   // 어느 탭으로 열지 (전쟁모드 아래쪽 '클랜전' 버튼은 클랜 탭으로)
}

const GIFT_COST = 10;   // 선물(밥·청소·샤워 대신 해 주기) 1번
const GIFTS = [
  { action: 'feed', label: '밥', icon: 'i-bowl', color: 'bg-[#ffe9d8] text-[#f07a2a]' },
  { action: 'clean', label: '청소', icon: 'i-sparkle', color: 'bg-[#e6f6e9] text-[#2fa860]' },
  { action: 'shower', label: '샤워', icon: 'i-drop', color: 'bg-[#e3efff] text-[#3f7cf0]' },
] as const;

// 예시 친구 (DB 연결 전 화면 확인용)
// TODO: players(invited_by_id) 로 초대 트리를, visit_logs 로 애정을 읽어 온다 (src/lib/clan.ts · visit.ts, 조원영 담당)
// 실제 친구(players)는 레벨·애정·초대 단계를 아직 읽어 오지 않으므로 비워 둔다 (playerId 가 있으면 실제 친구)
interface Friend { id: string; name: string; level?: number; love?: number; depth?: number; cfg: CharConfig; equip?: Equip; playerId?: number }
const toFriend = (p: PlayerRow): Friend => ({ id: String(p.id), playerId: p.id, name: p.nickname, cfg: { species: speciesForPlayer(p.id) } });
const DEMO: (Friend & { level: number; love: number; depth: number })[] = [
  { id: 'f1', name: '원영', level: 3, love: 12, depth: 1, cfg: { species: 'sheep' }, equip: { head: '분홍 리본 머리띠' } },
  { id: 'f2', name: '연준', level: 5, love: 30, depth: 1, cfg: { species: 'bear' }, equip: { head: '기사 투구' } },
  { id: 'f3', name: '민지', level: 2, love: 4, depth: 2, cfg: { species: 'chick' }, equip: { face: '검은 동그란 안경' } },
  { id: 'f4', name: '도윤', level: 1, love: 0, depth: 3, cfg: { species: 'rabbit' } },
];

// 화면 2·3: 친구 집 방문·선물 / 초대 링크·초대 트리·클랜
export default function Friends({ pet, onPetUpdate, onClose, initialTab = 'friends' }: FriendsProps) {
  const game = useGame();
  const [tab, setTab] = useState<'friends' | 'add' | 'clan'>(initialTab);
  const [shake, setShake] = useState(0);
  const me = useAccount()?.player ?? null;          // 로그인한 내 플레이어. 없으면 예시 친구만 보여 준다
  const data = useFriendData(me?.id ?? null);

  // 전쟁모드: 대전·클랜전 (src/components/war). 열기 전에 자는 중·피로·쿨타임·캐시를 확인한다
  const wr = useWar(game);
  const [battle, setBattle] = useState<{ kind: BattleKind; foe: WarMember | null } | null>(null);
  const now = useNow(1000, game.war && wr.state.lastPvpAt > 0);   // 대전 쿨타임 글자를 1초마다 (대전을 한 적이 있을 때만)
  const pvpLeft = game.war ? pvpCooldownLeft(wr.state.lastPvpAt || null, now) : 0;
  // 실제 친구는 레벨을 아직 읽어 오지 않으므로(plan.md: 친구 레벨 계산은 나중에) 내 레벨을 기준으로 상대 레벨을 맞춘다
  const challenge = (f: Friend) => { if (wr.checkReady('pvp')) setBattle({ kind: 'pvp', foe: { id: f.id, name: f.name, cfg: f.cfg, level: f.level ?? game.getPet().level } }); };
  const startClanWar = () => { if (wr.checkReady('clanwar')) setBattle({ kind: 'clanwar', foe: null }); };

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

  const remove = async (f: Friend) => {
    if (!me || f.playerId === undefined) return;
    await removeFriend(me.id, f.playerId);          // 실패하면 오류가 FriendRemove 에 보인다
    game.toast(`${f.name}님과 친구를 끊었어요`);
    await data.reload();
  };

  const TABS = [['friends', '친구 집', 'i-home'], ['add', '친구 추가', 'i-plus'], ['clan', '초대 · 클랜', 'i-link']] as const;
  const real = me ? data.friends.map(toFriend) : null;   // null 이면 예시 친구

  return (
    <>
    {/* 대전 창이 위에 열려 있는 동안은 친구 창을 막는다 (터치·키보드·Esc 는 대전 창이 받는다) */}
    <div className="contents" inert={battle !== null}>
    <Sheet onClose={onClose} labelledBy="friendsTitle">
      <SheetHead id="friendsTitle" title="친구"><Wallet cash={pet.cash} shake={shake} className="ml-auto" /></SheetHead>

      <div role="tablist" className="relative mx-4 grid grid-cols-3 rounded-2xl bg-(--chip-bg) p-1">
        <span className="absolute top-1 left-1 h-[38px] w-[calc((100%-8px)/3)] rounded-xl bg-(--card) shadow-[0_2px_6px_rgba(0,0,0,.08)] transition-transform duration-300 ease-[cubic-bezier(.3,1.2,.5,1)]"
          style={{ transform: `translateX(${TABS.findIndex(t => t[0] === tab) * 100}%)` }} />
        {TABS.map(([k, label, icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className="relative flex h-[38px] items-center justify-center gap-1 text-[13px] font-bold whitespace-nowrap text-(--ink-2) transition-colors aria-selected:text-(--ink)">
            <Icon name={icon} className="size-4" />{label}
            {k === 'add' && data.incoming.length > 0 && (
              <span aria-label={`받은 요청 ${data.incoming.length}개`} className="absolute top-0 right-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-lg bg-(--accent) px-1 text-[9px] font-extrabold text-white">{data.incoming.length}</span>
            )}
          </button>
        ))}
      </div>

      <div key={tab} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3 pb-5">
        {(tab === 'clan' || (tab === 'friends' && !real)) && (
          <p className="rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-[11px] font-bold text-(--ink-2)">
            예시 친구예요. 초대 기능이 연결되면 실제 친구로 바뀌어요
          </p>
        )}
        {tab === 'add' ? (
          me ? <AddFriendPanel me={me} data={data} toast={game.toast} />
            : <p className="rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-[12px] font-bold text-(--ink-2)">로그인하면 친구를 추가할 수 있어요</p>
        ) : tab === 'clan' ? <ClanTab pet={pet} cfg={game.cfg} equip={game.equip} wr={wr} war={game.war} onClanWar={startClanWar} />
          : !real ? DEMO.map((f, i) => <FriendCard key={f.id} f={f} i={i} war={game.war} pvpLeft={pvpLeft} onVisit={visit} onGift={gift} onBattle={() => challenge(f)} />)
          : !data.loaded ? (data.error ? <FriendsLoadError message={data.error} onRetry={() => void data.reload()} /> : <FriendsLoading />)
          : (
            <>
              {data.error && <FriendsLoadError message={data.error} onRetry={() => void data.reload()} />}
              {data.incoming.length > 0 && (
                <button type="button" onClick={() => setTab('add')}
                  className="flex items-center gap-1.5 rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-left text-[12px] font-extrabold">
                  <Icon name="i-invite" className="size-4 flex-none text-(--primary)" />받은 친구 요청이 {data.incoming.length}개 있어요
                  <span className="ml-auto text-(--primary)">보러 가기</span>
                </button>
              )}
              {real.length === 0
                ? <FriendsEmpty onAdd={() => setTab('add')} />
                : real.map((f, i) => <FriendCard key={f.id} f={f} i={i} war={game.war} pvpLeft={pvpLeft} onVisit={visit} onGift={gift} onBattle={() => challenge(f)} onRemove={remove} />)}
            </>
          )}
      </div>
    </Sheet>
    </div>
    {battle && (
      <BattleSheet kind={battle.kind} foe={battle.foe} allies={DEMO.filter(f => f.id !== battle.foe?.id)} wr={wr} onClose={() => setBattle(null)} />
    )}
    </>
  );
}

function FriendCard({ f, i, war, pvpLeft, onVisit, onGift, onBattle, onRemove }: {
  f: Friend; i: number; war: boolean; pvpLeft: number;   // pvpLeft: 대전 쿨타임이 남은 밀리초 (0 이면 바로 신청)
  onVisit: (f: Friend) => void; onGift: (f: Friend, g: typeof GIFTS[number]) => void; onBattle: () => void;
  onRemove?: (f: Friend) => Promise<void>;   // 실제 친구에게만: 친구 끊기
}) {
  return (
    <article style={{ animationDelay: `${i * 30}ms` }} className="animate-pop rounded-2xl bg-(--card) p-3 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
      <div className="flex items-center gap-3">
        {f.playerId !== undefined ? <FriendAvatar id={f.playerId} /> : (
          <span className="size-11 flex-none overflow-hidden rounded-full bg-linear-135 from-[#ffe1ec] to-[#e4dcff]">
            <Character cfg={f.cfg} equip={f.equip} headOnly className="size-full" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold">{f.name} {f.level !== undefined && <span className="text-[11px] font-bold text-(--ink-2)">Lv.{f.level}</span>}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-(--ink-2)">
            <Icon name="i-heart" className="size-3 text-[#ff5d86]" />{f.love === undefined ? '친구' : `애정 ${f.love} · 초대 ${f.depth}단계`}
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
            {pvpLeft > 0 && <span className="text-[10px] font-bold opacity-75">· {formatRemaining(pvpLeft)} 뒤</span>}
          </button>
        ) : GIFTS.map(g => (
          <button key={g.action} onClick={() => onGift(f, g)} aria-label={`${f.name}님에게 ${g.label} 선물`}
            className={`flex h-9 flex-1 items-center justify-center gap-1 rounded-xl text-xs font-extrabold transition-transform active:scale-95 ${g.color}`}>
            <Icon name={g.icon} className="size-4" />{g.label}
            <span className="flex items-center gap-0.5 text-[10px] opacity-75"><Icon name="i-coin" className="size-2.5" />{GIFT_COST}</span>
          </button>
        ))}
      </div>
      {onRemove && <FriendRemove name={f.name} onConfirm={() => onRemove(f)} />}
    </article>
  );
}

function ClanTab({ pet, cfg, equip, wr, war, onClanWar }: { pet: Pet; cfg: CharConfig; equip: Equip; wr: WarApi; war: boolean; onClanWar: () => void }) {
  const game = useGame();
  // TODO: 클랜은 clans.name, 전적은 battle_logs 를 clan_id 로 센 승리 수 (plan.md)
  const code = useAccount()?.player.invite_code ?? pet.userId.replace(/^user_/, '');   // 로그인하면 players.invite_code
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/?invite=${code}`;
  const copy = async () => {
    game.toast(await copyText(link) ? '초대 링크를 복사했어요' : '복사하지 못했어요. 링크를 길게 눌러 복사해 주세요');
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
          {[['클랜원', `${DEMO.length + 1}명`], ['클랜전 승리', `${wr.state.record.clanWins}승`], ['가장 먼 초대', '3단계']].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-(--chip-bg) py-2">
              <b className="block text-[15px] font-extrabold tabular-nums">{v}</b>
              <span className="text-[10px] font-bold text-(--ink-2)">{k}</span>
            </div>
          ))}
        </div>
      </section>

      <ClanPanel wr={wr} members={DEMO.length + 1} war={war} />
      {war && <ClanWarCard wr={wr} onStart={onClanWar} />}

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
