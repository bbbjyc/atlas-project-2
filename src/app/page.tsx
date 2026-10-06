'use client';

import AuthGate from '@/components/auth/AuthGate';

// 로그인 확인 → (가입·펫 만들기) → 게임 화면은 AuthGate 가 이어 준다
export default function Home() {
  return <AuthGate />;
}
