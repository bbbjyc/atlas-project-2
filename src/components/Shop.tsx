'use client';

import { useEffect, useRef, useState } from 'react';
import { Pet } from '@/types/pet';
import Icon from './ui/Icon';
import Sheet, { SheetHead, Wallet } from './ui/Sheet';
import { useGame } from './game/GameContext';
import { consumable, FX_ICON, fxText, GRADE, Grade, Item, itemArt, STAT } from './shop/catalog';
import { slotOf } from './character/charConfig';

interface ShopProps {
  pet: Pet;
  onPetUpdate: (pet: Pet) => void;
  onClose: () => void;
}

// 그림 칸 배경: 카테고리별 / 전설·프리미엄은 금빛
const PH_BG: Record<string, string> = {
  clothes: 'bg-[#efeaff]', deco: 'bg-[#ffeedf]', food: 'bg-[#e4f6e9]',
  weapon: 'bg-[rgba(255,93,108,.13)]', armor: 'bg-[rgba(93,140,255,.15)]', potion: 'bg-[rgba(170,110,255,.16)]',
};
const CARD: Record<Grade, string> = {
  n: 'animate-pop',
  r: 'animate-pop shadow-[0_0_0_2px_#8db8ff,0_4px_12px_rgba(61,139,255,.15)]',
  l: 'animate-glow-l motion-reduce:animate-pop motion-reduce:shadow-[0_0_0_2px_#ffc24a,0_0_16px_rgba(255,190,40,.45)]',
  p: 'animate-glow-p motion-reduce:animate-pop motion-reduce:shadow-[0_0_0_2px_#ffc24a,0_0_0_4px_rgba(255,111,159,.45),0_0_20px_rgba(255,111,159,.5)]',
};
const BADGE: Record<Grade, string> = {
  n: 'bg-white/85 text-[#8c81a5]',
  r: 'bg-[#e3eeff] text-[#2f74e8]',
  l: 'bg-linear-135 from-[#ffd76a] to-[#ff9f2e] text-white',
  p: 'bg-linear-135 from-[#ffb52e] via-(--accent) via-55% to-(--primary) text-white',
};
const NAME: Record<Grade, string> = { n: '', r: 'text-[#2f74e8] war:text-[#7fb0ff]', l: 'legend-text', p: 'legend-text' };
// 등급 탭: 일반 / 희귀 / 전설(프리미엄 포함)
const FILTERS: [Grade, string, string][] = [
  ['n', '일반', 'aria-pressed:bg-(--ink) aria-pressed:text-(--sheet)'],
  ['r', '희귀', 'aria-pressed:bg-[#3d82f0] aria-pressed:text-white'],
  ['l', '전설', 'aria-pressed:bg-linear-135 aria-pressed:from-[#ffd23f] aria-pressed:to-[#ff9f2e] aria-pressed:text-[#ffe94d] aria-pressed:[text-shadow:var(--legend-outline)] aria-pressed:shadow-[0_4px_12px_rgba(255,160,40,.35)]'],
];
const inGrade = (sel: Grade, g: Grade) => g === sel || (sel === 'l' && g === 'p');
const won = (n: number) => `${n.toLocaleString()}원`;

// 상점: 애완모드는 옷·집 꾸미기·음식, 전쟁모드는 무기·갑옷·물약
// TODO: 구매는 addCashLog(playerId, -가격, 'buy_item', 아이템, 종류) 로 cash_logs 에 저장 (src/lib/pet.ts 가 main 에 들어오면)
export default function Shop({ pet, onPetUpdate, onClose }: ShopProps) {
  const game = useGame();
  const cats = game.war ? game.shops.war : game.shops.pet;
  const [catKey, setCatKey] = useState(cats[0].key);
  const [grade, setGrade] = useState<Grade>('n');
  const [shake, setShake] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const cat = cats.find(c => c.key === catKey) ?? cats[0];
  const shown = cat.items.filter(it => inGrade(grade, it.g)).sort((a, b) => +(b.g === 'p') - +(a.g === 'p'));   // 전설 탭은 프리미엄이 맨 앞

  const opened = useRef(false);
  useEffect(() => { if (!opened.current) { opened.current = true; game.bump('shopOpen'); } }, [game]);
  useEffect(() => { gridRef.current?.scrollTo(0, 0); }, [catKey, grade]);

  const buy = (it: Item) => {
    // 프리미엄은 캐시로 못 사고 직접 결제 → 지금은 페이크 도어
    if (it.g === 'p') { game.openSoon(`premium:${it.name}`); return; }
    // 지금 마셔도 달라지는 게 없는 물약은 캐시를 쓰기 전에 막는다
    if (it.kind === 'potion' && !it.effects.some(game.fxUseful)) {
      game.toast(it.effects[0][0] === 'heal' ? '체력이 이미 가득 차 있어요' : '이미 같거나 더 강한 효과가 걸려 있어요');
      return;
    }
    const now = game.getPet();
    if (now.cash < it.price) { setShake(n => n + 1); game.openTopup(it.price, 'buy_item'); return; }
    onPetUpdate({ ...now, cash: now.cash - it.price });
    game.bump('buy');
    if (it.cat === 'clothes') game.bump('buyClothes');
    // 상점 창이 방을 가리고 있어서 결과는 toast 로 알린다
    if (it.kind === 'food') {
      game.toast(`${it.name} 냠냠! 경험치 +${it.val}`);
      const lv = game.addExp(it.val);
      if (lv) game.toast(`레벨 업! Lv.${lv}`);
    } else if (it.kind === 'potion') {
      game.toast(`${it.name}! ${game.drink(it.effects).map(fxText).join(', ')}`);
    } else {
      game.own(it.name);
      // 입을 수 있는 것(옷·무기·갑옷)은 사자마자 입는다. 꾸미기 창에서 바꿀 수 있다
      if (slotOf(it)) game.wear(it);
      if (it.kind === 'gear') game.toast(`${it.name} 장착! 전투력 +${it.atk} · 방어력 +${it.def}`);
      else if (slotOf(it)) game.toast(`${it.name} 입었어요! 애정 +${it.val}`);
      else game.toast(`${it.name} 구매 완료! 애정 +${it.val}`);
    }
  };

  return (
    <Sheet onClose={onClose} labelledBy="shopTitle">
      <SheetHead id="shopTitle" title="상점">
        <button onClick={() => game.openTopup()}
          className="mx-auto flex h-[34px] items-center gap-1 rounded-[17px] bg-linear-135 from-(--accent) to-(--accent-2) pr-[13px] pl-2.5 text-[13px] font-extrabold text-white shadow-[0_4px_10px_rgba(255,111,159,.3)] transition-transform active:scale-95">
          <Icon name="i-plus" className="size-[15px] stroke-[2.8]!" />충전
        </button>
        <Wallet cash={pet.cash} shake={shake} />
      </SheetHead>

      {/* 카테고리 탭 (모드에 따라 이름이 바뀐다) */}
      <div role="tablist" className="relative mx-4 grid grid-cols-3 rounded-2xl bg-(--chip-bg) p-1">
        <span className="absolute top-1 left-1 h-[38px] w-[calc((100%-8px)/3)] rounded-xl bg-(--card) shadow-[0_2px_6px_rgba(0,0,0,.08)] transition-transform duration-300 ease-[cubic-bezier(.3,1.2,.5,1)]"
          style={{ transform: `translateX(${cats.indexOf(cat) * 100}%)` }} />
        {cats.map(c => (
          <button key={c.key} role="tab" aria-selected={c.key === cat.key} onClick={() => setCatKey(c.key)}
            className="relative flex h-[38px] items-center justify-center gap-[5px] text-[13px] font-bold text-(--ink-2) transition-colors aria-selected:text-(--ink)">
            <Icon name={c.icon} className="size-4" />{c.label}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-2.5 grid flex-none grid-cols-3 gap-1.5">
        {FILTERS.map(([g, label, on]) => (
          <button key={g} aria-pressed={g === grade} onClick={() => setGrade(g)}
            className={`h-8 rounded-[11px] bg-(--chip-bg) text-[13px] font-extrabold whitespace-nowrap text-(--ink-2) transition-[background,color,box-shadow] ${on}`}>
            {label}<small className="ml-1 text-[10px] font-bold opacity-75">{cat.items.filter(it => inGrade(g, it.g)).length}</small>
          </button>
        ))}
      </div>

      <div ref={gridRef} key={cat.key + grade} className="grid flex-1 auto-rows-max grid-cols-2 content-start gap-3 overflow-y-auto px-4 pt-4 pb-6">
        {shown.map((it, i) => <ItemCard key={it.name} it={it} i={i} statKey={cat.stat} onBuy={buy} />)}
      </div>
    </Sheet>
  );
}

function ItemCard({ it, i, statKey, onBuy }: { it: Item; i: number; statKey?: string; onBuy: (it: Item) => void }) {
  const game = useGame();
  const art = itemArt(it);
  const owned = !consumable(it) && game.owned.includes(it.name);
  const wearing = game.isWorn(it.name);
  const label = wearing ? (it.kind === 'gear' ? '장착 중' : '착용 중') : owned ? '보유' : it.g === 'p' ? '결제' : '구매';
  const [statIcon, statName] = (statKey && STAT[statKey]) || [];
  const fancy = it.g === 'l' || it.g === 'p';

  return (
    <article style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
      className={`flex flex-col overflow-hidden rounded-[18px] bg-(--card) shadow-[0_2px_10px_rgba(60,40,80,.08)] ${CARD[it.g]}`}>
      <div className={`relative grid aspect-[1/.8] place-items-center overflow-hidden ${
        it.g === 'l' ? 'bg-[radial-gradient(circle_at_50%_45%,#fff3c9,#ffe2a6)]'
          : it.g === 'p' ? 'bg-[radial-gradient(circle_at_50%_45%,#fff6d6,#ffd9ec_60%,#e6dcff)]' : PH_BG[it.cat]}`}>
        <span className={`absolute top-2 left-2 z-1 rounded-[7px] px-[7px] py-0.5 text-[10px] font-extrabold ${BADGE[it.g]}`}>{GRADE[it.g]}</span>
        <svg viewBox="0 0 64 64" aria-hidden="true" style={art.style as React.CSSProperties}
          className="h-auto w-[60%] overflow-visible fill-none stroke-[#7b4a3a] stroke-[2.6] [stroke-linecap:round] [stroke-linejoin:round]">
          <use href={`/sprites/items.svg#a-${art.arch}`} />
          {art.face && <use href="/sprites/items.svg#o-face" transform={`translate(${art.face[0]} ${art.face[1]}) scale(${art.face[2]})`} />}
          {art.overlay && <use href={`/sprites/items.svg#${art.overlay}`} />}
        </svg>
        {fancy && <span className={`absolute inset-0 animate-shine bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,.7)_50%,transparent_65%)] motion-reduce:hidden ${it.g === 'p' ? '[animation-duration:2.4s]' : ''}`} />}
      </div>

      <div className="flex flex-1 flex-col px-3 pt-2.5 pb-3">
        <div className={`truncate text-[13px] font-bold ${NAME[it.g]}`}>{it.name}</div>
        {it.kind === 'gear' ? (
          <div className="mt-[3px] flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-bold text-(--ink-2)">
            {it.atk > 0 && <span className="inline-flex items-center gap-[3px] whitespace-nowrap"><Icon name="i-sword" className="size-3" />전투력 +{it.atk}</span>}
            {it.def > 0 && <span className="inline-flex items-center gap-[3px] whitespace-nowrap"><Icon name="i-shield" className="size-3" />방어력 +{it.def}</span>}
          </div>
        ) : it.kind === 'potion' ? (
          it.effects.map(f => <StatLine key={f[0]} icon={FX_ICON[f[0]]} text={fxText(f)} />)
        ) : (
          statIcon && <StatLine icon={statIcon} text={`${statName} +${it.val}`} />
        )}
        {it.fx && (
          <div className="mt-1.5 flex gap-1 rounded-[9px] bg-linear-135 from-[rgba(255,111,159,.12)] to-[rgba(124,108,246,.12)] px-[7px] py-[5px] text-[10.5px] leading-[1.35] font-bold text-(--accent)">
            <Icon name="i-star" className="mt-px size-3" /><span>{it.fx}</span>
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className={`flex items-center gap-[3px] text-[13px] font-extrabold tabular-nums ${it.g === 'p' ? 'text-(--accent)' : ''}`}>
            {it.g === 'p' ? won(it.price) : <><Icon name="i-coin" className="size-3.5 text-[#e0950e]" />{it.price.toLocaleString()}</>}
          </span>
          <button disabled={owned} onClick={() => onBuy(it)} aria-label={`${it.name} ${label}`}
            className={`h-[30px] rounded-[10px] px-3 text-xs font-extrabold text-white transition-transform active:scale-94 disabled:cursor-default disabled:bg-(--chip-bg) disabled:bg-none disabled:text-(--ink-2) ${
              it.g === 'p' ? 'bg-linear-135 from-(--accent) to-(--primary)' : 'bg-(--primary)'}`}>
            {label}
          </button>
        </div>
      </div>
    </article>
  );
}

function StatLine({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="mt-[3px] flex items-center gap-[3px] text-[11px] font-bold text-(--ink-2)">
      <Icon name={icon} className="size-3" />{text}
    </div>
  );
}
