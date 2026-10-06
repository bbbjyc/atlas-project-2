'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './ui/Icon';
import { CloseButton, Wallet } from './ui/Sheet';
import { useGame } from './game/GameContext';
import type { ShortageReason } from './game/GameContext';

// [캐시, 원]. 기본 1캐시 = 1원, 큰 상품일수록 할인을 더 해 준다
const TOPUP: [number, number][] = [[100, 100], [200, 190], [500, 450], [1000, 880], [2000, 1700], [4000, 3200], [10000, 7500]];
const won = (n: number) => `${n.toLocaleString()}원`;

export interface TopupCtx { need: number; reason: ShortageReason; soon?: boolean }

// fake_door_logs 에 남길 행 (plan.md: event_type popup_shown / tier_clicked, tier, shortage_reason)
// TODO: src/lib/fakeDoor.ts (조원영 담당)가 main 에 들어오면 그 함수로 저장. 지금은 콘솔에만 남긴다
export function logFakeDoor(event_type: 'popup_shown' | 'tier_clicked', tier: string | null, shortage_reason: ShortageReason) {
  console.log('fake_door_logs', { event_type, tier, shortage_reason });
}

// 충전 팝업 (페이크 도어: 실제 결제는 아직 없음). 어떤 화면 위에도 뜬다
// 캐시가 모자라서 열렸으면 부족분을 딱 채우는 가장 작은 상품을 "추천"으로 맨 위에, 더 큰 상품은 아래에
export default function TopupPopup({ ctx, cash, onClose }: { ctx: TopupCtx; cash: number; onClose: () => void }) {
  const game = useGame();
  const [soon, setSoon] = useState(!!ctx.soon);
  const [shown, setShown] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const short = ctx.need - cash;

  useLayoutEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // 처음과 "준비 중" 화면으로 바뀔 때 포커스를 팝업 안 첫 버튼으로
  useEffect(() => { cardRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }); }, [soon]);

  const closing = useRef(false);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    window.setTimeout(() => {
      onClose();
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    }, 250);
  };
  const closeRef = useRef(close); closeRef.current = close;

  // Esc 는 팝업만 닫는다 (뒤에 열린 상점은 그대로)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); closeRef.current(); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);

  const pick = (amt: number) => {
    logFakeDoor('tier_clicked', String(amt), ctx.reason);
    game.addCash(amt);
    game.toast(`캐시 +${amt.toLocaleString()}`);
    setSoon(true);
  };

  let best = -1;
  if (short > 0) { best = TOPUP.findIndex(([amt]) => amt >= short); if (best < 0) best = TOPUP.length - 1; }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="topupTitle" onClick={e => e.target === e.currentTarget && close()}
      className={`absolute inset-0 z-35 grid place-items-center bg-[rgba(14,9,24,.6)] p-5 transition-opacity duration-250 ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
      <div ref={cardRef}
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-3xl bg-(--sheet) text-(--ink) shadow-[0_24px_60px_rgba(0,0,0,.35)] transition-[translate,scale] duration-320 ease-[cubic-bezier(.2,.9,.25,1.04)] ${shown ? '' : 'translate-y-[18px] scale-96'}`}>
        {soon ? (
          <div className="px-[22px] pt-[30px] pb-[22px] text-center">
            <div className="mx-auto mb-3.5 grid size-14 place-items-center rounded-[18px] bg-[#fff0d2] text-[#e0950e] war:bg-[rgba(255,183,77,.16)] war:text-[#ffb74d]">
              <Icon name="i-coin" className="size-7" />
            </div>
            <h3 id="topupTitle" className="text-lg font-extrabold">준비 중이에요</h3>
            <p className="mt-1.5 text-[13px] text-(--ink-2)">출시되면 알려드릴게요</p>
            <button onClick={close} className="mt-5 h-[46px] w-full rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)]">알겠어요</button>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 pt-[18px] pr-4 pb-3.5 pl-5">
              <h2 id="topupTitle" className="text-xl font-extrabold tracking-[-.02em]">캐시 충전</h2>
              <Wallet cash={cash} className="ml-auto" />
              <CloseButton onClick={close} />
            </header>
            <div className="flex flex-col gap-2 overflow-y-auto px-4 pt-0.5 pb-[18px]">
              {best >= 0 ? (
                <>
                  <p className="mb-1.5 flex items-center gap-1.5 rounded-[14px] bg-[#fff0d2] px-3 py-2.5 text-[13px] font-bold text-[#b8740a] war:bg-[rgba(255,159,74,.15)] war:text-[#ffb36e]">
                    <Icon name="i-coin" className="size-4" /><span>캐시가 <b className="font-black">{short.toLocaleString()}</b> 부족해요</span>
                  </p>
                  <Pack pack={TOPUP[best]} i={0} best onPick={pick} />
                  {best < TOPUP.length - 1 && <p className="mt-2 text-xs font-bold text-(--ink-2)">더 많이 충전하고 더 할인받기</p>}
                  {TOPUP.slice(best + 1).map((p, i) => <Pack key={p[0]} pack={p} i={i + 1} onPick={pick} />)}
                </>
              ) : TOPUP.map((p, i) => <Pack key={p[0]} pack={p} i={i} onPick={pick} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Pack({ pack: [amt, price], i, best = false, onPick }: { pack: [number, number]; i: number; best?: boolean; onPick: (amt: number) => void }) {
  const off = Math.round((1 - price / amt) * 100);
  return (
    <button onClick={() => onPick(amt)} data-amt={amt} style={{ animationDelay: `${i * 30}ms` }}
      className={`relative flex w-full animate-pop items-center gap-2.5 rounded-2xl bg-(--card) text-left transition-transform active:scale-98 ${
        best ? 'mt-1.5 px-3.5 pt-[18px] pb-4 shadow-[0_0_0_2px_var(--primary),0_8px_18px_rgba(124,108,246,.22)]' : 'p-3 shadow-[0_2px_8px_rgba(60,40,80,.07)]'}`}>
      {best && <span className="absolute -top-2.5 left-3.5 rounded-lg bg-(--primary) px-[9px] py-0.5 text-[11px] font-extrabold text-white">추천</span>}
      <span className={`grid flex-none place-items-center rounded-xl bg-[#fff0d2] text-[#e0950e] war:bg-[rgba(255,183,77,.16)] war:text-[#ffb74d] ${best ? 'size-11' : 'size-[38px]'}`}>
        <Icon name="i-coin" />
      </span>
      <span className={`flex-1 font-extrabold tabular-nums ${best ? 'text-[19px]' : 'text-[15px]'}`}>{amt.toLocaleString()} 캐시</span>
      <span className="flex flex-none flex-col items-end gap-1">
        {off > 0 && (
          <span className="flex items-center gap-[5px] text-[11px] text-(--ink-2)">
            <em className="rounded-md bg-(--accent) px-1.5 py-px text-[10px] font-extrabold text-white not-italic">-{off}%</em><s>{won(amt)}</s>
          </span>
        )}
        <span className="flex h-[30px] items-center rounded-[10px] bg-(--primary) px-3 text-[13px] font-extrabold text-white tabular-nums">{won(price)}</span>
      </span>
    </button>
  );
}
