'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon';
import Sheet, { SheetHead, Wallet } from './ui/Sheet';
import { useGame } from './game/GameContext';
import { Mission, MISSION_TIERS, MissionState, Reward } from './missions/missions';

// 미션 창: 단계(Lv.1 입문 ~ Lv.4 마스터) 탭, 단계 진행도와 보너스, 미션 목록
export default function Missions({ ms, onClose }: { ms: MissionState; onClose: () => void }) {
  const { pet } = useGame();
  // 아직 끝나지 않은 가장 낮은 단계부터 보여 준다
  const [tierLv, setTierLv] = useState(() => (MISSION_TIERS.find(t => ms.unlocked(t.lv) && !ms.bonusClaimed(t.lv)) ?? MISSION_TIERS[MISSION_TIERS.length - 1]).lv);
  const listRef = useRef<HTMLDivElement>(null);
  const { markSeen } = ms;
  useEffect(() => { markSeen(); }, [markSeen]);
  useEffect(() => { listRef.current?.scrollTo(0, 0); }, [tierLv]);

  const t = MISSION_TIERS[tierLv - 1], open = ms.unlocked(t.lv);
  const real = t.missions.filter(m => !m.soon), doneN = real.filter(m => ms.claimed(m.id)).length;
  const canBonus = doneN === real.length && !ms.bonusClaimed(t.lv);
  const order = (m: Mission) => (m.soon ? 3 : ms.claimed(m.id) ? 2 : ms.isDone(m) ? 0 : 1);   // 받을 수 있는 것 → 진행 중 → 완료 순
  const list = [...t.missions].sort((a, b) => order(a) - order(b));

  const bonus = () => {
    ms.claimBonus(t);
    if (t.lv < MISSION_TIERS.length) setTierLv(t.lv + 1);
  };

  return (
    <Sheet onClose={onClose} labelledBy="missionTitle">
      <SheetHead id="missionTitle" title="미션"><Wallet cash={pet.cash} className="ml-auto" /></SheetHead>

      <div role="tablist" className="mx-4 grid grid-cols-4 gap-0.5 rounded-[14px] bg-(--chip-bg) p-1">
        {MISSION_TIERS.map(x => {
          const unlocked = ms.unlocked(x.lv);
          return (
            <button key={x.lv} role="tab" aria-selected={x.lv === tierLv} onClick={() => setTierLv(x.lv)}
              className={`relative flex h-11 flex-col items-center justify-center rounded-[10px] text-xs font-extrabold text-(--ink-2) transition-colors aria-selected:bg-(--card) aria-selected:text-(--ink) aria-selected:shadow-[0_2px_6px_rgba(0,0,0,.08)] ${unlocked ? '' : 'opacity-55'}`}>
              {!unlocked && <Icon name="i-lock" className="absolute top-[5px] left-1.5 size-[11px]" />}
              Lv.{x.lv}<small className="text-[10px] font-semibold">{x.name}</small>
              {ms.claimable(x) > 0 && <span className="absolute top-1.5 right-2 size-[7px] rounded-full bg-(--accent)" />}
            </button>
          );
        })}
      </div>

      <div className="mx-4 mt-3 flex-none rounded-[18px] bg-linear-135 from-[#9585ff] to-[#6c5cf0] px-3.5 pt-3.5 pb-3 text-white shadow-[0_6px_16px_rgba(108,92,240,.25)] war:from-[#ff7a6b] war:to-[#c8364a] war:shadow-[0_6px_16px_rgba(200,54,74,.3)]">
        <h3 className="text-base font-extrabold">Lv.{t.lv} {t.title}</h3>
        <p className="mt-0.5 text-xs opacity-85">{t.desc}</p>
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-extrabold">
          <span className="block h-1.5 flex-1 overflow-hidden rounded-[3px] bg-white/25">
            <i className="block h-full rounded-[inherit] bg-white transition-[width] duration-450" style={{ width: `${doneN / real.length * 100}%` }} />
          </span>
          {doneN} / {real.length}
        </div>
        <div className="mt-2.5 flex items-center gap-[5px] text-xs font-semibold">
          <Icon name="i-star" className="size-[15px]" />모두 완료 보너스 <b>+{t.bonus}</b>{t.lv < MISSION_TIERS.length ? ' · 다음 단계 열림' : ''}
          <button disabled={!canBonus} onClick={bonus}
            className="ml-auto h-[30px] rounded-[10px] bg-white px-3 text-xs font-extrabold text-[#6c5cf0] war:text-[#c8364a] disabled:cursor-default disabled:bg-white/22 disabled:text-white">
            {ms.bonusClaimed(t.lv) ? '받음' : '받기'}
          </button>
        </div>
      </div>

      <div ref={listRef} key={tierLv} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-3 pb-5">
        {!open && (
          <div className="flex items-center gap-2 rounded-[14px] bg-(--chip-bg) px-3.5 py-3 text-xs font-bold text-(--ink-2)">
            <Icon name="i-lock" className="size-4" />Lv.{t.lv - 1} 미션을 모두 끝내고 보너스를 받으면 열려요
          </div>
        )}
        {list.map((m, i) => <MissionRow key={m.id} m={m} i={i} ms={ms} locked={!open} />)}
      </div>
    </Sheet>
  );
}

function MissionRow({ m, i, ms, locked }: { m: Mission; i: number; ms: MissionState; locked: boolean }) {
  const p = ms.progress(m), c = ms.claimed(m.id), d = p >= m.goal;
  const state = m.soon ? 'opacity-60 border-[1.5px] border-dashed border-(--ink-2) shadow-none'
    : c ? 'opacity-55' : '';
  return (
    <article style={{ animationDelay: `${i * 30}ms` }}
      className={`flex animate-pop items-center gap-3 rounded-2xl bg-(--card) p-3 shadow-[0_2px_8px_rgba(60,40,80,.07)] ${state} ${locked ? 'opacity-50 grayscale' : ''}`}>
      <span className="grid size-10 flex-none place-items-center rounded-[13px] bg-(--chip-bg) text-(--primary)"><Icon name={m.icon} /></span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold">{m.title}</div>
        <div className="mt-0.5 truncate text-[11px] text-(--ink-2)">{m.desc}</div>
        {!m.soon && (
          <div className="mt-[7px] flex items-center gap-1.5 text-[10px] font-bold text-(--ink-2) tabular-nums">
            <span className="block h-[5px] flex-1 overflow-hidden rounded-[3px] bg-(--track)">
              <i className="block h-full rounded-[inherit] bg-linear-90 from-(--primary) to-(--accent)" style={{ width: `${p / m.goal * 100}%` }} />
            </span>
            {p} / {m.goal}
          </div>
        )}
      </div>
      <div className="flex flex-none flex-col items-end gap-1.5">
        <Rewards r={m.reward} />
        <button disabled={m.soon || locked || !d || c} onClick={() => ms.claim(m)}
          className="h-7 min-w-[58px] rounded-[9px] bg-(--primary) px-2.5 text-xs font-extrabold text-white transition-transform active:scale-94 disabled:cursor-default disabled:bg-(--chip-bg) disabled:text-(--ink-2)">
          {m.soon ? '준비 중' : c ? '완료' : d ? '받기' : '진행 중'}
        </button>
      </div>
    </article>
  );
}

function Rewards({ r }: { r: Reward }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      {r.cash && <span className="flex items-center gap-[3px] text-xs font-extrabold whitespace-nowrap"><Icon name="i-coin" className="size-[13px] text-[#e0950e]" />{r.cash}</span>}
      {r.item && <span className="flex items-center gap-[3px] text-[11px] font-extrabold whitespace-nowrap text-(--accent)"><Icon name="i-gift" className="size-[13px]" />{r.item}</span>}
    </div>
  );
}
