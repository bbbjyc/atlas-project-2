'use client';

import { useState } from 'react';
import Icon from '../ui/Icon';
import Character from './Character';
import { CharConfig, CUSTOM_TABS, randomCfg } from './charConfig';

// 캐릭터 꾸미기 본문: 미리보기(+랜덤) · 항목 탭 · 고르기 타일. 꾸미기 창과 첫 캐릭터 만들기에서 같이 쓴다
export default function CustomEditor({ draft, onChange, war = false }: {
  draft: CharConfig; onChange: (cfg: CharConfig) => void; war?: boolean;
}) {
  const [tabKey, setTabKey] = useState<keyof CharConfig>('gender');
  const tab = CUSTOM_TABS.find(t => t.key === tabKey)!;

  return (
    <>
      <div className="relative mx-4 grid h-[32%] flex-none place-items-center overflow-hidden rounded-[20px] bg-(--chip-bg) bg-[radial-gradient(ellipse_42%_9%_at_50%_90%,var(--rug-1)_0_98%,transparent_100%)]">
        <Character cfg={draft} war={war} className="mt-[4%] h-[94%] w-auto" />
        <button type="button" onClick={() => onChange(randomCfg())}
          className="absolute top-2.5 right-2.5 flex h-[30px] items-center gap-1 rounded-[10px] bg-(--card) px-2.5 text-xs font-bold shadow-[0_2px_6px_rgba(0,0,0,.08)]">
          <Icon name="i-dice" className="size-[15px]" />랜덤
        </button>
      </div>

      <div role="tablist" className="mx-4 mt-3 grid grid-cols-6 gap-0.5 rounded-[14px] bg-(--chip-bg) p-1">
        {CUSTOM_TABS.map(t => (
          <button type="button" key={t.key} role="tab" aria-selected={t.key === tabKey} onClick={() => setTabKey(t.key)}
            className="h-[34px] rounded-[10px] text-xs font-bold whitespace-nowrap text-(--ink-2) transition-colors aria-selected:bg-(--card) aria-selected:text-(--ink) aria-selected:shadow-[0_2px_6px_rgba(0,0,0,.08)]">
            {t.label}
          </button>
        ))}
      </div>

      <div key={tabKey} className="grid flex-1 auto-rows-max grid-cols-3 content-start gap-2.5 overflow-y-auto px-4 py-3.5">
        {tab.opts.map(([val, label], i) => {
          const on = draft[tab.key] === val;
          return (
            <button type="button" key={String(val)} aria-pressed={on} style={{ animationDelay: `${i * 25}ms` }}
              onClick={() => onChange({ ...draft, [tab.key]: val })}
              className="relative flex animate-pop flex-col items-center gap-1.5 rounded-2xl border-2 border-transparent bg-(--card) p-1.5 pb-2 text-xs font-bold text-(--ink-2) shadow-[0_2px_8px_rgba(60,40,80,.07)] aria-pressed:border-(--primary) aria-pressed:text-(--ink)">
              <span className="grid aspect-[1.3] w-full place-items-center overflow-hidden rounded-[11px] bg-(--chip-bg)">
                {tab.swatch
                  ? <span className="size-[42px] rounded-full shadow-[inset_0_0_0_3px_rgba(255,255,255,.65),0_2px_6px_rgba(0,0,0,.15)]" style={{ background: tab.swatch(val) }} />
                  : <Character cfg={{ ...draft, [tab.key]: val }} headOnly viewBox={tab.view} className="size-full" />}
              </span>
              {label}
              {on && <span className="absolute -top-[7px] -right-[7px] grid size-5 place-items-center rounded-full border-2 border-(--sheet) bg-(--primary) text-[11px] font-extrabold text-white">✓</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
