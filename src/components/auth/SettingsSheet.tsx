'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseButton } from '../ui/Sheet';
import { useGame } from '../game/GameContext';
import MyCodeCard from '../friends/MyCodeCard';
import { useAccount } from './AccountContext';
import { Spinner } from './GateScreens';

// 설정: 내 계정(닉네임·이메일)과 친구 코드, 로그아웃. 다른 창(Sheet)처럼 Esc·바깥을 누르면 닫히고, 닫으면 연 버튼으로 포커스가 돌아간다
// 내용이 적어서 아래에서 올라오는 작은 창으로 만들었다. 뒤쪽 HUD 를 막는 것(inert)은 GameScreen 이 한다
export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const account = useAccount();
  const game = useGame();
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const busyRef = useRef(false);

  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    if (shown) boxRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }, [shown]);

  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    window.setTimeout(() => {
      onCloseRef.current();
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    }, 250);
  }, []);

  useEffect(() => {
    // 충전 팝업이 위에 떠 있으면 Esc 는 팝업이 먼저 받는다 (TopupPopup 이 이벤트를 멈춘다)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const logout = async () => {
    if (!account || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await account.logout();   // 성공하면 AuthGate 가 로그인 화면으로 바꾼다
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그아웃하지 못했어요. 잠시 뒤에 다시 해 주세요.');
      busyRef.current = false;
      setBusy(false);
    }
  };

  const row = 'flex items-center justify-between gap-3 text-[13px]';
  return (
    <>
      <div onClick={close}
        className={`absolute inset-0 z-30 bg-[rgba(14,9,24,.6)] transition-opacity duration-300 ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <section ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="settingsTitle"
        className={`absolute right-[5%] bottom-[5%] left-[5%] z-31 flex max-h-[90%] flex-col overflow-hidden rounded-[26px] bg-(--sheet) text-(--ink) shadow-[0_24px_60px_rgba(0,0,0,.35)]
          transition-[translate,opacity] duration-300 ease-[cubic-bezier(.2,.9,.25,1.04)] ${shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}>
        <header className="flex items-center gap-2 pt-[18px] pr-4 pb-3 pl-5">
          <h2 id="settingsTitle" className="text-xl font-extrabold tracking-[-.02em]">설정</h2>
          <span className="ml-auto"><CloseButton onClick={close} /></span>
        </header>

        <div className="flex flex-col gap-2.5 overflow-y-auto px-4 pb-5">
          {account ? (
            <>
              <section className="rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
                <h3 className="text-sm font-extrabold">내 계정</h3>
                <dl className="mt-2.5 flex flex-col gap-2">
                  <div className={row}><dt className="flex-none font-bold text-(--ink-2)">닉네임</dt><dd className="min-w-0 truncate font-extrabold">{account.player.nickname}</dd></div>
                  <div className={row}><dt className="flex-none font-bold text-(--ink-2)">이메일</dt><dd className="min-w-0 truncate font-extrabold">{account.user.email || '-'}</dd></div>
                </dl>
              </section>
              <MyCodeCard code={account.player.invite_code} toast={game.toast} />
              {error && <p role="alert" className="px-1 text-[13px] font-bold text-[#d03a40] war:text-[#ff8791]">{error}</p>}
              <button type="button" onClick={logout} disabled={busy}
                className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-(--chip-bg) text-[15px] font-extrabold text-[#d03a40] transition-transform active:scale-97 disabled:opacity-60 war:text-[#ff8791]">
                {busy ? <><Spinner />로그아웃하는 중…</> : '로그아웃'}
              </button>
            </>
          ) : (
            <p className="rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-[12px] font-bold text-(--ink-2)">로그인하지 않았어요</p>
          )}
        </div>
      </section>
    </>
  );
}
