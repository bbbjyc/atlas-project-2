'use client';

import { useEffect, useRef, useState } from 'react';
import { findInviter } from '@/lib/clan';
import Icon from '../ui/Icon';
import { AuthFrame, Spinner } from './GateScreens';

type Lookup = { kind: 'loading' } | { kind: 'found'; nickname: string } | { kind: 'unknown' };

// 초대 링크로 가입한 사람에게 "○○님의 클랜에 들어갈래요?"를 묻는다 (가입할 때 한 번만, 펫을 만들기 전에)
// 어느 쪽을 골라도 초대한 사람과는 친구가 된다. 고르는 것은 클랜뿐이다
// 없는 코드(onInvalid)면 초대 없이 온 것으로 보고 이 단계를 건너뛴다
export default function InviteConsent({ inviteCode, onChoose, onInvalid }: {
  inviteCode: string;
  onChoose: (agree: boolean) => void;
  onInvalid: () => void;
}) {
  const [who, setWho] = useState<Lookup>({ kind: 'loading' });
  const invalidRef = useRef(onInvalid); invalidRef.current = onInvalid;

  useEffect(() => {
    let alive = true;
    findInviter(inviteCode).then(found => {
      if (!alive) return;
      if (!found) invalidRef.current();
      else setWho({ kind: 'found', nickname: found.nickname });
    }).catch(() => {
      if (alive) setWho({ kind: 'unknown' });   // 이름을 못 읽어도 고를 수는 있게 한다 (가입할 때 다시 확인한다)
    });
    return () => { alive = false; };
  }, [inviteCode]);

  const loading = who.kind === 'loading';
  const name = who.kind === 'found' ? `${who.nickname}님` : '초대한 친구';

  return (
    <AuthFrame>
      <div className="flex items-center gap-2.5">
        <span className="grid size-10 flex-none place-items-center rounded-xl bg-(--primary) text-white"><Icon name="i-shield" className="size-5" /></span>
        <h2 className="min-w-0 text-lg leading-tight font-extrabold break-keep">
          {loading ? '초대한 친구를 찾는 중…' : `${name}의 클랜에 들어갈래요?`}
        </h2>
      </div>
      <p className="mt-2 text-[12px] leading-snug font-semibold text-(--ink-2)">
        같은 클랜이 되면 클랜전을 함께 해요. 새 클랜을 만들어도 {name}과는 친구로 이어져요. 이 선택은 가입할 때 한 번만 해요
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" disabled={loading} onClick={() => onChoose(true)}
          className="flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] transition-transform active:scale-97 disabled:opacity-60 disabled:shadow-none">
          {loading && <Spinner className="border-white/40 border-t-white" />}들어갈래요
        </button>
        <button type="button" disabled={loading} onClick={() => onChoose(false)}
          className="h-[46px] rounded-[14px] bg-(--chip-bg) text-[14px] font-extrabold transition-transform active:scale-97 disabled:opacity-60">
          새 클랜 만들기
        </button>
      </div>
    </AuthFrame>
  );
}
