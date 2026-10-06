'use client';

import { ReactNode } from 'react';
import Character from '../character/Character';
import { DEFAULT_CFG } from '../character/charConfig';
import RoomBackground from '../game/RoomBackground';

// 돌아가는 동그라미 (버튼 안·알림 안에서 쓴다)
export function Spinner({ className = 'border-(--ink-2)/30 border-t-(--ink-2)' }: { className?: string }) {
  return <span aria-hidden="true" className={`size-4 flex-none animate-spin rounded-full border-2 ${className}`} />;
}

// 확인 중 (로그인 상태·내 플레이어를 읽는 동안)
export function GateSplash({ text = '불러오는 중…' }: { text?: string }) {
  return (
    <main className="room relative isolate grid h-dvh w-full max-w-[430px] place-items-center overflow-hidden text-(--ink)">
      <RoomBackground />
      <div role="status" className="glass relative z-5 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[13px] font-bold">
        <Spinner />{text}
      </div>
    </main>
  );
}

// 로그인·가입·초대 동의 화면의 공통 틀: 방 배경 + 위쪽에 캐릭터, 아래쪽에 카드
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="room relative isolate flex h-dvh w-full max-w-[430px] flex-col overflow-hidden text-(--ink)">
      <RoomBackground />
      <div className="relative z-2 flex min-h-[120px] flex-1 flex-col items-center justify-end gap-2.5 px-6 pt-(--safe-t) pb-3">
        <h1 className="glass flex-none rounded-2xl px-4 py-2 text-center text-[13px] font-extrabold text-balance">
          링크 하나로, 친구의 친구의 친구까지
        </h1>
        <div className="flex min-h-0 w-full flex-1 items-end justify-center">
          <Character cfg={DEFAULT_CFG} className="block max-h-full w-auto max-w-[70%] animate-breathe" />
        </div>
      </div>
      <div className="relative z-31 flex max-h-[80%] flex-none animate-pop flex-col overflow-y-auto rounded-t-[26px] bg-(--sheet) px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,.22)]">
        {children}
      </div>
    </main>
  );
}

// 처음 로그인 상태를 확인하지 못했을 때 (인터넷 문제 등). 로그아웃으로 오해하지 않게 따로 알리고 다시 해 보게 한다
export function GateNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <AuthFrame>
      <h2 className="text-lg font-extrabold">연결에 문제가 있어요</h2>
      <p role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ink-2)">{message}</p>
      <button type="button" onClick={onRetry}
        className="mt-4 h-[48px] rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] transition-transform active:scale-97">
        다시 시도
      </button>
    </AuthFrame>
  );
}
