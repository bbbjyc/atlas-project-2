'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerRow } from '@/lib/auth';
import { getFriendOverview } from '@/lib/friends';

// 친구 창이 쓰는 값 한 묶음. 읽기에 실패하면 error 에 문장을 담는다.
// loaded 가 false 인 동안은 "아직 모름"이므로 화면은 "친구가 없어요"를 보여 주면 안 된다
export interface FriendData {
  friends: PlayerRow[];
  incoming: PlayerRow[];
  outgoing: PlayerRow[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;   // 다시 읽는다 (읽는 동안에도 이미 있는 목록은 그대로 둔다). 오류는 error 로만 알린다
}

const NONE: PlayerRow[] = [];

// myId: 내 players.id. null 이면(로그인 전) 아무것도 읽지 않는다
export function useFriendData(myId: number | null): FriendData {
  const [lists, setLists] = useState({ friends: NONE, incoming: NONE, outgoing: NONE });
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(myId !== null);
  const [error, setError] = useState<string | null>(null);
  const turn = useRef(0);   // 늦게 도착한 옛 응답이 새 응답을 덮어쓰지 않게

  const reload = useCallback(async () => {
    if (myId === null) return;
    const mine = ++turn.current;
    setLoading(true);
    try {
      const next = await getFriendOverview(myId);
      if (mine !== turn.current) return;
      setLists(next);
      setLoaded(true);
      setError(null);
    } catch (e) {
      if (mine !== turn.current) return;
      setError(e instanceof Error ? e.message : '친구 목록을 불러오지 못했어요.');
    } finally {
      if (mine === turn.current) setLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    void reload();
    return () => { turn.current++; };
  }, [reload]);

  return { ...lists, loaded, loading, error, reload };
}
