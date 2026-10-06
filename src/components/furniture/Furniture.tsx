'use client';

import { CSSProperties } from 'react';
import Icon from '../ui/Icon';
import Sheet, { SheetHead } from '../ui/Sheet';
import { ITEM, Item, itemArt } from '../shop/catalog';
import { groupOf, MAX_FURNITURE, Placed, placeError, ZONES } from './layout';

// 방에 놓인 가구 한 개. 누르면 골라진다
function FurnitureArt({ it, style }: { it: Item; style?: CSSProperties }) {
  const art = itemArt(it);
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" style={{ ...(art.style as CSSProperties), ...style }}
      className="size-full overflow-visible fill-none stroke-[#7b4a3a] stroke-[2.6] [stroke-linecap:round] [stroke-linejoin:round]">
      <use href={`/sprites/items.svg#a-${art.arch}`} />
      {art.face && <use href="/sprites/items.svg#o-face" transform={`translate(${art.face[0]} ${art.face[1]}) scale(${art.face[2]})`} />}
      {art.overlay && <use href={`/sprites/items.svg#${art.overlay}`} />}
    </svg>
  );
}

export function PlacedItems({ placed, picked, onPick }: { placed: Placed[]; picked: number | null; onPick: (i: number) => void }) {
  return (
    <>
      {placed.map((p, i) => {
        const it = ITEM[p.name];
        if (!it) return null;
        return (
          <button key={`${p.name}-${i}`} aria-label={`${p.name} (눌러서 고르기)`} onClick={() => onPick(i)}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className={`absolute z-2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-2xl transition-transform active:scale-95 ${picked === i ? 'bg-white/30 ring-2 ring-(--primary)' : ''}`}>
            <FurnitureArt it={it} style={{ filter: 'drop-shadow(0 4px 5px rgba(60,35,20,.18))' }} />
          </button>
        );
      })}
    </>
  );
}

// 놓을 곳 안내: 놓을 수 있는 범위를 점선으로 보여 준다 (옮기거나 놓는 중에만)
export function PlaceGuide({ name, onCancel }: { name: string; onCancel: () => void }) {
  return (
    <>
      {ZONES.map((z, i) => (
        <div key={i} className="pointer-events-none absolute z-10 rounded-2xl border-2 border-dashed border-white/80 bg-white/10"
          style={{ left: `${z.x1}%`, top: `${z.y1}%`, width: `${z.x2 - z.x1}%`, height: `${z.y2 - z.y1}%` }} />
      ))}
      <div className="glass absolute top-(--safe-t) left-1/2 z-12 flex -translate-x-1/2 items-center gap-2 rounded-2xl py-2 pr-2 pl-3.5 text-xs font-bold whitespace-nowrap">
        <Icon name="i-home" className="size-4" />「{name}」 놓을 곳을 눌러 주세요
        <button onClick={onCancel} className="h-7 rounded-[10px] bg-(--chip-bg) px-2.5 text-[11px] font-extrabold">취소</button>
      </div>
    </>
  );
}

// 고른 가구: 옮기기 / 치우기
export function PickedBar({ name, onMove, onRemove, onClose }: { name: string; onMove: () => void; onRemove: () => void; onClose: () => void }) {
  return (
    <div className="glass absolute bottom-[calc(var(--safe-b)+104px)] left-1/2 z-6 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl p-1.5 whitespace-nowrap">
      <span className="px-2 text-xs font-extrabold">{name}</span>
      <button onClick={onMove} className="h-8 rounded-[10px] bg-(--primary) px-3 text-xs font-extrabold text-white">옮기기</button>
      <button onClick={onRemove} className="h-8 rounded-[10px] bg-(--chip-bg) px-3 text-xs font-extrabold">치우기</button>
      <button onClick={onClose} aria-label="닫기" className="grid size-8 place-items-center rounded-[10px] bg-(--chip-bg)"><Icon name="i-close" className="size-3.5" /></button>
    </div>
  );
}

// 집 꾸미기 창: 가진 가구 목록. 놓기·옮기기는 방에서 한다
export function DecorateSheet({ owned, placed, onPick, onClose }: {
  owned: string[]; placed: Placed[]; onPick: (name: string, index: number | null) => void; onClose: () => void;
}) {
  const items = owned.map(n => ITEM[n]).filter((it): it is Item => !!it && it.cat === 'deco');
  return (
    <Sheet onClose={onClose} labelledBy="decorTitle">
      <SheetHead id="decorTitle" title="집 꾸미기" />
      <div className="mx-4 mb-2 flex items-center justify-between rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-[11px] font-bold text-(--ink-2)">
        <span>놓은 가구 <b className="text-(--ink) tabular-nums">{placed.length} / {MAX_FURNITURE}</b></span>
        <span>같은 종류는 하나씩</span>
      </div>
      {items.length === 0 ? (
        <p className="mx-4 rounded-[14px] bg-(--chip-bg) px-4 py-6 text-center text-xs font-bold text-(--ink-2)">상점의 집 꾸미기에서 가구를 사면 여기에 나와요</p>
      ) : (
        <div className="grid flex-1 auto-rows-max grid-cols-2 content-start gap-2.5 overflow-y-auto px-4 pt-1 pb-5">
          {items.map((it, i) => {
            const at = placed.findIndex(p => p.name === it.name);
            const full = placed.length >= MAX_FURNITURE;
            const dup = at < 0 && placed.some(p => ITEM[p.name] && groupOf(ITEM[p.name]) === groupOf(it));
            const label = at >= 0 ? '옮기기' : full ? '가득 찼어요' : dup ? '같은 종류 있음' : '놓기';
            const disabled = at < 0 && (full || dup);
            return (
              <article key={it.name} style={{ animationDelay: `${i * 25}ms` }} className="flex animate-pop flex-col items-center gap-1.5 rounded-2xl bg-(--card) p-2.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
                <span className="grid aspect-square w-full place-items-center rounded-xl bg-(--chip-bg) p-2"><FurnitureArt it={it} /></span>
                <span className="w-full truncate text-center text-xs font-extrabold">{it.name}</span>
                <button disabled={disabled} onClick={() => onPick(it.name, at >= 0 ? at : null)}
                  className="h-8 w-full rounded-[10px] bg-(--primary) text-xs font-extrabold text-white disabled:bg-(--chip-bg) disabled:text-(--ink-2)">
                  {at >= 0 ? `${label} (배치됨)` : label}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {placed.length > 0 && <p className="px-4 pb-4 text-center text-[11px] font-bold text-(--ink-2)">방에서 가구를 누르면 옮기거나 치울 수 있어요</p>}
    </Sheet>
  );
}
