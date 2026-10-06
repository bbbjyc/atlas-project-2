import type { Pet } from '@/types/pet';
import type { PlayerRow } from '@/lib/auth';
import { createPet } from '@/lib/pet';
import { normalizeFriendCode } from '@/lib/friendState';
import { DEFAULT_CFG, saveCfg } from '../character/charConfig';
import { loadPet, savePet } from '../game/storage';

// 로그인 화면 주변에서 브라우저에 잠깐 남겨 두는 값들 (모두 try/catch: 저장이 막힌 브라우저에서도 화면은 그대로 돌아가야 한다)
const INVITE_KEY = 'atlas.invite';     // 초대 링크의 코드. 가입이 끝날 때까지만 sessionStorage 에 둔다
const PLAYER_KEY = 'atlas.playerId';   // 로그인한 내 players.id (숫자). 게임 화면에 DB 를 연결하는 쪽이 읽는다

// 저장소가 막힌 브라우저를 위한 예비 보관 (새로고침하면 사라지지만 그 탭에서는 가입을 끝낼 수 있다)
let memoryInvite: string | null = null;

// 초대 코드처럼 생겼는지 확인하고 DB 에 있는 모양으로 맞춘다. 아니면 null
export function cleanInviteCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = normalizeFriendCode(raw);
  return /^[A-Z0-9]{4,32}$/.test(code) ? code : null;
}

function saveInvite(code: string): boolean {
  memoryInvite = code;
  try {
    sessionStorage.setItem(INVITE_KEY, code);
    return true;
  } catch {
    return false;
  }
}

// 가입 전까지 보관 중인 초대 코드 (없으면 null)
export function readInvite(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = cleanInviteCode(sessionStorage.getItem(INVITE_KEY));
    if (saved) return saved;
  } catch {
    // 저장소를 못 읽으면 예비 보관을 본다
  }
  return memoryInvite;
}

export function clearInvite(): void {
  memoryInvite = null;
  try {
    sessionStorage.removeItem(INVITE_KEY);
  } catch {
    // 지우지 못해도 화면은 그대로
  }
}

// 주소의 ?invite=코드 를 한 번 읽어 보관하고 주소창에서는 지운다.
// (주소창의 링크를 그대로 복사해 다른 친구에게 보내면 내 코드가 아니라 처음 초대한 사람의 코드가 퍼지기 때문)
export function captureInviteFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('invite')) return;
    const code = cleanInviteCode(url.searchParams.get('invite'));
    const stored = code ? saveInvite(code) : true;   // 코드가 이상하면 그냥 버린다
    if (!stored) return;                              // 저장소가 막혀 있으면 주소에 남겨 두어 새로고침해도 다시 읽는다
    url.searchParams.delete('invite');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // 주소를 못 읽어도 로그인은 계속된다
  }
}

// 내 players.id 를 게임 화면이 읽을 수 있게 남긴다 / 로그아웃하면 지운다
export function rememberPlayerId(id: number): void {
  try {
    localStorage.setItem(PLAYER_KEY, String(id));
  } catch {
    // 저장 안 돼도 화면은 그대로
  }
}

export function forgetPlayerId(): void {
  try {
    localStorage.removeItem(PLAYER_KEY);
  } catch {
    // 지우지 못해도 화면은 그대로
  }
}

// 이미 가입한 내 플레이어의 게임용 펫.
// 이 브라우저에 내 펫(userId 가 내 players.id)이 있으면 그대로 쓰고, 없거나 다른 계정의 펫이면
// 닉네임과 기본 캐릭터로 새로 만든다. 그래서 새 브라우저에서 로그인해도 펫 만들기 화면에 갇히지 않는다
export function petForPlayer(player: PlayerRow): Pet {
  const saved = loadPet();
  if (saved && saved.userId === String(player.id)) return saved;
  const pet = createPet(player.nickname, String(player.id));
  saveCfg(DEFAULT_CFG);
  savePet(pet);
  return pet;
}
