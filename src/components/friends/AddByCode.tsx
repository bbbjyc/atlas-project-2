'use client';

import { FormEvent, useRef, useState } from 'react';
import { SendFriendRequestResult, sendFriendRequest } from '@/lib/friends';
import Icon from '../ui/Icon';
import { Spinner } from '../auth/GateScreens';

const RESULT: Record<SendFriendRequestResult, string> = {
  sent: '친구 요청을 보냈어요. 상대가 수락하면 친구가 돼요',
  already_friends: '이미 친구예요',
  already_requested: '이미 요청을 보냈어요. 상대가 수락하길 기다려 주세요',
  accepted: '상대가 먼저 보낸 요청이 있어서 바로 친구가 됐어요!',
};

// 상대의 친구 코드를 입력해 요청을 보낸다 (이미 받은 요청이 있으면 바로 수락 처리된다)
export default function AddByCode({ meId, onChanged, toast }: {
  meId: number;
  onChanged: () => Promise<void>;
  toast: (msg: string) => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const busyRef = useRef(false);   // 빠르게 두 번 눌러도 한 번만 보낸다

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busyRef.current) return;
    if (!code.trim()) { setResult({ ok: false, text: '친구 코드를 입력해 주세요.' }); return; }
    busyRef.current = true;
    setBusy(true);
    setResult(null);
    try {
      const done = await sendFriendRequest(meId, code);
      setResult({ ok: true, text: RESULT[done] });
      if (done === 'sent' || done === 'accepted') setCode('');
      toast(done === 'accepted' ? '친구가 됐어요!' : done === 'sent' ? '친구 요청을 보냈어요' : RESULT[done]);
      await onChanged();
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : '요청을 보내지 못했어요. 잠시 뒤에 다시 해 주세요.' });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Icon name="i-plus" className="size-4 text-(--primary)" />친구 코드로 요청하기</h3>
      <form onSubmit={submit} noValidate className="mt-2.5 flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">친구 코드</span>
          {/* 글자 크기 16px: iOS 가 칸을 누를 때 화면을 확대하지 않는다 */}
          <input value={code} onChange={e => { setCode(e.target.value); setResult(null); }} disabled={busy} maxLength={24}
            placeholder="ABCD-EFGH" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
            aria-invalid={result && !result.ok ? true : undefined}
            className="h-[46px] w-full rounded-[14px] bg-(--chip-bg) px-3.5 text-base font-bold tracking-[.08em] uppercase outline-none placeholder:font-semibold placeholder:text-(--ink-2) focus:ring-2 focus:ring-(--primary) disabled:opacity-60" />
        </label>
        <button disabled={busy || !code.trim()}
          className="flex h-[46px] flex-none items-center justify-center gap-1.5 rounded-[14px] bg-(--primary) px-3.5 text-[13px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] transition-transform active:scale-97 disabled:bg-(--chip-bg) disabled:text-(--ink-2) disabled:shadow-none war:shadow-none">
          {busy ? <><Spinner className="border-(--ink-2)/30 border-t-(--ink-2)" />보내는 중</> : '요청 보내기'}
        </button>
      </form>
      {result && (
        <p role={result.ok ? 'status' : 'alert'}
          className={`mt-2 px-0.5 text-[12px] font-bold ${result.ok ? 'text-[#1f8a4c] war:text-[#5fd3b5]' : 'text-[#d03a40] war:text-[#ff8791]'}`}>
          {result.text}
        </p>
      )}
    </section>
  );
}
