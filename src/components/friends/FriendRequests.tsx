'use client';

import { useRef, useState } from 'react';
import type { PlayerRow } from '@/lib/auth';
import { respondFriendRequest } from '@/lib/friends';
import Icon from '../ui/Icon';
import FriendAvatar from './FriendAvatar';

const CARD = 'rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]';

// 받은 요청(수락·거절)과 내가 보낸 요청(대기 중) 목록
export default function FriendRequests({ meId, incoming, outgoing, onChanged, toast }: {
  meId: number;
  incoming: PlayerRow[];
  outgoing: PlayerRow[];
  onChanged: () => Promise<void>;
  toast: (msg: string) => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);   // 한 번에 하나만 처리한다

  const respond = async (p: PlayerRow, accept: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(p.id);
    setError(null);
    try {
      await respondFriendRequest(meId, p.id, accept);
      toast(accept ? `${p.nickname}님과 친구가 됐어요!` : `${p.nickname}님의 요청을 거절했어요`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리하지 못했어요. 잠시 뒤에 다시 해 주세요.');
    } finally {
      await onChanged();   // 성공이든 "이미 처리된 요청"이든 목록을 맞춘다
      busyRef.current = false;
      setBusyId(null);
    }
  };

  return (
    <>
      <section className={CARD} aria-labelledby="incomingTitle">
        <h3 id="incomingTitle" className="flex items-center gap-1.5 text-sm font-extrabold">
          <Icon name="i-gift" className="size-4 text-(--primary)" />받은 요청
          {incoming.length > 0 && <span className="rounded-md bg-(--accent) px-1.5 py-px text-[10px] font-extrabold text-white">{incoming.length}</span>}
        </h3>
        {incoming.length === 0 ? (
          <p className="mt-2 text-xs font-semibold text-(--ink-2)">받은 요청이 없어요</p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {incoming.map(p => (
              <li key={p.id} className="flex items-center gap-2.5">
                <FriendAvatar id={p.id} className="size-10" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold">{p.nickname}</span>
                <button type="button" disabled={busyId !== null} onClick={() => respond(p, true)} aria-label={`${p.nickname}님 요청 수락`}
                  className="h-8 flex-none rounded-[10px] bg-(--primary) px-3 text-xs font-extrabold text-white transition-transform active:scale-94 disabled:opacity-50">
                  {busyId === p.id ? '처리 중…' : '수락'}
                </button>
                <button type="button" disabled={busyId !== null} onClick={() => respond(p, false)} aria-label={`${p.nickname}님 요청 거절`}
                  className="h-8 flex-none rounded-[10px] bg-(--chip-bg) px-3 text-xs font-extrabold transition-transform active:scale-94 disabled:opacity-50">
                  거절
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p role="alert" className="mt-2 text-[12px] font-bold text-[#d03a40] war:text-[#ff8791]">{error}</p>}
      </section>

      <section className={CARD} aria-labelledby="outgoingTitle">
        <h3 id="outgoingTitle" className="flex items-center gap-1.5 text-sm font-extrabold">
          <Icon name="i-invite" className="size-4 text-(--primary)" />보낸 요청
          {outgoing.length > 0 && <span className="rounded-md bg-(--chip-bg) px-1.5 py-px text-[10px] font-extrabold text-(--ink-2)">{outgoing.length}</span>}
        </h3>
        {outgoing.length === 0 ? (
          <p className="mt-2 text-xs font-semibold text-(--ink-2)">보낸 요청이 없어요</p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {outgoing.map(p => (
              <li key={p.id} className="flex items-center gap-2.5">
                <FriendAvatar id={p.id} className="size-10" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold">{p.nickname}</span>
                <span className="flex-none rounded-lg bg-(--chip-bg) px-2 py-1 text-[11px] font-bold text-(--ink-2)">답을 기다리는 중</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
