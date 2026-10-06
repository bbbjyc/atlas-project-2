'use client';

import { FormEvent, useRef, useState } from 'react';
import { AuthUser, MIN_PASSWORD_LENGTH, signIn, signUp } from '@/lib/auth';
import Icon from '../ui/Icon';
import { AuthFrame, Spinner } from './GateScreens';
import { readInvite } from './session';

type Mode = 'login' | 'signup';

// 입력칸: 글자 크기 16px 이상이어야 iOS 가 칸을 누를 때 화면을 확대하지 않는다
const FIELD = 'h-[50px] w-full rounded-[14px] bg-(--chip-bg) px-4 text-base font-semibold outline-none placeholder:font-semibold placeholder:text-(--ink-2) focus:ring-2 focus:ring-(--primary) disabled:opacity-60';

// 첫 화면(로그인하지 않았을 때만): 이메일 + 비밀번호로 로그인하거나 가입한다
// 성공하면 onAuthed 로 알리고, 그다음(초대 동의·펫 만들기)은 AuthGate 가 이어 간다
export default function AuthScreen({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
  const invite = readInvite();   // 친구 초대 링크로 왔으면 코드가 있다
  const [mode, setMode] = useState<Mode>(invite ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);   // 빠르게 두 번 눌러도 한 번만 보낸다
  const signup = mode === 'signup';

  const switchMode = (next: Mode) => {
    if (busyRef.current || next === mode) return;
    setMode(next);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const user = signup ? await signUp(email, password) : await signIn(email, password);
      onAuthed(user);   // 화면이 바뀔 때까지 버튼은 계속 잠가 둔다
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 생겼어요. 잠시 뒤에 다시 해 주세요.');
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <AuthFrame>
      {invite && (
        <div className="mb-3 flex items-center gap-2.5 rounded-[14px] bg-(--chip-bg) px-3 py-2.5">
          <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-(--primary) text-white"><Icon name="i-invite" className="size-4" /></span>
          <p className="min-w-0 text-[12px] leading-snug font-semibold text-(--ink-2)">
            <b className="block text-[13px] font-extrabold text-(--ink)">친구 초대로 왔어요</b>
            {signup ? '가입하면 초대한 친구와 바로 친구가 돼요' : '처음이면 가입 탭에서 시작해 주세요'}
          </p>
        </div>
      )}

      <div role="tablist" aria-label="로그인 또는 가입" className="relative grid grid-cols-2 rounded-2xl bg-(--chip-bg) p-1">
        <span className="absolute top-1 left-1 h-[38px] w-[calc((100%-8px)/2)] rounded-xl bg-(--card) shadow-[0_2px_6px_rgba(0,0,0,.08)] transition-transform duration-300 ease-[cubic-bezier(.3,1.2,.5,1)]"
          style={{ transform: `translateX(${signup ? 100 : 0}%)` }} />
        {([['login', '로그인'], ['signup', '가입']] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} disabled={busy} onClick={() => switchMode(k)}
            className="relative h-[38px] text-[13px] font-bold text-(--ink-2) transition-colors aria-selected:text-(--ink)">
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} noValidate aria-label={signup ? '가입' : '로그인'} className="mt-3 flex flex-col gap-2.5">
        <label className="block">
          <span className="sr-only">이메일</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy}
            placeholder="이메일" autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            aria-invalid={error ? true : undefined} className={FIELD} />
        </label>
        <label className="relative block">
          <span className="sr-only">비밀번호</span>
          <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} disabled={busy}
            placeholder={signup ? `비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)` : '비밀번호'} autoComplete={signup ? 'new-password' : 'current-password'}
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            aria-invalid={error ? true : undefined} className={`${FIELD} pr-[68px]`} />
          <button type="button" onClick={() => setShowPw(v => !v)} aria-pressed={showPw} aria-label="비밀번호 보이기"
            className="absolute top-1/2 right-2 h-[34px] -translate-y-1/2 rounded-[10px] px-2.5 text-xs font-extrabold text-(--ink-2)">
            {showPw ? '숨기기' : '보기'}
          </button>
        </label>

        {error && <p role="alert" className="px-1 text-[13px] font-bold text-[#d03a40]">{error}</p>}

        <button disabled={busy}
          className="flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(124,108,246,.3)] transition-transform active:scale-97 disabled:shadow-none disabled:opacity-70">
          {busy
            ? <><Spinner className="border-white/40 border-t-white" />{signup ? '가입하는 중…' : '로그인하는 중…'}</>
            : signup ? '가입하기' : '로그인'}
        </button>
        <p className="px-1 text-center text-[11px] leading-snug font-semibold text-(--ink-2)">
          {signup
            ? '가입하면 펫을 만들어요. 이메일은 로그인에만 쓰고 다른 사람에게 보이지 않아요'
            : '같은 계정이면 어느 기기에서나 내 펫이 그대로예요'}
        </p>
      </form>
    </AuthFrame>
  );
}
