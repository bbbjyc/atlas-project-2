'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pet } from '@/types/pet';
import Icon from './ui/Icon';
import Character from './character/Character';
import CustomSheet from './character/CustomSheet';
import { CharConfig, loadCfg, saveCfg } from './character/charConfig';
import RoomBackground from './game/RoomBackground';
import { GameProvider, useToastQueue } from './game/GameContext';
import { savePet } from './game/storage';

interface GameScreenProps {
  pet: Pet;
}

type CareAction = 'feed' | 'clean' | 'shower';
const COST = 10;   // 돌봄 1번에 드는 캐시
const CARES: { action: CareAction; label: string; icon: string; color: string }[] = [
  { action: 'feed', label: '밥주기', icon: 'i-bowl', color: 'bg-[#ffe9d8] text-[#f07a2a]' },
  { action: 'clean', label: '청소', icon: 'i-sparkle', color: 'bg-[#e6f6e9] text-[#2fa860]' },
  { action: 'shower', label: '샤워', icon: 'i-drop', color: 'bg-[#e3efff] text-[#3f7cf0]' },
];
type Sheet = 'custom' | null;

// HUD 스탯 한 줄의 아이콘 칩
const chip = 'grid size-6 flex-none place-items-center rounded-lg war:bg-white/8';
const chipIcon = 'size-3.5 stroke-[2.3]!';

export default function GameScreen({ pet: initialPet }: GameScreenProps) {
  const [pet, setPet] = useState(initialPet);
  const [war, setWar] = useState(false);
  const [cfg, setCfg] = useState<CharConfig>(loadCfg);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  const { msg, on, toast } = useToastQueue();

  // 애니메이션 다시 틀기용 번호 (바뀔 때마다 처음부터)
  const [hop, setHop] = useState(0);
  const [hopping, setHopping] = useState(false);
  const [flash, setFlash] = useState(0);
  const [cashShake, setCashShake] = useState(0);
  const [floats, setFloats] = useState<{ id: number; text: string; color: string }[]>([]);
  const floatId = useRef(0);

  // 빠르게 여러 번 눌러도 마지막 값에서 계산하도록 최신 펫을 ref 에도 둔다
  const petRef = useRef(pet);
  const updatePet = (next: Pet) => { petRef.current = next; setPet(next); };
  useEffect(() => { savePet(pet); }, [pet]);
  const doHop = () => { setHop(n => n + 1); setHopping(true); };

  // 나중에 상점·물약이 붙으면 애정·전투력·방어력·체력에 아이템 효과가 더해진다
  const love = 0;     // TODO: 애정점수 = 내 집이 host_id 인 visit_logs 수 (plan.md)
  const depth = 0;    // TODO: 초대 단계 = invited_by_id 를 따라간 횟수 (players)
  const power = pet.level * 10 + love;
  const def = pet.level * 5;
  const maxHp = 300 + pet.level * 30;
  const hp = maxHp;

  const float = useCallback((text: string, color: string, delay = 0) => {
    window.setTimeout(() => {
      const id = ++floatId.current;
      setFloats(f => [...f, { id, text, color }]);
      window.setTimeout(() => setFloats(f => f.filter(x => x.id !== id)), 1000);
    }, delay);
  }, []);

  const care = (action: CareAction, label: string) => {
    const p = petRef.current;
    if (p.cash < COST) {
      setCashShake(n => n + 1);
      toast('캐시가 부족해요');   // TODO: 3단계에서 충전 팝업(openTopup(COST, action))으로 바꾼다
      return;
    }
    // TODO: src/lib/pet.ts 가 main 에 들어오면 addCareLog(pet.userId, action), addCashLog(...) 로 저장
    const levelUp = p.exp + 1 >= 10;
    updatePet({ ...p, cash: p.cash - COST, exp: levelUp ? 0 : p.exp + 1, level: levelUp ? p.level + 1 : p.level });
    doHop();
    float(`${label}! +1 EXP`, '#7c6cf6');
    float(`-${COST}`, '#e0950e', 180);
    if (levelUp) toast(`레벨 업! Lv.${p.level + 1}`);
  };

  const toggleMode = () => {
    setWar(w => !w);
    setFlash(n => n + 1);
    toast(war ? '애완모드로 전환했어요' : '전쟁모드로 전환했어요');
  };

  const openSheet = (s: Sheet, el: HTMLElement) => { setOrigin(el); setSheet(s); };
  const closeSheet = useCallback(() => setSheet(null), []);

  const saveCustom = (next: CharConfig) => {
    setCfg(next); saveCfg(next);
    closeSheet();
    doHop();
    toast('캐릭터를 저장했어요');
  };

  const soon = (what: string) => () => toast(`${what}은 다음 단계에서 만들어요`);

  return (
    <GameProvider value={{ pet, war, toast }}>
      <main className={`room relative isolate h-dvh w-full max-w-[430px] overflow-hidden text-(--ink) ${war ? 'war' : ''}`}>
        <RoomBackground war={war} />

        {/* 뒤쪽 HUD: 창이 열려 있으면 터치·키보드를 막는다 */}
        <div className="contents" inert={sheet !== null}>
          {/* 캐릭터 · 누르면 꾸미기 */}
          <button aria-label="캐릭터 꾸미기 열기" onClick={e => { doHop(); openSheet('custom', e.currentTarget); }}
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
              {!war && <li><span className={`${chip} bg-[#ffe3ea] text-[#ff5d86]`}><Icon name="i-heart" className={chipIcon} /></span>애정<b>{love}</b></li>}
              <li><span className={`${chip} bg-[#ece7ff] text-[#6f5cf0]`}><Icon name="i-sword" className={chipIcon} /></span>전투력<b>{power}</b></li>
              {war && <li><span className={`${chip} bg-[#e3eeff] text-[#3d6fe0]`}><Icon name="i-shield" className={chipIcon} /></span>방어력<b>{def}</b></li>}
              {war && (
                <li className="relative pb-[7px] whitespace-nowrap">
                  <span className={`${chip} bg-[#ffe1e1] text-[#e5484d]`}><Icon name="i-heart" className={chipIcon} /></span>체력
                  <b>{hp}<small className="text-[10px] font-bold text-(--ink-2)">/{maxHp}</small></b>
                  <Track pct={hp / maxHp * 100} className="absolute right-0 bottom-0 left-[30px] h-1!" bar="from-[#ff5d6c] to-[#ff9f4a]" />
                </li>
              )}
              <li key={cashShake} className={cashShake ? 'animate-shake' : ''}>
                <span className={`${chip} bg-[#fff0d2] text-[#e0950e]`}><Icon name="i-coin" className={chipIcon} /></span>캐시<b>{pet.cash.toLocaleString()}</b>
              </li>
              <li><span className={`${chip} bg-[#dbf4ee] text-[#1ea88b]`}><Icon name="i-link" className={chipIcon} /></span>초대<b>{depth}단계</b></li>
            </ul>
          </section>

          {/* 가운데 위: 모드 전환 */}
          <button onClick={toggleMode} aria-pressed={war} aria-label="애완모드 / 전쟁모드 전환"
            className="glass absolute top-(--safe-t) left-1/2 z-5 grid h-11 w-[120px] -translate-x-1/2 grid-cols-2 items-center rounded-[22px] p-1 active:scale-96">
            <span className="absolute top-1 left-1 h-[34px] w-[calc(50%-4px)] rounded-[17px] bg-linear-135 from-[#9585ff] to-[#6c5cf0] shadow-[0_3px_8px_rgba(108,92,240,.35)] transition-transform duration-350 ease-[cubic-bezier(.3,1.3,.5,1)] war:translate-x-full war:from-[#ff7a6b] war:to-[#e8434f] war:shadow-[0_3px_10px_rgba(232,67,79,.45)]" />
            {[['i-paw', '애완', !war], ['i-swords', '전쟁', war]].map(([icon, label, active]) => (
              <span key={label as string} className={`relative flex items-center justify-center gap-[3px] text-xs font-bold transition-colors duration-300 ${active ? 'text-white' : 'text-(--ink-2)'}`}>
                <Icon name={icon as string} className="size-3.5" />{label}
              </span>
            ))}
          </button>

          {/* 오른쪽 위: 상점 · 미션 */}
          <nav className="absolute top-(--safe-t) right-3 z-5 flex flex-col gap-2.5">
            <RoundButton icon="i-bag" label="상점" onClick={soon('상점')} />
            <RoundButton icon="i-mission" label="미션" badge="!" onClick={soon('미션')} />
          </nav>

          {/* 아래 */}
          <div className="absolute bottom-(--safe-b) left-3 z-5">
            <RoundButton icon="i-settings" label="설정" onClick={soon('설정')} />
          </div>

          <div className="glass absolute bottom-(--safe-b) left-1/2 z-5 flex -translate-x-1/2 gap-1 rounded-3xl p-1.5">
            {war ? (
              <>
                <DockButton icon="i-swords" label="대전 신청" color="bg-[rgba(255,93,108,.18)] text-[#ff8791]" onClick={soon('대전')} />
                <DockButton icon="i-shield" label="클랜전" color="bg-[rgba(255,159,74,.18)] text-[#ffb36e]" onClick={soon('클랜전')} />
              </>
            ) : CARES.map(c => (
              <DockButton key={c.action} icon={c.icon} label={c.label} color={c.color} cost={COST} onClick={() => care(c.action, c.label)} />
            ))}
          </div>

          <div className="absolute right-3 bottom-(--safe-b) z-5">
            <button onClick={soon('친구 초대')} className="flex flex-col items-center gap-1 text-[11px] font-bold">
              <span className="grid size-14 place-items-center rounded-[20px] bg-linear-135 from-(--accent-2) to-(--accent) text-white shadow-[0_8px_18px_rgba(255,111,159,.45)] transition-transform active:scale-92">
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

        <CustomSheet open={sheet === 'custom'} origin={origin} cfg={cfg} war={war} onSave={saveCustom} onClose={closeSheet} />

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

function RoundButton({ icon, label, badge, onClick }: { icon: string; label: string; badge?: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button onClick={onClick} aria-haspopup="dialog" className="group flex flex-col items-center gap-1 text-[11px] font-bold">
      <span className="glass relative grid size-12 place-items-center rounded-2xl transition-transform duration-150 group-active:scale-92">
        <Icon name={icon} className="size-[22px]" />
        {badge && <span className="absolute -top-[5px] -right-[5px] grid h-[18px] min-w-[18px] place-items-center rounded-[9px] border-2 border-white bg-(--accent) px-[5px] text-[10px] font-extrabold text-white">{badge}</span>}
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
