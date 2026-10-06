'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pet } from '@/types/pet';
import { AuthUser, PlayerRow, getAuthUser, getMyPlayer, onAuthChange, signOut } from '@/lib/auth';
import { joinClan } from '@/lib/clan';
import PetCreation from '../PetCreation';
import GameScreen from '../GameScreen';
import { savePet } from '../game/storage';
import { AccountProvider } from './AccountContext';
import AuthScreen from './AuthScreen';
import InviteConsent from './InviteConsent';
import { GateNotice, GateSplash } from './GateScreens';
import {
  captureInviteFromUrl, clearInvite, forgetPlayerId, petForPlayer, readInvite, rememberPlayerId,
} from './session';

// 내 플레이어를 읽는 단계
type PlayerState =
  | { kind: 'idle' }                                    // 아직 로그인 전
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'none' }                                    // 로그인했지만 아직 가입(펫 만들기) 전
  | { kind: 'ready'; player: PlayerRow; pet: Pet };

const messageOf = (e: unknown) => (e instanceof Error ? e.message : '문제가 생겼어요. 잠시 뒤에 다시 해 주세요.');

// 앱의 문지기: 로그인하지 않았으면 로그인·가입 → 로그인했지만 플레이어가 없으면 (초대 동의) → 펫 만들기 → 게임
// 이미 플레이어가 있는 계정은 가입·펫 만들기 화면을 다시 보지 않는다
export default function AuthGate() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);   // undefined = 확인 중
  const [startError, setStartError] = useState<string | null>(null);
  const [startTry, setStartTry] = useState(0);
  const [ps, setPs] = useState<PlayerState>({ kind: 'idle' });
  const [playerTry, setPlayerTry] = useState(0);
  const [invite, setInvite] = useState<string | null>(null);        // 초대 링크의 코드 (가입이 끝나면 비운다)
  const [agree, setAgree] = useState<boolean | null>(null);         // 초대한 사람의 클랜에 들어갈지 (null = 아직 안 물어봄)
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joiningRef = useRef(false);
  const userRef = useRef<AuthUser | null | undefined>(undefined);
  userRef.current = user;

  // ① 앱을 열 때: 주소의 초대 코드를 보관하고, 서버에 물어 로그인 상태를 확인한 뒤 변화를 계속 듣는다
  useEffect(() => {
    captureInviteFromUrl();
    setInvite(readInvite());

    let alive = true;
    let verified = false;
    // 처음 확인이 끝나기 전의 알림은 이 브라우저에 남은 세션을 그대로 전한 것이라 서버에서 확인한 값을 기다린다.
    // 이 안에서는 상태만 바꾼다 (supabase 를 다시 부르면 멈출 수 있다)
    const off = onAuthChange(next => {
      if (!alive || !verified) return;
      setUser(prev => (prev?.id === next?.id ? prev : next));   // 토큰이 갱신될 때마다 화면을 다시 그리지 않는다
    });
    getAuthUser().then(found => {
      if (!alive) return;
      verified = true;
      setStartError(null);
      setUser(found);
    }).catch(e => {
      if (alive) setStartError(messageOf(e));   // 인터넷 문제를 "로그아웃됨"으로 오해하지 않는다
    });
    return () => { alive = false; off(); };
  }, [startTry]);

  // ② 로그인한 계정이 정해지면 내 플레이어를 찾는다. 로그아웃하면 정리한다
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setPs({ kind: 'idle' });
      if (userRef.current === null) { forgetPlayerId(); setAgree(null); }   // 로그아웃: 내 번호를 지우고 초대 동의도 다시 묻게 한다
      return;
    }
    let alive = true;
    setPs({ kind: 'loading' });
    getMyPlayer(userId).then(player => {
      if (!alive) return;
      if (!player) { setPs({ kind: 'none' }); return; }
      const pet = petForPlayer(player);
      rememberPlayerId(player.id);
      clearInvite();   // 이미 가입한 계정이면 초대 코드는 쓸 곳이 없다
      setPs({ kind: 'ready', player, pet });
    }).catch(e => {
      if (alive) setPs({ kind: 'error', message: messageOf(e) });
    });
    return () => { alive = false; };
  }, [userId, playerTry]);   // 계정 id 가 바뀔 때만 다시 읽는다 (토큰 갱신으로는 다시 읽지 않는다)

  // ③ 펫을 만들면 가입한다: 클랜(초대 동의 반영) → players → 시작 캐시 → 초대한 사람과 친구
  const onPetCreated = useCallback(async (pet: Pet) => {
    const me = userRef.current;
    if (!me || joiningRef.current) return;
    joiningRef.current = true;
    setJoining(true);
    setJoinError(null);
    try {
      const player = await joinClan(me.id, pet.name, invite, agree === true);
      if (userRef.current?.id !== me.id) return;   // 기다리는 사이 로그아웃했으면 화면을 건드리지 않는다
      const mine: Pet = { ...pet, userId: String(player.id) };   // 이 브라우저의 펫이 누구 것인지 표시 (players.id)
      savePet(mine);
      rememberPlayerId(player.id);
      clearInvite();
      setInvite(null);
      setPs({ kind: 'ready', player, pet: mine });
    } catch (e) {
      setJoinError(messageOf(e));
    } finally {
      joiningRef.current = false;
      setJoining(false);
    }
  }, [invite, agree]);

  const logout = useCallback(async () => {
    await signOut();
    forgetPlayerId();
    setUser(null);
  }, []);

  const account = useMemo(
    () => (user && ps.kind === 'ready' ? { user, player: ps.player, logout } : null),
    [user, ps, logout],
  );

  if (user === undefined) {
    return startError ? <GateNotice message={startError} onRetry={() => { setStartError(null); setStartTry(n => n + 1); }} /> : <GateSplash />;
  }
  if (user === null) return <AuthScreen onAuthed={setUser} />;

  if (ps.kind === 'idle' || ps.kind === 'loading') return <GateSplash />;
  if (ps.kind === 'error') return <GateNotice message={ps.message} onRetry={() => setPlayerTry(n => n + 1)} />;
  if (ps.kind === 'none') {
    if (invite && agree === null) {
      return <InviteConsent inviteCode={invite} onChoose={setAgree} onInvalid={() => { clearInvite(); setInvite(null); }} />;
    }
    return <PetCreation onPetCreated={onPetCreated} busy={joining} error={joinError} />;
  }
  return (
    <AccountProvider value={account}>
      <GameScreen key={ps.player.id} pet={ps.pet} />
    </AccountProvider>
  );
}
