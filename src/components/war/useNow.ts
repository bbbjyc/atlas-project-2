'use client';

import { useEffect, useState } from 'react';

// 지금 시각(밀리초). enabled 인 동안만 intervalMs 마다 갱신한다 (화면이 사라지면 타이머도 같이 멈춘다)
// 시각을 화면 계산에만 쓰는 용도: 규칙 계산(src/lib/war.ts)에는 이 값을 넘겨 주기만 한다
export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
