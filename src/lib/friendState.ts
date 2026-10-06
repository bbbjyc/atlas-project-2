// 친구 관계 계산 (순수 함수만 둔다)
// - DB·현재 시각·난수를 직접 쓰지 않는다. 필요한 값은 인자로 받는다. 그래서 node 로 바로 테스트할 수 있다 (scripts/friends.test.ts).
// - plan.md: friendships 는 요청·수락·거절·삭제를 한 줄씩 쌓기만 하므로 "두 사람 사이의 가장 최근 행"이 현재 상태다.

export type FriendStatus = "request" | "accept" | "decline" | "remove";

export type FriendshipRow = {
  id: number;
  created_at: string;
  from_player_id: number;
  to_player_id: number;
  status: FriendStatus;
};

// 나(me) 입장에서 본 상대와의 관계
// friends: 서로 친구 / incoming: 상대가 보낸 요청이 와 있음 / outgoing: 내가 보낸 요청이 대기 중 / none: 아무 관계 없음(거절·삭제 포함)
export type Relation = "friends" | "incoming" | "outgoing" | "none";

// 두 사람을 순서 없이 묶는 열쇠 (A→B 와 B→A 가 같은 쌍)
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

// a 가 b 보다 나중에 쌓인 행이면 true. created_at 이 더 늦은 쪽이 이기고, 같으면(밀리초 단위로 읽으므로) id 가 큰 쪽이 이긴다
function isNewer(a: FriendshipRow, b: FriendshipRow): boolean {
  const ta = Date.parse(a.created_at);
  const tb = Date.parse(b.created_at);
  if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta > tb;
  return a.id > b.id;
}

// 쌍마다 가장 최근 행만 남긴 Map (열쇠는 pairKey). 자기 자신과의 행은 무시한다
export function latestPerPair(rows: FriendshipRow[]): Map<string, FriendshipRow> {
  const latest = new Map<string, FriendshipRow>();
  for (const row of rows) {
    if (row.from_player_id === row.to_player_id) continue;
    const key = pairKey(row.from_player_id, row.to_player_id);
    const current = latest.get(key);
    if (!current || isNewer(row, current)) latest.set(key, row);
  }
  return latest;
}

// 가장 최근 행 하나를 me 입장의 관계로 바꾼다
function relationOf(row: FriendshipRow, me: number): Relation {
  if (row.status === "accept") return "friends";
  if (row.status === "request") return row.from_player_id === me ? "outgoing" : "incoming";
  return "none"; // decline · remove
}

// me 와 other 의 관계. rows 에는 다른 사람의 행이 섞여 있어도 된다
export function relationBetween(rows: FriendshipRow[], me: number, other: number): Relation {
  if (me === other) return "none";
  let latest: FriendshipRow | undefined;
  for (const row of rows) {
    const samePair =
      (row.from_player_id === me && row.to_player_id === other) ||
      (row.from_player_id === other && row.to_player_id === me);
    if (samePair && (!latest || isNewer(row, latest))) latest = row;
  }
  return latest ? relationOf(latest, me) : "none";
}

// 관계가 want 인 상대의 id 목록. 최근에 바뀐 사람이 앞에 온다
function listIds(rows: FriendshipRow[], me: number, want: Relation): number[] {
  const hits: { other: number; row: FriendshipRow }[] = [];
  for (const row of latestPerPair(rows).values()) {
    if (row.from_player_id !== me && row.to_player_id !== me) continue;
    if (relationOf(row, me) !== want) continue;
    hits.push({ other: row.from_player_id === me ? row.to_player_id : row.from_player_id, row });
  }
  hits.sort((x, y) => (isNewer(x.row, y.row) ? -1 : isNewer(y.row, x.row) ? 1 : 0));
  return hits.map((h) => h.other);
}

// 현재 친구들의 id
export function listFriendIds(rows: FriendshipRow[], me: number): number[] {
  return listIds(rows, me, "friends");
}

// 나에게 요청을 보낸 사람들의 id (받은 요청)
export function listIncomingIds(rows: FriendshipRow[], me: number): number[] {
  return listIds(rows, me, "incoming");
}

// 내가 요청을 보내고 답을 기다리는 사람들의 id (보낸 요청)
export function listOutgoingIds(rows: FriendshipRow[], me: number): number[] {
  return listIds(rows, me, "outgoing");
}

// 헷갈리는 글자(0·O·1·I)를 뺀 대문자·숫자 32개 (한 글자에 5비트라 난수를 치우침 없이 고를 수 있다)
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

// 친구 코드 = 초대 코드(players.invite_code) 만들기. rng 는 0 이상 1 미만의 수를 돌려주는 함수 (Math.random 같은 것)
export function makeInviteCode(rng: () => number, length: number = INVITE_CODE_LENGTH): string {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError("코드 길이는 1 이상의 정수여야 해요.");
  }
  let code = "";
  for (let i = 0; i < length; i++) {
    const r = rng();
    if (!(r >= 0 && r < 1)) throw new RangeError("난수는 0 이상 1 미만이어야 해요.");
    code += INVITE_CODE_ALPHABET[Math.floor(r * INVITE_CODE_ALPHABET.length)];
  }
  return code;
}

// 사람이 입력한 친구 코드를 DB 에 있는 모양으로 맞춘다: 전각 → 반각, 대문자, 공백·줄(-) 제거
export function normalizeFriendCode(input: string): string {
  return input
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s‐-―−-]+/g, "");
}

// 화면에 보여 줄 때 읽기 쉽게 4글자씩 끊는다 (ABCD-EFGH). normalizeFriendCode 로 되돌릴 수 있다
export function formatFriendCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}
