'use client';

import { useEffect, useRef, useState } from 'react';
import { formatFriendCode } from '@/lib/friendState';
import Icon from '../ui/Icon';
import { copyText } from './clipboard';

// 내 친구 코드(= players.invite_code). 크게 보여 주고 복사한다. 초대 링크로 들어온 친구는 코드 없이도 자동으로 친구가 된다
export default function MyCodeCard({ code, toast }: { code: string; toast: (msg: string) => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const ok = await copyText(code);   // 붙여 넣기 쉽게 하이픈 없는 원래 코드를 복사한다 (입력할 때는 하이픈이 있어도 된다)
    toast(ok ? '친구 코드를 복사했어요' : '복사하지 못했어요. 코드를 길게 눌러 복사해 주세요');
    if (!ok) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="rounded-[18px] bg-linear-135 from-[#9585ff] to-[#6c5cf0] p-3.5 text-white shadow-[0_6px_16px_rgba(108,92,240,.25)] war:from-[#ff7a6b] war:to-[#c8364a]">
      <h3 className="flex items-center gap-1.5 text-base font-extrabold"><Icon name="i-heart" className="size-[18px]" />내 친구 코드</h3>
      <p className="mt-0.5 text-xs opacity-85">이 코드를 친구에게 알려 주면 친구 요청을 보낼 수 있어요</p>
      <div className="mt-2.5 flex items-center gap-2">
        <b aria-label={`내 친구 코드 ${code.split('').join(' ')}`}
          className="min-w-0 flex-1 truncate rounded-[10px] bg-white/20 px-3 py-2 text-center text-[24px] font-extrabold tracking-[.12em] tabular-nums select-all">
          {formatFriendCode(code)}
        </b>
        <button type="button" onClick={copy}
          className="h-[44px] flex-none rounded-[10px] bg-white px-3.5 text-xs font-extrabold text-[#6c5cf0] transition-transform active:scale-95 war:text-[#c8364a]">
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </section>
  );
}
