'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { GameState } from './useGameState';
import type { CharConfig } from '../character/charConfig';

// fake_door_logs.shortage_reason 에 남는 값 (plan.md)
export type ShortageReason = 'feed' | 'clean' | 'shower' | 'heal' | 'gift' | 'battle' | 'buy_item';

// 게임 화면 안의 컴포넌트(상점·미션·친구 등)가 같이 쓰는 값. 기존 props(pet, onPetUpdate, onClose)를 바꾸지 않으려고 context 로 넘긴다
export interface GameApi extends GameState {
  war: boolean;
  cfg: CharConfig;   // 내 캐릭터 모습
  openTopup: (need?: number, reason?: ShortageReason) => void;   // 충전 팝업. need: 하려던 행동의 비용 (직접 열면 0)
  openSoon: (tier: string) => void;                              // 바로 "준비 중이에요" (프리미엄 결제)
}

const GameCtx = createContext<GameApi | null>(null);
export const GameProvider = GameCtx.Provider;

export function useGame() {
  const g = useContext(GameCtx);
  if (!g) throw new Error('useGame 은 GameScreen 안에서만 쓸 수 있어요');
  return g;
}

// 화면 가운데 잠깐 뜨는 알림. 최대 3개까지 줄 서서 하나씩 보여 준다
export function useToastQueue() {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const queue = useRef<string[]>([]);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  const next = useCallback(() => {
    const m = queue.current.shift();
    if (!m) { busy.current = false; return; }
    busy.current = true;
    setMsg(m); setOn(true);
    timers.current.push(window.setTimeout(() => {
      setOn(false);
      timers.current.push(window.setTimeout(next, 250));
    }, 1300));
  }, []);

  const toast = useCallback((m: string) => {
    if (queue.current.length < 3) queue.current.push(m);
    if (!busy.current) next();
  }, [next]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return { msg, on, toast };
}
