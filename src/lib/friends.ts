import { supabase } from "./supabase";
import { PLAYER_COLUMNS, type PlayerRow } from "./auth";
import {
  listFriendIds,
  listIncomingIds,
  listOutgoingIds,
  normalizeFriendCode,
  relationBetween,
  type FriendStatus,
  type FriendshipRow,
  type Relation,
} from "./friendState";

// 친구 요청·수락·거절·삭제 (friendships). 수정·삭제 없이 한 줄씩 추가만 하고,
// 상태는 쌍마다 가장 최근 행으로 읽는다 (계산은 friendState.ts)

export type SendFriendRequestResult = "sent" | "already_friends" | "already_requested" | "accepted";

const FRIENDSHIP_COLUMNS = "id, created_at, from_player_id, to_player_id, status";
const PAGE_SIZE = 1000; // Supabase 가 한 번에 돌려주는 최대 줄 수

// .or() 필터는 문자열이라 숫자가 아닌 값이 들어오면 위험하다. 숫자 id 만 통과시킨다
function assertPlayerId(id: number): void {
  if (!Number.isInteger(id) || id <= 0) throw new Error("플레이어 번호가 올바르지 않아요.");
}

// 나와 관련된 friendships 를 전부 읽는다 (1000줄이 넘어도 이어서 읽는다)
async function getMyRows(myId: number): Promise<FriendshipRow[]> {
  assertPlayerId(myId);
  const rows: FriendshipRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("friendships")
      .select(FRIENDSHIP_COLUMNS)
      .or(`from_player_id.eq.${myId},to_player_id.eq.${myId}`)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`친구 기록을 불러오지 못했어요: ${error.message}`);
    const page = (data ?? []) as FriendshipRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

// 두 사람 사이의 friendships (어느 쪽이 보냈든 전부)
export async function getPairRows(a: number, b: number): Promise<FriendshipRow[]> {
  assertPlayerId(a);
  assertPlayerId(b);
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_COLUMNS)
    .or(`and(from_player_id.eq.${a},to_player_id.eq.${b}),and(from_player_id.eq.${b},to_player_id.eq.${a})`)
    .order("id", { ascending: true });
  if (error) throw new Error(`친구 기록을 불러오지 못했어요: ${error.message}`);
  return (data ?? []) as FriendshipRow[];
}

// friendships 에 한 줄 추가 (created_at 은 DB 가 now() 로 넣는다). 확인 없이 넣는 낮은 단계 함수라
// 화면에서는 sendFriendRequest · respondFriendRequest · removeFriend 를 쓴다
export async function addFriendshipRow(fromId: number, toId: number, status: FriendStatus): Promise<void> {
  assertPlayerId(fromId);
  assertPlayerId(toId);
  if (fromId === toId) throw new Error("자기 자신과는 친구가 될 수 없어요.");
  const { error } = await supabase
    .from("friendships")
    .insert({ from_player_id: fromId, to_player_id: toId, status });
  if (error) throw new Error(`친구 기록을 저장하지 못했어요: ${error.message}`);
}

// 나와 other 의 지금 관계 (friends / incoming / outgoing / none)
export async function getRelation(myId: number, otherId: number): Promise<Relation> {
  return relationBetween(await getPairRows(myId, otherId), myId, otherId);
}

// players 를 id 로 읽어 Map 으로 돌려준다
async function getPlayerMap(ids: number[]): Promise<Map<number, PlayerRow>> {
  const map = new Map<number, PlayerRow>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase.from("players").select(PLAYER_COLUMNS).in("id", ids);
  if (error) throw new Error(`친구 정보를 불러오지 못했어요: ${error.message}`);
  for (const p of (data ?? []) as unknown as PlayerRow[]) map.set(p.id, p);
  return map;
}

// ids 순서대로 players 를 꺼낸다
function pickPlayers(ids: number[], map: Map<number, PlayerRow>): PlayerRow[] {
  const picked: PlayerRow[] = [];
  for (const id of ids) {
    const player = map.get(id);
    if (player) picked.push(player);
  }
  return picked;
}

// 친구 코드(= 상대의 invite_code)로 친구 요청을 보낸다.
// 상대가 이미 나에게 요청을 보냈다면 수락으로 처리한다 (accepted).
// 코드가 없거나 내 코드면 오류
export async function sendFriendRequest(myId: number, friendCode: string): Promise<SendFriendRequestResult> {
  assertPlayerId(myId);
  const code = normalizeFriendCode(friendCode);
  if (!code) throw new Error("친구 코드를 입력해 주세요.");

  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();
  if (error) throw new Error(`친구를 찾지 못했어요: ${error.message}`);
  if (!data) throw new Error("이 코드를 가진 친구를 찾지 못했어요. 코드를 다시 확인해 주세요.");

  const otherId = (data as { id: number }).id;
  if (otherId === myId) throw new Error("내 코드예요. 친구의 코드를 입력해 주세요.");

  const relation = await getRelation(myId, otherId);
  if (relation === "friends") return "already_friends";
  if (relation === "outgoing") return "already_requested";
  if (relation === "incoming") {
    await addFriendshipRow(myId, otherId, "accept");
    return "accepted";
  }
  await addFriendshipRow(myId, otherId, "request");
  return "sent";
}

// 받은 요청에 답한다: accept(수락) 또는 decline(거절) 한 줄. 지금 받은 요청이 아니면 오류
export async function respondFriendRequest(myId: number, otherId: number, accept: boolean): Promise<void> {
  const relation = await getRelation(myId, otherId);
  if (relation !== "incoming") throw new Error("이미 처리됐거나 사라진 요청이에요.");
  await addFriendshipRow(myId, otherId, accept ? "accept" : "decline");
}

// 친구를 끊는다: remove 한 줄. 지금 친구가 아니면 아무것도 하지 않는다
// (이미 끊긴 걸 또 누른 경우에도 대기 중인 요청을 건드리지 않기 위해서)
export async function removeFriend(myId: number, otherId: number): Promise<void> {
  const relation = await getRelation(myId, otherId);
  if (relation !== "friends") return;
  await addFriendshipRow(myId, otherId, "remove");
}

// 현재 친구들 (players 행). 최근에 친구가 된 사람이 앞에 온다
export async function getFriends(myId: number): Promise<PlayerRow[]> {
  const ids = listFriendIds(await getMyRows(myId), myId);
  return pickPlayers(ids, await getPlayerMap(ids));
}

// 친구 창에서 한 번에 쓰는 묶음: 친구·받은 요청·보낸 요청을 같은 시점의 기록 한 번으로 읽는다
// (getFriends 와 getFriendRequests 를 따로 부르면 그 사이에 바뀐 사람이 양쪽에 나올 수 있다)
export async function getFriendOverview(
  myId: number
): Promise<{ friends: PlayerRow[]; incoming: PlayerRow[]; outgoing: PlayerRow[] }> {
  const rows = await getMyRows(myId);
  const friendIds = listFriendIds(rows, myId);
  const incomingIds = listIncomingIds(rows, myId);
  const outgoingIds = listOutgoingIds(rows, myId);
  const map = await getPlayerMap([...friendIds, ...incomingIds, ...outgoingIds]);
  return {
    friends: pickPlayers(friendIds, map),
    incoming: pickPlayers(incomingIds, map),
    outgoing: pickPlayers(outgoingIds, map),
  };
}

// 받은 요청(incoming)과 내가 보낸 요청(outgoing). 각각 players 행 배열
export async function getFriendRequests(
  myId: number
): Promise<{ incoming: PlayerRow[]; outgoing: PlayerRow[] }> {
  const rows = await getMyRows(myId);
  const incomingIds = listIncomingIds(rows, myId);
  const outgoingIds = listOutgoingIds(rows, myId);
  const map = await getPlayerMap([...incomingIds, ...outgoingIds]);
  return { incoming: pickPlayers(incomingIds, map), outgoing: pickPlayers(outgoingIds, map) };
}
