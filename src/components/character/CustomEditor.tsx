'use client';

import { CSSProperties, useState } from 'react';
import Icon from '../ui/Icon';
import Character from './Character';
import { CharConfig, Equip, Slot, SLOT_LABEL, SPECIES, SPECIES_LIST, WARDROBE_TABS, slotOf } from './charConfig';
import { ITEM, itemArt } from '../shop/catalog';

export interface Wardrobe { owned: string[]; equip: Equip; onEquip: (e: Equip) => void }

// 캐릭터 꾸미기 본문: 미리보기 · 캐릭터 고르기 · (옷장이 있으면) 슬롯마다 가진 아이템 입히기
// 첫 캐릭터 만들기에서는 옷장 없이 캐릭터만 고른다
export default function CustomEditor({ draft, onChange, war = false, wardrobe }: {
  draft: CharConfig; onChange: (cfg: CharConfig) => void; war?: boolean; wardrobe?: Wardrobe;
}) {
  const [tab, setTab] = useState('species');
  const tabs = wardrobe ? [{ key: 'species', label: '캐릭터' }, ...WARDROBE_TABS] : [];
  const wtab = WARDROBE_TABS.find(t => t.key === tab);

  return (
    <>
      <div className="relative mx-4 grid h-[32%] flex-none place-items-center overflow-hidden rounded-[20px] bg-(--chip-bg) bg-[radial-gradient(ellipse_42%_9%_at_50%_90%,var(--rug-1)_0_98%,transparent_100%)]">
        <Character cfg={draft} equip={wardrobe?.equip} war={war} className="mt-[3%] h-[92%] w-auto" />
        {wardrobe && Object.keys(wardrobe.equip).length > 0 && (
          <button type="button" onClick={() => wardrobe.onEquip({})}
            className="absolute top-2.5 right-2.5 flex h-[30px] items-center gap-1 rounded-[10px] bg-(--card) px-2.5 text-xs font-bold shadow-[0_2px_6px_rgba(0,0,0,.08)]">
            <Icon name="i-close" className="size-[14px]" />모두 벗기
          </button>
        )}
      </div>

      {tabs.length > 0 && (
        <div role="tablist" className="mx-4 mt-3 grid grid-cols-4 gap-0.5 rounded-[14px] bg-(--chip-bg) p-1">
          {tabs.map(t => (
            <button type="button" key={t.key} role="tab" aria-selected={t.key === tab} onClick={() => setTab(t.key)}
              className="h-[34px] rounded-[10px] text-xs font-bold whitespace-nowrap text-(--ink-2) transition-colors aria-selected:bg-(--card) aria-selected:text-(--ink) aria-selected:shadow-[0_2px_6px_rgba(0,0,0,.08)]">
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div key={tab} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3.5">
        {!wtab ? (
          <div className="grid auto-rows-max grid-cols-2 content-start gap-2.5">
            {SPECIES_LIST.map((sp, i) => {
              const on = draft.species === sp;
              return (
                <button type="button" key={sp} aria-pressed={on} style={{ animationDelay: `${i * 25}ms` }} onClick={() => onChange({ species: sp })}
                  className="relative flex animate-pop flex-col items-center gap-1.5 rounded-2xl border-2 border-transparent bg-(--card) p-1.5 pb-2 text-xs font-bold text-(--ink-2) shadow-[0_2px_8px_rgba(60,40,80,.07)] aria-pressed:border-(--primary) aria-pressed:text-(--ink)">
                  <span className="grid aspect-[1.15] w-full place-items-center overflow-hidden rounded-[11px] bg-(--chip-bg)">
                    <Character cfg={{ species: sp }} war={war} className="h-[88%] w-auto" />
                  </span>
                  <span>{SPECIES[sp].label}<small className="ml-1 font-semibold opacity-70">{SPECIES[sp].desc}</small></span>
                  {on && <Check />}
                </button>
              );
            })}
          </div>
        ) : wtab.slots.map(slot => <SlotRow key={slot} slot={slot} wardrobe={wardrobe!} />)}
      </div>
    </>
  );
}

// 슬롯 하나: [벗기] + 가진 아이템 중 이 슬롯에 입는 것들
function SlotRow({ slot, wardrobe }: { slot: Slot; wardrobe: Wardrobe }) {
  const items = wardrobe.owned.map(n => ITEM[n]).filter(it => it && slotOf(it) === slot);
  const cur = wardrobe.equip[slot];
  const pick = (name?: string) => {
    const next = { ...wardrobe.equip };
    if (name) next[slot] = name; else delete next[slot];
    wardrobe.onEquip(next);
  };
  return (
    <section>
      <h4 className="mb-1.5 text-xs font-extrabold text-(--ink-2)">{SLOT_LABEL[slot]}<small className="ml-1 font-bold opacity-70">{items.length}</small></h4>
      {items.length === 0 ? (
        <p className="rounded-xl bg-(--chip-bg) px-3 py-2.5 text-[11px] font-bold text-(--ink-2)">상점에서 사면 여기에 나와요</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <button type="button" aria-pressed={!cur} onClick={() => pick()}
            className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-transparent bg-(--card) text-[11px] font-bold text-(--ink-2) shadow-[0_2px_8px_rgba(60,40,80,.07)] aria-pressed:border-(--primary) aria-pressed:text-(--ink)">
            <Icon name="i-close" className="size-5" />벗기{!cur && <Check />}
          </button>
          {items.map(it => {
            const art = itemArt(it);
            return (
              <button type="button" key={it.name} aria-pressed={cur === it.name} onClick={() => pick(it.name)} title={it.name}
                className="relative flex aspect-square flex-col items-center justify-end gap-0.5 rounded-xl border-2 border-transparent bg-(--card) p-1 text-[10px] font-bold text-(--ink-2) shadow-[0_2px_8px_rgba(60,40,80,.07)] aria-pressed:border-(--primary) aria-pressed:text-(--ink)">
                <svg viewBox="0 0 64 64" aria-hidden="true" style={art.style as CSSProperties}
                  className="h-auto w-[58%] flex-1 overflow-visible fill-none stroke-[#7b4a3a] stroke-[2.6] [stroke-linecap:round] [stroke-linejoin:round]">
                  <use href={`/sprites/items.svg#a-${art.arch}`} />
                </svg>
                <span className="w-full truncate text-center">{it.name}</span>
                {cur === it.name && <Check />}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

const Check = () => <span className="absolute -top-[7px] -right-[7px] grid size-5 place-items-center rounded-full border-2 border-(--sheet) bg-(--primary) text-[11px] font-extrabold text-white">✓</span>;
