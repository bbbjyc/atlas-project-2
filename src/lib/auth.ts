import {
  isAuthApiError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
} from "@supabase/supabase-js";
import { supabase } from "./supabase";

// 로그인 계정 (Supabase Auth). 비밀번호는 Supabase 가 관리하고 우리 쪽에는 두지 않는다
export type AuthUser = { id: string; email: string };

// players 한 줄 (plan.md 의 players 테이블)
export type PlayerRow = {
  id: number;
  created_at: string;
  nickname: string;
  invite_code: string;
  invited_by_id: number | null;
  clan_id: number;
  auth_user_id: string | null;
};
export const PLAYER_COLUMNS = "id, created_at, nickname, invite_code, invited_by_id, clan_id, auth_user_id";

export const MIN_PASSWORD_LENGTH = 6;

const MESSAGES = {
  network: "서버에 연결하지 못했어요. 인터넷을 확인하고 다시 시도해 주세요.",
  wrongLogin: "이메일이나 비밀번호가 맞지 않아요.",
  alreadyRegistered: "이미 가입된 이메일이에요. 로그인해 주세요.",
  weakPassword: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.`,
  invalidEmail: "이메일 주소가 올바르지 않아요.",
  needEmailAndPassword: "이메일과 비밀번호를 입력해 주세요.",
  tooMany: "시도가 너무 많아요. 잠시 뒤에 다시 해 주세요.",
  emailConfirmOn: "이메일 인증이 켜져 있어요. 팀장에게 알려 주세요",
  signupOff: "지금은 가입을 받지 않아요. 팀장에게 알려 주세요.",
};

// Supabase Auth 의 오류를 짧은 한국어 문장으로 바꾼다
function translateAuthError(e: unknown): Error {
  if (isAuthRetryableFetchError(e)) return new Error(MESSAGES.network);
  if (isAuthWeakPasswordError(e)) return new Error(MESSAGES.weakPassword);
  // fetch 자체가 실패하면(오프라인 등) 감싸지 못한 TypeError 가 올 수도 있다
  if (e instanceof TypeError) return new Error(MESSAGES.network);

  const code = (e as { code?: unknown } | null)?.code;
  const status = (e as { status?: unknown } | null)?.status;
  const message = e instanceof Error ? e.message : String(e);

  switch (code) {
    case "invalid_credentials":
      return new Error(MESSAGES.wrongLogin);
    case "user_already_exists":
    case "email_exists":
      return new Error(MESSAGES.alreadyRegistered);
    case "weak_password":
      return new Error(MESSAGES.weakPassword);
    case "email_address_invalid":
      return new Error(MESSAGES.invalidEmail);
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return new Error(MESSAGES.tooMany);
    case "email_not_confirmed":
      return new Error(MESSAGES.emailConfirmOn);
    case "signup_disabled":
    case "email_provider_disabled":
      return new Error(MESSAGES.signupOff);
  }
  if (status === 429) return new Error(MESSAGES.tooMany);
  // 옛 서버는 code 없이 메시지만 주기도 한다
  if (/invalid login credentials/i.test(message)) return new Error(MESSAGES.wrongLogin);
  if (/already registered|already been registered/i.test(message)) return new Error(MESSAGES.alreadyRegistered);
  if (/unable to validate email|invalid format/i.test(message)) return new Error(MESSAGES.invalidEmail);
  if (/failed to fetch|network|load failed/i.test(message)) return new Error(MESSAGES.network);
  return new Error(`로그인 처리 중 문제가 생겼어요. (${message})`);
}

// supabase.auth 호출 하나를 실행하고, 오류는 한국어 Error 로 던진다. 성공하면 data 를 돌려준다
async function callAuth<R extends { data: unknown; error: unknown }>(run: () => Promise<R>): Promise<R["data"]> {
  let result: R;
  try {
    result = await run();
  } catch (e) {
    throw translateAuthError(e);
  }
  if (result.error) throw translateAuthError(result.error);
  return result.data;
}

function checkEmail(email: string): string {
  const clean = email.trim();
  if (!clean) throw new Error(MESSAGES.needEmailAndPassword);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error(MESSAGES.invalidEmail);
  return clean;
}

// 이메일 + 비밀번호로 계정을 만든다. 이메일 인증을 끈 프로젝트라 성공하면 바로 로그인된 상태가 된다
export async function signUp(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = checkEmail(email);
  if (!password) throw new Error(MESSAGES.needEmailAndPassword);
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(MESSAGES.weakPassword);

  const data = await callAuth(() => supabase.auth.signUp({ email: cleanEmail, password }));
  const user = data.user;
  if (!user) throw new Error("가입하지 못했어요. 잠시 뒤에 다시 해 주세요.");
  // 이메일 인증이 켜진 프로젝트는 이미 있는 이메일에 오류 대신 identities 가 빈 가짜 사용자를 돌려준다
  if (user.identities && user.identities.length === 0) throw new Error(MESSAGES.alreadyRegistered);
  // 세션이 없으면 인증 메일을 기다리는 상태다. 계속 기다리게 두지 않고 바로 알려 준다
  if (!data.session) throw new Error(MESSAGES.emailConfirmOn);
  return { id: user.id, email: user.email ?? cleanEmail };
}

// 이메일 + 비밀번호로 로그인한다. 틀리면 오류
export async function signIn(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = checkEmail(email);
  if (!password) throw new Error(MESSAGES.needEmailAndPassword);

  const data = await callAuth(() => supabase.auth.signInWithPassword({ email: cleanEmail, password }));
  if (!data.user) throw new Error(MESSAGES.wrongLogin);
  return { id: data.user.id, email: data.user.email ?? cleanEmail };
}

// 로그아웃 (이 브라우저의 로그인 상태를 지운다). 기본값(global)은 다른 기기의 로그인까지 모두 끊어서 local 로 둔다
export async function signOut(): Promise<void> {
  let error: unknown;
  try {
    ({ error } = await supabase.auth.signOut({ scope: "local" }));
  } catch (e) {
    throw translateAuthError(e);
  }
  if (error) throw translateAuthError(error);
}

// 지금 로그인한 계정. 로그인하지 않았으면 null. 서버에 물어 확인하므로 앱을 열 때 한 번 부른다
export async function getAuthUser(): Promise<AuthUser | null> {
  let result: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try {
    result = await supabase.auth.getUser();
  } catch (e) {
    throw translateAuthError(e);
  }
  const { data, error } = result;
  if (error) {
    if (isAuthSessionMissingError(error)) return null;
    if (isAuthApiError(error) && (error.status === 401 || error.status === 403 || error.status === 404)) {
      // 로그인이 만료됐거나 계정이 지워졌다 = 로그아웃 상태. 이 브라우저에 남은 찌꺼기만 지운다
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // 지우지 못해도 로그아웃 상태로 보는 데는 문제없다
      }
      return null;
    }
    throw translateAuthError(error); // 네트워크·서버 오류는 "로그아웃"으로 오해하지 않게 던진다
  }
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

// 로그인·로그아웃이 일어날 때마다 알려 준다. 반환값을 부르면 구독이 풀린다.
// 구독하자마자 현재 상태로 한 번 불리고, 토큰이 갱신될 때도 불리므로 id 가 같으면 화면을 다시 그리지 않는 게 좋다
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  // 이 안에서 supabase 를 다시 부르면 멈출 수 있어서, 받은 세션만 보고 바로 넘긴다
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? { id: session.user.id, email: session.user.email ?? "" } : null);
  });
  return () => data.subscription.unsubscribe();
}

// auth_user_id 로 내 플레이어 한 줄을 찾는다. 아직 가입하지 않았으면 null (읽기에 실패하면 오류)
export async function getMyPlayer(authUserId: string): Promise<PlayerRow | null> {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLUMNS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new Error(`내 플레이어를 불러오지 못했어요: ${error.message}`);
  return (data as PlayerRow | null) ?? null;
}
