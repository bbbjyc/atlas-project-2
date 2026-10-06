'use client';

import { useCallback, useRef, useState } from 'react';
import { Pet } from '@/types/pet';
import Icon from './ui/Icon';
import Character from './character/Character';
import CustomSheet from './character/CustomSheet';
import { CharConfig, loadCfg, saveCfg } from './character/charConfig';
import RoomBackground from './game/RoomBackground';
import { GameApi, GameProvider, ShortageReason, useToastQueue } from './game/GameContext';
import { CareAction, COST, useGameState } from './game/useGameState';
import { Reward, useMissions } from './missions/missions';
import Shop from './Shop';
import Missions from './Missions';
import Friends from './Friends';
import TopupPopup, { logFakeDoor, TopupCtx } from './TopupPopup';

interface GameScreenProps {
  pet: Pet;
}

const CARES: { action: CareAction; label: string; icon: string; color: string }[] = [
  { action: 'feed', label: '밥주기', icon: 'i-bowl', color: 'bg-[#ffe9d8] text-[#f07a2a]' },
  { action: 'clean', label: '청소', icon: 'i-sparkle', color: 'bg-[#e6f6e9] text-[#2fa860]' },
  { action: 'shower', label: '샤워', icon: 'i-drop', color: 'bg-[#e3efff] text-[#3f7cf0]' },
];
type SheetName = 'custom' | 'shop' | 'missions' | 'friends' | null;
const BUFF: Record<string, [string, string]> = {
  atk: ['bg-[rgba(255,93,108,.18)] text-[#ff8791]', '전투력'], def: ['bg-[rgba(93,140,255,.2)] text-[#8fb2ff]', '방어력'], regen: ['bg-[rgba(46,196,166,.2)] text-[#5fd3b5]', '재생'],
};

// HUD 스탯 한 줄의 아이콘 칩
const chip = 'grid size-6 flex-none place-items-center rounded-lg war:bg-white/8';
const chipIcon = 'size-3.5 stroke-[2.3]!';

export default function GameScreen({ pet: initialPet }: GameScreenProps) {
  const { msg, on, toast } = useToastQueue();
  const [war, setWar] = useState(false);
  const game = useGameState(initialPet, toast, war);
  const { pet, getPet, updatePet, bump, addCash, own, care, cooldowns } = game;
  const [cfg, setCfg] = useState<CharConfig>(loadCfg);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [topup, setTopup] = useState<TopupCtx | null>(null);

  // 애니메이션 다시 틀기용 번호 (바뀔 때마다 처음부터)
  const [hop, setHop] = useState(0);
  const [hopping, setHopping] = useState(false);
  const [flash, setFlash] = useState(0);
  const [cashShake, setCashShake] = useState(0);
  const [floats, setFloats] = useState<{ id: number; text: string; color: string }[]>([]);
  const floatId = useRef(0);
  const doHop = () => { setHop(n => n + 1); setHopping(true); };

  // 미션 보상: 캐시 + 아이템(상점에서 '보유'로 표시)
  const grant = useCallback((r: Reward) => {
    if (r.cash) addCash(r.cash);
    if (r.item) own(r.item);
    toast(`보상: ${[r.cash && `${r.cash} 캐시`, r.item].filter(Boolean).join(' + ')}`);
  }, [addCash, own, toast]);
  const ms = useMissions(game.stats, pet.level, toast, grant, war);

  const float = useCallback((text: string, color: string, delay = 0) => {
    window.setTimeout(() => {
      const id = ++floatId.current;
      setFloats(f => [...f, { id, text, color }]);
      window.setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1000);
    }, delay);
  }, []);

  // ── 충전 팝업 (페이크 도어) ──
  // shortage_reason 은 NOT NULL 이라, 상점에서 직접 연 경우도 buy_item 으로 남긴다
  // 이미 떠 있으면 다시 열지도, 다시 기록하지도 않는다
  const topupOpen = useRef(false);
  const openTopup = useCallback((need = 0, reason: ShortageReason = 'buy_item') => {
    if (topupOpen.current) return;
    topupOpen.current = true;
    setTopup({ need, reason });
    logFakeDoor('popup_shown', null, reason);
  }, []);
  // 프리미엄 결제: 충전 목록 없이 바로 "준비 중". tier 에 premium:아이템이름 을 남긴다
  const openSoon = useCallback((tier: string) => {
    if (topupOpen.current) return;
    topupOpen.current = true;
    setTopup({ need: 0, reason: 'buy_item', soon: true });
    logFakeDoor('tier_clicked', tier, 'buy_item');
  }, []);
  const closeTopup = useCallback(() => { topupOpen.current = false; setTopup(null); }, []);

  // useGameState의 care 함수 사용 (애완모드 규칙 적용)
  const doCare = (action: 'feed' | 'clean' | 'shower' | 'sleep' | 'wake' | 'play', label?: string) => {
    const before = pet.level;
    care(action);
    doHop();
    if (label) {
      float(`${label}!`, '#7c6cf6');
      float(`-${action === 'sleep' || action === 'wake' ? 0 : 10}`, '#e0950e', 180);
    }
    const lv = pet.level > before ? pet.level : 0;
    if (lv) toast(`레벨 업! Lv.${lv}`);
  };

  const toggleMode = () => {
    setWar(!war);
    setFlash(n => n + 1);
    toast(war ? '애완모드로 전환했어요' : '전쟁모드로 전환했어요');
    bump('modeSwitch');
  };

  const closeSheet = useCallback(() => setSheet(null), []);
  const onPetUpdate = useCallback((p: Pet) => updatePet(() => p), [updatePet]);
  const saveCustom = (next: CharConfig) => {
    setCfg(next); saveCfg(next);
    doHop();
    toast('캐릭터를 저장했어요');
    bump('customSave');
  };

  const api: GameApi = { ...game, war, cfg, openTopup, openSoon };
  const soon = (what: string) => () => toast(`${what}은 다음 단계에서 만들어요`);

  return (
    <GameProvider value={api}>
      <main className={`room relative isolate h-dvh w-full max-w-[430px] overflow-hidden text-(--ink) ${war ? 'war' : ''}`}>
        <RoomBackground war={war} />

        {/* 뒤쪽 HUD: 창이나 팝업이 열려 있으면 터치·키보드를 막는다 */}
        <div className="contents" inert={sheet !== null || topup !== null}>
          {/* 캐릭터 · 누르면 꾸미기 */}
          <button aria-label="캐릭터 꾸미기 열기" aria-haspopup="dialog" onClick={() => { doHop(); setSheet('custom'); }}
            className="absolute bottom-[29%] left-1/2 z-2 w-[168px] -translate-x-1/2">
            <Character key={hop} cfg={cfg} war={war} onAnimationEnd={e => e.animationName === 'hop' && setHopping(false)}
              className={`block h-auto w-full origin-bottom ${hopping ? 'animate-hop' : 'animate-breathe'}`} />
            <span className="glass pointer-events-none absolute top-[30%] right-1 grid size-[30px] place-items-center rounded-full text-(--primary)">
              <Icon name="i-edit" className="size-[15px] stroke-[2.3]!" />
            </span>
          </button>

          {/* 왼쪽 위: 프로필 */}
          <header className="glass absolute top-(--safe-t) left-3 z-5 flex h-11 max-w-[calc(50%-76px)] items-center gap-2 rounded-[22px] py-1 pr-3 pl-1">
            <div className="relative size-9 flex-none rounded-full bg-linear-135 from-[#ffe1ec] to-[#e4dcff]">
              <Character cfg={cfg} headOnly viewBox="40 26 120 120" className="size-full rounded-full" />
              <span className="absolute -right-[5px] -bottom-1 grid h-[18px] min-w-[18px] place-items-center rounded-[9px] border-2 border-white bg-(--primary) px-1 text-[10px] font-extrabold text-white">{pet.level}</span>
            </div>
            <div className="min-w-0 leading-tight">
              <b className="block truncate text-[13px] font-bold">{pet.name}</b>
              <span className="text-[11px] font-semibold text-(--ink-2)">Lv.{pet.level}</span>
            </div>
          </header>

          {/* 왼쪽 위: 스탯 */}
          <section className="glass absolute top-[calc(var(--safe-t)+52px)] left-3 z-5 w-[138px] rounded-[18px] p-3">
            <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-(--ink-2)">
              <span>경험치</span><b className="font-bold text-(--ink) tabular-nums">{pet.exp} / 10</b>
            </div>
            <Track pct={pet.exp * 10} />
            <ul className="mt-3 grid gap-2 text-xs font-semibold text-(--ink-2) [&_b]:ml-auto [&_b]:font-extrabold [&_b]:text-(--ink) [&_b]:tabular-nums [&>li]:flex [&>li]:items-center [&>li]:gap-2">
              {!war && <li><span className={`${chip} bg-[#ffe3ea] text-[#ff5d86]`}><Icon name="i-heart" className={chipIcon} /></span>애정<b>{game.love}</b></li>}
              <li><span className={`${chip} bg-[#ece7ff] text-[#6f5cf0]`}><Icon name="i-sword" className={chipIcon} /></span>전투력<b>{game.power}</b></li>
              {war && <li><span className={`${chip} bg-[#e3eeff] text-[#3d6fe0]`}><Icon name="i-shield" className={chipIcon} /></span>방어력<b>{game.def}</b></li>}
              {war && (
                <li className="relative pb-[7px] whitespace-nowrap">
                  <span className={`${chip} bg-[#ffe1e1] text-[#e5484d]`}><Icon name="i-heart" className={chipIcon} /></span>체력
                  <b>{game.hp}<small className="text-[10px] font-bold text-(--ink-2)">/{game.maxHp}</small></b>
                  <Track pct={game.hp / game.maxHp * 100} className="absolute right-0 bottom-0 left-[30px] h-1!" bar="from-[#ff5d6c] to-[#ff9f4a]" />
                </li>
              )}
              <li key={cashShake} className={cashShake ? 'animate-shake' : ''}>
                <span className={`${chip} bg-[#fff0d2] text-[#e0950e]`}><Icon name="i-coin" className={chipIcon} /></span>캐시<b>{pet.cash.toLocaleString()}</b>
              </li>
              <li><span className={`${chip} bg-[#dbf4ee] text-[#1ea88b]`}><Icon name="i-link" className={chipIcon} /></span>초대<b>{game.stats.chainDepth}단계</b></li>
            </ul>
            {war && game.buffs.length > 0 && (
              <div className="mt-[9px] flex flex-wrap gap-1">
                {game.buffs.map(b => (
                  <span key={b.k} className={`rounded-[7px] px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap ${BUFF[b.k][0]}`}>
                    {BUFF[b.k][1]} +{b.a}{b.k === 'regen' ? '' : '%'} · {b.t}{b.k === 'regen' ? '턴' : '판'}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* 가운데 위: 모드 전환 */}
          <button onClick={toggleMode} aria-pressed={war} aria-label="애완모드 / 전쟁모드 전환"
            className="glass absolute top-(--safe-t) left-1/2 z-5 grid h-11 w-[120px] -translate-x-1/2 grid-cols-2 items-center rounded-[22px] p-1 active:scale-96">
            <span className="absolute top-1 left-1 h-[34px] w-[calc(50%-4px)] rounded-[17px] bg-linear-135 from-[#9585ff] to-[#6c5cf0] shadow-[0_3px_8px_rgba(108,92,240,.35)] transition-transform duration-350 ease-[cubic-bezier(.3,1.3,.5,1)] war:translate-x-full war:from-[#ff7a6b] war:to-[#e8434f] war:shadow-[0_3px_10px_rgba(232,67,79,.45)]" />
            {([['i-paw', '애완', !war], ['i-swords', '전쟁', war]] as const).map(([icon, label, active]) => (
              <span key={label} className={`relative flex items-center justify-center gap-[3px] text-xs font-bold transition-colors duration-300 ${active ? 'text-white' : 'text-(--ink-2)'}`}>
                <Icon name={icon} className="size-3.5" />{label}
              </span>
            ))}
          </button>

          {/* 오른쪽 위: 상점 · 미션 */}
          <nav className="absolute top-(--safe-t) right-3 z-5 flex flex-col gap-2.5">
            <RoundButton icon="i-bag" label="상점" onClick={() => setSheet('shop')} />
            <RoundButton icon="i-mission" label="미션" badge={ms.badge} onClick={() => setSheet('missions')} />
          </nav>

          {/* 아래 */}
          <div className="absolute bottom-(--safe-b) left-3 z-5">
            <RoundButton icon="i-settings" label="설정" onClick={soon('설정')} popup={false} />
          </div>

          <div className="glass absolute bottom-(--safe-b) left-1/2 z-5 flex -translate-x-1/2 gap-1 rounded-3xl p-1.5">
            {war ? (
              <>
                <DockButton icon="i-swords" label="대전 신청" color="bg-[rgba(255,93,108,.18)] text-[#ff8791]" onClick={soon('대전')} />
                <DockButton icon="i-shield" label="클랜전" color="bg-[rgba(255,159,74,.18)] text-[#ffb36e]" onClick={soon('클랜전')} />
              </>
            ) : CARES.map(c => (
              <DockButton key={c.action} icon={c.icon} label={c.label} color={c.color} cost={COST} onClick={() => doCare(c.action as 'feed' | 'clean' | 'shower', c.label)} />
            ))}
          </div>

          <div className="absolute right-3 bottom-(--safe-b) z-5">
            <button onClick={() => setSheet('friends')} aria-haspopup="dialog" className="group flex flex-col items-center gap-1 text-[11px] font-bold">
              <span className="grid size-14 place-items-center rounded-[20px] bg-linear-135 from-(--accent-2) to-(--accent) text-white shadow-[0_8px_18px_rgba(255,111,159,.45)] transition-transform group-active:scale-92">
                <Icon name="i-invite" className="size-[22px]" />
              </span>
              친구 초대
            </button>
          </div>
        </div>

        {/* 돌봄 결과 (+1 EXP, -10) */}
        {floats.map(f => (
          <div key={f.id} style={{ color: f.color }}
            className="pointer-events-none absolute bottom-[calc(29%+210px)] left-1/2 z-8 animate-float-up text-[15px] font-extrabold whitespace-nowrap [text-shadow:0_2px_0_rgba(255,255,255,.8)] war:[text-shadow:0_2px_4px_rgba(0,0,0,.6)]">
            {f.text}
          </div>
        ))}

        {/* 창 (충전 팝업이 위에 뜨면 막는다) */}
        <div className="contents" inert={topup !== null}>
          {sheet === 'custom' && <CustomSheet cfg={cfg} war={war} onSave={saveCustom} onClose={closeSheet} />}
          {sheet === 'shop' && <Shop pet={pet} onPetUpdate={onPetUpdate} onClose={closeSheet} />}
          {sheet === 'missions' && <Missions ms={ms} onClose={closeSheet} />}
          {sheet === 'friends' && <Friends pet={pet} onPetUpdate={onPetUpdate} onClose={closeSheet} />}
        </div>
        {topup && <TopupPopup ctx={topup} cash={pet.cash} onClose={closeTopup} />}

        <div role="status" aria-live="polite"
          className={`pointer-events-none absolute top-[36%] left-1/2 z-40 w-max max-w-[calc(100%-32px)] -translate-x-1/2 rounded-[14px] bg-[rgba(30,22,45,.9)] px-4 py-2.5 text-center text-[13px] font-semibold text-balance text-white shadow-[0_8px_20px_rgba(0,0,0,.25)] transition duration-250 ${on ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
          {msg}
        </div>

        {/* 모드 전환할 때 한 번 번쩍 */}
        {flash > 0 && <div key={flash} className="pointer-events-none absolute inset-0 z-20 animate-flash bg-white opacity-0" />}
      </main>
    </GameProvider>
  );
}

function Track({ pct, className = 'h-1.5', bar = 'from-(--primary) to-(--accent)' }: { pct: number; className?: string; bar?: string }) {
  return (
    <span className={`block overflow-hidden rounded-[3px] bg-(--track) ${className}`}>
      <i className={`block h-full rounded-[inherit] bg-linear-90 transition-[width] duration-450 ease-[cubic-bezier(.2,.8,.2,1)] ${bar}`} style={{ width: `${pct}%` }} />
    </span>
  );
}

function RoundButton({ icon, label, badge, onClick, popup = true }: { icon: string; label: string; badge?: string; onClick: () => void; popup?: boolean }) {
  return (
    <button onClick={onClick} aria-haspopup={popup ? 'dialog' : undefined} className="group flex flex-col items-center gap-1 text-[11px] font-bold">
      <span className="glass relative grid size-12 place-items-center rounded-2xl transition-transform duration-150 group-active:scale-92">
        <Icon name={icon} className="size-[22px]" />
        {badge && <span key={badge} className="absolute -top-[5px] -right-[5px] grid h-[18px] min-w-[18px] animate-ping-once place-items-center rounded-[9px] border-2 border-white bg-(--accent) px-[5px] text-[10px] font-extrabold text-white">{badge}</span>}
      </span>
      {label}
    </button>
  );
}

function DockButton({ icon, label, color, cost, onClick }: { icon: string; label: string; color: string; cost?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-[62px] flex-col items-center gap-[3px] rounded-[18px] pt-1.5 pb-[5px] transition-colors active:bg-black/5">
      <span className={`grid size-10 place-items-center rounded-[14px] transition-transform duration-150 group-active:scale-92 ${color}`}><Icon name={icon} /></span>
      <small className="text-[11px] font-bold">{label}</small>
      {cost !== undefined && (
        <em className="flex items-center gap-0.5 text-[10px] font-bold text-(--ink-2) not-italic">
          <Icon name="i-coin" className="size-[11px] stroke-[2.4]! text-[#e0950e]" />{cost}
        </em>
      )}
    </button>
  );
}
