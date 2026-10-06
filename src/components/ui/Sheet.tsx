'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

const CloseCtx = createContext<() => void>(() => {});
// 창 안에서 "닫기" (닫히는 애니메이션이 끝난 뒤 onClose 가 불린다)
export const useSheetClose = () => useContext(CloseCtx);

// 아이콘에서 튀어나오는 90% 창 (상점·꾸미기·미션·친구). 화면에 붙으면 연 버튼 자리에서 커지며 나오고,
// 닫으면 다시 작아진 뒤 onClose 를 부른다. 포커스는 안으로 옮겼다가 닫을 때 연 버튼으로 돌려준다
// 뒤쪽 HUD 를 막는 것(inert)은 GameScreen 이 한다
export default function Sheet({ onClose, labelledBy, children }: { onClose: () => void; labelledBy: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [originXY, setOriginXY] = useState('50% 50%');
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;

  // 처음 붙을 때: 연 버튼 위치를 transform-origin 으로 잡고 다음 프레임에 펼친다
  useLayoutEffect(() => {
    const el = ref.current, room = el?.offsetParent as HTMLElement | null;
    const btn = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    opener.current = btn;
    const target = btn?.firstElementChild instanceof HTMLElement ? btn.firstElementChild : btn;   // 버튼 안의 동그라미 아이콘
    if (el && room && target) {
      const r = room.getBoundingClientRect(), b = target.getBoundingClientRect();
      setOriginXY(`${b.left + b.width / 2 - r.left - r.width * 0.05}px ${b.top + b.height / 2 - r.top - r.height * 0.05}px`);
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    window.setTimeout(() => {
      onCloseRef.current();
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    }, 300);
  }, []);

  useEffect(() => {
    if (!shown) return;
    ref.current?.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
  }, [shown]);

  useEffect(() => {
    // 충전 팝업이 위에 떠 있으면 Esc 는 팝업이 먼저 받는다 (TopupPopup 이 이벤트를 멈춘다)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <CloseCtx.Provider value={close}>
      <div onClick={close}
        className={`absolute inset-0 z-30 bg-[rgba(14,9,24,.6)] transition-opacity duration-300 ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy}
        style={{ transformOrigin: originXY }}
        className={`absolute top-[5%] left-[5%] z-31 flex h-[90%] w-[90%] flex-col overflow-hidden rounded-[26px] bg-(--sheet) text-(--ink) shadow-[0_24px_60px_rgba(0,0,0,.35)]
          transition-[scale,opacity] duration-[420ms,220ms] ease-[cubic-bezier(.2,.9,.25,1.04)] ${shown ? 'scale-100 opacity-100' : 'pointer-events-none scale-[.06] opacity-0'}`}>
        {children}
      </section>
    </CloseCtx.Provider>
  );
}

// 창 머리: 제목 + (지갑 등. 오른쪽으로 붙이려면 ml-auto) + 닫기
export function SheetHead({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  const close = useSheetClose();
  return (
    <header className="flex items-center gap-2 pt-[18px] pr-4 pb-3.5 pl-5">
      <h2 id={id} className="text-xl font-extrabold tracking-[-.02em]">{title}</h2>
      {children}
      <CloseButton onClick={close} />
    </header>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="닫기" className="grid size-[34px] flex-none place-items-center rounded-xl bg-(--chip-bg)">
      <Icon name="i-close" className="size-[18px]" />
    </button>
  );
}

// 캐시 잔액 알약. shake 숫자가 바뀌면 한 번 흔들린다
export function Wallet({ cash, shake = 0, className = '' }: { cash: number; shake?: number; className?: string }) {
  return (
    <div key={shake} className={`${className} flex h-[34px] items-center gap-[5px] rounded-[17px] bg-(--chip-bg) px-3 text-[13px] font-extrabold tabular-nums ${shake ? 'animate-shake' : ''}`}>
      <Icon name="i-coin" className="size-4 text-[#e0950e]" />
      <span>{cash.toLocaleString()}</span>
    </div>
  );
}
