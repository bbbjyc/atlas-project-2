'use client';

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

// 아이콘에서 튀어나오는 90% 창 (상점·꾸미기·미션·친구). 열리면 포커스를 안으로 옮기고, 닫히면 연 버튼으로 돌려준다
// 뒤쪽 HUD 를 막는 것(inert)은 GameScreen 이 한다
export default function Sheet({ open, origin, onClose, labelledBy, children }: {
  open: boolean;
  origin?: HTMLElement | null;   // 튀어나올 자리 (버튼)
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [originXY, setOriginXY] = useState('50% 50%');
  const opener = useRef<Element | null>(null);

  // 열기 직전에 버튼 위치를 transform-origin 으로
  useLayoutEffect(() => {
    if (!open || !origin || !ref.current) return;
    const room = ref.current.offsetParent as HTMLElement | null;
    if (!room) return;
    const r = room.getBoundingClientRect(), b = origin.getBoundingClientRect();
    setOriginXY(`${b.left + b.width / 2 - r.left - r.width * 0.05}px ${b.top + b.height / 2 - r.top - r.height * 0.05}px`);
  }, [open, origin]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    ref.current?.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener.current instanceof HTMLElement && opener.current.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <>
      <div onClick={onClose}
        className={`absolute inset-0 z-30 bg-[rgba(14,9,24,.6)] transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <section ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-hidden={!open} inert={!open}
        style={{ transformOrigin: originXY }}
        className={`absolute top-[5%] left-[5%] z-31 flex h-[90%] w-[90%] flex-col overflow-hidden rounded-[26px] bg-(--sheet) text-(--ink) shadow-[0_24px_60px_rgba(0,0,0,.35)]
          transition-[scale,opacity] duration-[420ms,220ms] ease-[cubic-bezier(.2,.9,.25,1.04)] ${open ? 'scale-100 opacity-100' : 'pointer-events-none scale-[.06] opacity-0'}`}>
        {children}
      </section>
    </>
  );
}

// 창 머리: 제목 + (지갑 등. 오른쪽으로 붙이려면 ml-auto) + 닫기
export function SheetHead({ id, title, children, onClose }: { id: string; title: string; children?: ReactNode; onClose: () => void }) {
  return (
    <header className="flex items-center gap-2 pt-[18px] pr-4 pb-3.5 pl-5">
      <h2 id={id} className="text-xl font-extrabold tracking-[-.02em]">{title}</h2>
      {children}
      <button onClick={onClose} aria-label="닫기" className="grid size-[34px] flex-none place-items-center rounded-xl bg-(--chip-bg)">
        <Icon name="i-close" className="size-[18px]" />
      </button>
    </header>
  );
}

// 캐시 잔액 알약
export function Wallet({ cash, shake = 0, className = '' }: { cash: number; shake?: number; className?: string }) {
  return (
    <div key={shake} className={`${className} flex h-[34px] items-center gap-[5px] rounded-[17px] bg-(--chip-bg) px-3 text-[13px] font-extrabold tabular-nums ${shake ? 'animate-shake' : ''}`}>
      <Icon name="i-coin" className="size-4 text-[#e0950e]" />
      <span>{cash.toLocaleString()}</span>
    </div>
  );
}
