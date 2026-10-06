import { supabase } from "./supabase";
import { PLAYER_COLUMNS, getMyPlayer, type PlayerRow } from "./auth";
import { addFriendshipRow, getPairRows } from "./friends";
import { makeInviteCode, normalizeFriendCode } from "./friendState";

// 가입(초대·클랜) — plan.md 3번 "가입 순서"
// ① 계정은 이미 만들어져 있다(auth.ts signUp) → ② clans → ③ players → ④ 시작 캐시 → ⑤ 초대한 사람과 친구
// 어느 단계에서 끊겨도 같은 계정으로 다시 부르면 빠진 뒷단계만 채운다 (플레이어는 계정당 한 줄)

export const NICKNAME_MAX_LENGTH = 12; // 펫 이름 입력칸(PetCreation)의 글자 수 제한과 같게 맞춘다
export const WELCOME_CASH = 100;
const WELCOME_ITEM = "mission:welcome";
const UNIQUE_VIOLATION = "23505"; // Postgres: 이미 있는 값이라 넣을 수 없음
const MAX_CODE_TRIES = 6;

// 초대한 사람 (초대 링크의 코드로 찾는다)
export type Inviter = { id: number; nickname: string; clan_id: number };

// 초대 코드 만들 때 쓰는 난수 (브라우저·node 의 암호용 난수, 없으면 Math.random)
function randomUnit(): number {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    return c.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  }
  return Math.random();
}

// 초대 링크의 코드(?invite=코드)로 초대한 사람을 찾는다. 코드가 비었거나 없는 코드면 null (= 초대 없이 온 것으로 본다).
// 읽기에 실패하면 오류 (실패를 "초대 없음"으로 오해하면 클랜과 친구가 빠지므로)
export async function findInviter(inviteCode: string | null | undefined): Promise<Inviter | null> {
  const code = normalizeFriendCode(inviteCode ?? "");
  if (!code) return null;
  const { data, error } = await supabase
    .from("players")
    .select("id, nickname, clan_id")
    .eq("invite_code", code)
    .maybeSingle();
  if (error) throw new Error(`초대한 사람을 찾지 못했어요: ${error.message}`);
  return (data as Inviter | null) ?? null;
}

async function createClan(name: string): Promise<number> {
  const { data, error } = await supabase.from("clans").insert({ name }).select("id").single();
  if (error) throw new Error(`클랜을 만들지 못했어요: ${error.message}`);
  return (data as { id: number }).id;
}

// players 에 한 줄 추가. 초대 코드가 다른 사람과 겹치면(23505) 새 코드로 다시 시도한다
async function insertPlayer(fields: {
  nickname: string;
  invited_by_id: number | null;
  clan_id: number;
  auth_user_id: string;
}): Promise<PlayerRow> {
  for (let attempt = 0; attempt < MAX_CODE_TRIES; attempt++) {
    const { data, error } = await supabase
      .from("players")
      .insert({ ...fields, invite_code: makeInviteCode(randomUnit) })
      .select(PLAYER_COLUMNS)
      .single();
    if (!error) return data as unknown as PlayerRow;
    if (error.code !== UNIQUE_VIOLATION) throw new Error(`플레이어를 만들지 못했어요: ${error.message}`);

    // 같은 계정으로 동시에 가입해서 먼저 들어간 줄이 있으면 그 줄을 쓴다
    if (`${error.message} ${error.details ?? ""}`.includes("auth_user_id")) {
      const mine = await getMyPlayer(fields.auth_user_id);
      if (mine) return mine;
    }
    // 그 밖에는 초대 코드가 겹친 것 → 반복문이 새 코드로 다시 시도한다
  }
  throw new Error("초대 코드를 만들지 못했어요. 잠시 뒤에 다시 해 주세요.");
}

// 시작 캐시 mission:welcome +100. 이미 받았으면(23505) 그대로 넘어간다
// TODO: src/lib/cash.ts 의 addCashLog 가 숫자 playerId·오류 던지기로 바뀌면 그걸로 바꾼다 (지금 것은 문자열 id 를 받고 실패를 삼킴)
async function addWelcomeCash(playerId: number): Promise<void> {
  const { error } = await supabase
    .from("cash_logs")
    .insert({ player_id: playerId, amount: WELCOME_CASH, reason: "mission", item: WELCOME_ITEM });
  if (error && error.code !== UNIQUE_VIOLATION) {
    throw new Error(`시작 캐시를 넣지 못했어요: ${error.message}`);
  }
}

// 초대한 사람과 친구가 된다: 가입한 사람이 초대한 사람에게 accept 한 줄.
// 두 사람 사이에 기록이 이미 있으면 건드리지 않는다 (재시도에서 중복으로 넣거나, 나중에 끊은 친구를 되살리지 않도록)
async function befriendInviter(playerId: number, inviterId: number): Promise<void> {
  if ((await getPairRows(playerId, inviterId)).length > 0) return;
  await addFriendshipRow(playerId, inviterId, "accept");
}

// 가입 뒷단계(④·⑤). 몇 번을 불러도 같은 결과가 된다
async function finishJoin(player: PlayerRow): Promise<void> {
  await addWelcomeCash(player.id);
  if (player.invited_by_id != null) await befriendInviter(player.id, player.invited_by_id);
}

// 가입: 로그인한 계정(authUserId)의 플레이어를 만든다.
// - inviteCode: 초대 링크의 코드 (없거나 없는 코드면 초대 없이 온 것으로 본다)
// - agree: 초대한 사람의 클랜에 들어갈지. 동의하면 그 클랜, 거절하거나 초대가 없으면 닉네임으로 새 클랜을 만든다
// 초대로 왔다면 동의 여부와 상관없이 invited_by_id 를 남기고 초대한 사람과 친구가 된다.
// 이 계정의 플레이어가 이미 있으면 새로 만들지 않고 그 줄을 돌려주며, 빠진 시작 캐시·친구 줄만 채운다
export async function joinClan(
  authUserId: string,
  nickname: string,
  inviteCode: string | null,
  agree: boolean
): Promise<PlayerRow> {
  const name = nickname.trim();
  if (!authUserId) throw new Error("로그인한 뒤에 가입할 수 있어요.");
  if (!name) throw new Error("닉네임을 입력해 주세요.");
  if (name.length > NICKNAME_MAX_LENGTH) {
    throw new Error(`닉네임은 ${NICKNAME_MAX_LENGTH}자까지 쓸 수 있어요.`);
  }

  const existing = await getMyPlayer(authUserId);
  if (existing) {
    await finishJoin(existing);
    return existing;
  }

  const inviter = await findInviter(inviteCode);
  const clanId = agree && inviter ? inviter.clan_id : await createClan(`${name}의 클랜`);
  const player = await insertPlayer({
    nickname: name,
    invited_by_id: inviter ? inviter.id : null,
    clan_id: clanId,
    auth_user_id: authUserId,
  });
  await finishJoin(player);
  return player;
}
