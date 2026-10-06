'use client';

import { useEffect, useRef, useState } from 'react';

// 친구 끊기: 한 번 눌러서 바로 끊지 않고 "끊을까요?" 확인을 거친다
export default function FriendRemove({ name, onConfirm }: { name: string; onConfirm: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  const busyRef = useRef(false);

  // 확인이 열리면 "취소"로, 닫히면 "친구 끊기"로 키보드 포커스를 옮긴다
  useEffect(() => {
    if (asking) cancelRef.current?.focus({ preventScroll: true });
    else if (wasAsking.current) askRef.current?.focus({ preventScroll: true });
    wasAsking.current = asking;
  }, [asking]);

  const confirm = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();   // 성공하면 카드가 목록에서 사라진다
    } catch (e) {
      setError(e instanceof Error ? e.message : '친구를 끊지 못했어요. 잠시 뒤에 다시 해 주세요.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!asking) {
    return (
      <div className="mt-1.5 flex justify-end">
        <button ref={askRef} type="button" onClick={() => setAsking(true)} aria-label={`${name}님과 친구 끊기`}
          className="h-7 rounded-lg px-2 text-[11px] font-bold text-(--ink-2) underline decoration-(--track) underline-offset-2">
          친구 끊기
        </button>
      </div>
    );
  }
  return (
    <div role="group" aria-label={`${name}님과 친구 끊기 확인`} className="mt-2 rounded-xl bg-(--chip-bg) px-3 py-2.5">
      <p className="text-[12px] font-bold">{name}님과 친구를 끊을까요?</p>
      <p className="mt-0.5 text-[11px] font-semibold text-(--ink-2)">끊으면 집 방문과 선물을 할 수 없어요. 다시 친구 요청을 보내면 돼요</p>
      {error && <p role="alert" className="mt-1 text-[11px] font-bold text-[#d03a40] war:text-[#ff8791]">{error}</p>}
      <div className="mt-2 flex justify-end gap-1.5">
        <button ref={cancelRef} type="button" disabled={busy} onClick={() => { setAsking(false); setError(null); }}
          className="h-8 rounded-[10px] bg-(--card) px-3 text-xs font-extrabold shadow-[0_2px_6px_rgba(0,0,0,.08)] disabled:opacity-50">
          취소
        </button>
        <button type="button" disabled={busy} onClick={confirm}
          className="h-8 rounded-[10px] bg-[#e5484d] px-3 text-xs font-extrabold text-white transition-transform active:scale-95 disabled:opacity-60">
          {busy ? '끊는 중…' : '끊기'}
        </button>
      </div>
    </div>
  );
}
