'use client';

import { createContext, useContext } from 'react';
import type { AuthUser, PlayerRow } from '@/lib/auth';

// 지금 로그인한 계정과 내 플레이어. AuthGate 가 게임 화면을 감싸서 내려 준다
// 친구·설정 창처럼 기존 props 를 바꾸지 않고 "누구인지"를 알아야 하는 곳에서 쓴다
export interface Account {
  user: AuthUser;
  player: PlayerRow;
  logout: () => Promise<void>;   // 실패하면 한국어 오류를 던진다
}

const AccountCtx = createContext<Account | null>(null);
export const AccountProvider = AccountCtx.Provider;

// 로그인하지 않은 곳(provider 밖)에서는 null
export function useAccount(): Account | null {
  return useContext(AccountCtx);
}
