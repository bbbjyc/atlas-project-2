// 친구 관계 계산(src/lib/friendState.ts) 테스트
// 실행: node scripts/friends.test.ts  (Node 22.18 이상, 설치할 패키지 없음)
// friendState.ts 만 불러온다. DB(supabase) 를 쓰는 friends.ts · clan.ts · auth.ts 는 여기서 다루지 않는다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// node 가 직접 실행하려면 .ts 확장자를 적어야 한다 (tsconfig 에 allowImportingTsExtensions 가 없어서 타입 검사만 이 줄을 건너뛴다)
// @ts-ignore TS5097
import * as state from "../src/lib/friendState.ts";

type FriendshipRow = state.FriendshipRow;
type FriendStatus = state.FriendStatus;

const {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  formatFriendCode,
  latestPerPair,
  listFriendIds,
  listIncomingIds,
  listOutgoingIds,
  makeInviteCode,
  normalizeFriendCode,
  pairKey,
  relationBetween,
} = state;

// ── 작은 테스트 틀 ───────────────────────────────────────────────
let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`ok   - ${name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL - ${name}`);
    console.log(e instanceof Error ? e.stack : e);
  }
}

// ── 테스트용 도구 ────────────────────────────────────────────────
// 줄을 한 줄씩 쌓는다: id 는 1부터 늘고, 시각은 id 마다 1분씩 늦어진다 (DB 가 now() 로 넣는 것과 같은 모양)
function makeLog() {
  const rows: FriendshipRow[] = [];
  const add = (from: number, to: number, status: FriendStatus): FriendshipRow => {
    const id = rows.length + 1;
    const created_at = new Date(Date.UTC(2026, 0, 1, 0, id, 0)).toISOString();
    const row: FriendshipRow = { id, created_at, from_player_id: from, to_player_id: to, status };
    rows.push(row);
    return row;
  };
  return { rows, add };
}

// 같은 입력에서 항상 같은 수열을 내는 난수 (mulberry32)
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 정해 둔 수를 차례로 돌려주는 난수
function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("준비한 난수가 모자라요");
    return values[i++];
  };
}

const A = 1;
const B = 2;
const C = 3;
const D = 4;

// ── 가장 최근 행이 이긴다 ────────────────────────────────────────
test("쌍마다 가장 최근 행만 남는다 (A→B, B→A 를 같은 쌍으로 본다)", () => {
  const { rows, add } = makeLog();
  add(A, B, "request");
  const accept = add(B, A, "accept");
  const latest = latestPerPair(rows);
  assert.equal(latest.size, 1);
  assert.equal(latest.get(pairKey(A, B)), accept);
  assert.equal(pairKey(A, B), pairKey(B, A));
});

test("뒤의 행이 반대 방향이어도 가장 최근 행이 이긴다 (양쪽 방향)", () => {
  // A→B 요청 뒤에 B→A 수락
  const one = makeLog();
  one.add(A, B, "request");
  one.add(B, A, "accept");
  assert.equal(relationBetween(one.rows, A, B), "friends");
  assert.equal(relationBetween(one.rows, B, A), "friends");

  // B→A 요청 뒤에 A→B 수락 (방향을 뒤집어도 같은 결과)
  const two = makeLog();
  two.add(B, A, "request");
  two.add(A, B, "accept");
  assert.equal(relationBetween(two.rows, A, B), "friends");
  assert.equal(relationBetween(two.rows, B, A), "friends");

  // A→B 수락 뒤에 B→A 거절이 오면 거절이 이긴다
  const three = makeLog();
  three.add(A, B, "accept");
  three.add(B, A, "decline");
  assert.equal(relationBetween(three.rows, A, B), "none");
  assert.equal(relationBetween(three.rows, B, A), "none");
});

test("배열에 들어 있는 순서와 상관없이 가장 최근 행이 이긴다", () => {
  const { rows, add } = makeLog();
  add(A, B, "request");
  add(B, A, "accept");
  add(A, B, "remove");
  add(B, A, "request");
  const expectedAtoB = relationBetween(rows, A, B);
  assert.equal(expectedAtoB, "incoming");
  assert.equal(relationBetween([...rows].reverse(), A, B), expectedAtoB);
  assert.equal(relationBetween([rows[2], rows[0], rows[3], rows[1]], A, B), expectedAtoB);
  assert.deepEqual(listIncomingIds([...rows].reverse(), A), [B]);
});

test("시각이 더 늦은 행이 이기고, 시각이 같으면 id 가 큰 행이 이긴다", () => {
  const same = "2026-01-01T00:00:00.000Z";
  const tie: FriendshipRow[] = [
    { id: 2, created_at: same, from_player_id: B, to_player_id: A, status: "accept" },
    { id: 1, created_at: same, from_player_id: A, to_player_id: B, status: "request" },
  ];
  assert.equal(relationBetween(tie, A, B), "friends"); // id 2 가 이긴다

  // 마이크로초(.123456)까지 있는 DB 시각도 읽을 수 있다
  const micro: FriendshipRow[] = [
    { id: 5, created_at: "2026-01-01T00:00:01.123456+00:00", from_player_id: A, to_player_id: B, status: "request" },
    { id: 6, created_at: "2026-01-01T00:00:02.000000+00:00", from_player_id: B, to_player_id: A, status: "decline" },
  ];
  assert.equal(relationBetween(micro, A, B), "none");

  // id 는 작아도 시각이 늦으면 그 행이 최근이다
  const lateButSmallId: FriendshipRow[] = [
    { id: 9, created_at: "2026-01-01T00:00:00.000Z", from_player_id: A, to_player_id: B, status: "request" },
    { id: 3, created_at: "2026-01-01T00:05:00.000Z", from_player_id: B, to_player_id: A, status: "accept" },
  ];
  assert.equal(relationBetween(lateButSmallId, A, B), "friends");
});

// ── 요청 → 수락 → 삭제 → 다시 요청 ───────────────────────────────
test("요청 → 수락 → 삭제 → 다시 요청 → 거절 → 다시 요청 → 수락 순환", () => {
  const { rows, add } = makeLog();
  const check = (a: string, b: string, label: string) => {
    assert.equal(relationBetween(rows, A, B), a, `${label}: A 입장`);
    assert.equal(relationBetween(rows, B, A), b, `${label}: B 입장`);
  };

  check("none", "none", "처음");

  add(A, B, "request");
  check("outgoing", "incoming", "A 가 요청");
  assert.deepEqual(listOutgoingIds(rows, A), [B]);
  assert.deepEqual(listIncomingIds(rows, B), [A]);
  assert.deepEqual(listFriendIds(rows, A), []);

  add(B, A, "accept");
  check("friends", "friends", "B 가 수락");
  assert.deepEqual(listFriendIds(rows, A), [B]);
  assert.deepEqual(listFriendIds(rows, B), [A]);
  assert.deepEqual(listOutgoingIds(rows, A), []);
  assert.deepEqual(listIncomingIds(rows, B), []);

  add(A, B, "remove"); // 친구를 끊은 쪽은 상관없다
  check("none", "none", "A 가 삭제");
  assert.deepEqual(listFriendIds(rows, A), []);
  assert.deepEqual(listFriendIds(rows, B), []);

  add(B, A, "request"); // 끊긴 뒤에는 반대쪽이 먼저 요청해도 된다
  check("incoming", "outgoing", "B 가 다시 요청");
  assert.deepEqual(listIncomingIds(rows, A), [B]);
  assert.deepEqual(listOutgoingIds(rows, B), [A]);

  add(A, B, "decline");
  check("none", "none", "A 가 거절");
  assert.deepEqual(listIncomingIds(rows, A), []);
  assert.deepEqual(listOutgoingIds(rows, B), []);

  add(A, B, "request");
  check("outgoing", "incoming", "A 가 다시 요청");

  add(B, A, "accept");
  check("friends", "friends", "B 가 수락");
  assert.equal(latestPerPair(rows).size, 1);
  assert.equal(rows.length, 7);
});

test("서로 동시에 요청한 경우: 마지막 요청 쪽이 보낸 요청이 되고, 수락하면 친구가 된다", () => {
  const { rows, add } = makeLog();
  add(A, B, "request");
  add(B, A, "request");
  assert.equal(relationBetween(rows, A, B), "incoming");
  assert.equal(relationBetween(rows, B, A), "outgoing");
  add(A, B, "accept");
  assert.equal(relationBetween(rows, A, B), "friends");
  assert.equal(relationBetween(rows, B, A), "friends");
});

// ── 관계 이름 ───────────────────────────────────────────────────
test("관계 이름: friends · incoming · outgoing · none", () => {
  const { rows, add } = makeLog();
  add(A, B, "request"); // A→B 대기
  add(C, A, "request"); // C→A 대기
  add(A, D, "request");
  add(D, A, "accept"); // A·D 친구

  assert.equal(relationBetween(rows, A, B), "outgoing");
  assert.equal(relationBetween(rows, B, A), "incoming");
  assert.equal(relationBetween(rows, A, C), "incoming");
  assert.equal(relationBetween(rows, C, A), "outgoing");
  assert.equal(relationBetween(rows, A, D), "friends");
  assert.equal(relationBetween(rows, D, A), "friends");
  assert.equal(relationBetween(rows, B, C), "none"); // 기록이 없는 사이
  assert.equal(relationBetween(rows, C, D), "none");
});

test("관계 이름: 거절·삭제는 none, 자기 자신·빈 목록도 none", () => {
  const { rows, add } = makeLog();
  add(A, B, "request");
  add(B, A, "decline");
  add(A, C, "accept");
  add(C, A, "remove");
  assert.equal(relationBetween(rows, A, B), "none");
  assert.equal(relationBetween(rows, B, A), "none");
  assert.equal(relationBetween(rows, A, C), "none");
  assert.equal(relationBetween(rows, A, A), "none");
  assert.equal(relationBetween([], A, B), "none");
  assert.equal(latestPerPair([]).size, 0);
});

test("자기 자신과의 행은 무시한다", () => {
  const { rows, add } = makeLog();
  add(A, A, "accept");
  assert.equal(latestPerPair(rows).size, 0);
  assert.deepEqual(listFriendIds(rows, A), []);
  assert.equal(relationBetween(rows, A, A), "none");
});

// ── 목록 ────────────────────────────────────────────────────────
test("목록: 친구·받은 요청·보낸 요청이 섞여 있어도 각각 나뉜다", () => {
  const { rows, add } = makeLog();
  add(A, B, "request");
  add(B, A, "accept"); // A·B 친구
  add(C, A, "request"); // 받은 요청
  add(A, D, "request"); // 보낸 요청
  add(5, 6, "accept"); // A 와 상관없는 사람들
  add(6, 7, "request");

  assert.deepEqual(listFriendIds(rows, A), [B]);
  assert.deepEqual(listIncomingIds(rows, A), [C]);
  assert.deepEqual(listOutgoingIds(rows, A), [D]);

  // 다른 사람 입장에서도 같은 사실이 거꾸로 보인다
  assert.deepEqual(listFriendIds(rows, B), [A]);
  assert.deepEqual(listOutgoingIds(rows, C), [A]);
  assert.deepEqual(listIncomingIds(rows, D), [A]);
  assert.deepEqual(listFriendIds(rows, 5), [6]);
  assert.deepEqual(listIncomingIds(rows, 7), [6]);
  assert.deepEqual(listFriendIds(rows, 99), []); // 기록이 하나도 없는 사람
});

test("목록: 한 사람이 두 번 나오지 않고, 최근에 바뀐 사람이 앞에 온다", () => {
  const { rows, add } = makeLog();
  add(A, B, "request");
  add(B, A, "accept"); // B 가 가장 먼저 친구
  add(C, A, "request");
  add(A, C, "accept"); // C 가 그다음
  add(D, A, "request");
  add(A, D, "accept"); // D 가 가장 최근
  add(B, A, "remove");
  add(A, B, "request");
  add(B, A, "accept"); // B 가 다시 가장 최근에 친구가 됨
  assert.deepEqual(listFriendIds(rows, A), [B, D, C]);
  assert.equal(new Set(listFriendIds(rows, A)).size, 3);
});

test("목록: 받은 요청이 여럿이어도 각자 한 번만, 최근 요청이 앞", () => {
  const { rows, add } = makeLog();
  add(B, A, "request");
  add(C, A, "request");
  add(D, A, "request");
  add(A, C, "decline"); // C 는 거절해서 빠짐
  add(B, A, "request"); // B 가 다시 요청 (중복 요청)
  assert.deepEqual(listIncomingIds(rows, A), [B, D]);
});

// ── 초대 코드 만들기 ────────────────────────────────────────────
test("초대 코드: 글자는 0·O·1·I 가 없는 32개이고 길이는 기본 8", () => {
  assert.equal(INVITE_CODE_ALPHABET.length, 32);
  assert.equal(new Set(INVITE_CODE_ALPHABET).size, 32);
  for (const bad of ["0", "O", "1", "I"]) assert.ok(!INVITE_CODE_ALPHABET.includes(bad), `${bad} 가 들어 있음`);
  assert.equal(INVITE_CODE_LENGTH, 8);
  assert.equal(makeInviteCode(seededRng(1)).length, 8);
  assert.equal(makeInviteCode(seededRng(1), 5).length, 5);
  assert.equal(makeInviteCode(seededRng(1), 12).length, 12);
});

test("초대 코드: 난수로 고른 글자는 정해진 글자뿐이고 32개를 모두 쓸 수 있다", () => {
  const rng = seededRng(2026);
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const code = makeInviteCode(rng);
    assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
    for (const ch of code) seen.add(ch);
  }
  assert.equal(seen.size, 32);
});

test("초대 코드: 난수 값 → 글자가 정해진 대로 바뀐다 (0 → 첫 글자, 1 에 가까움 → 마지막 글자)", () => {
  assert.equal(INVITE_CODE_ALPHABET[0], "A");
  assert.equal(INVITE_CODE_ALPHABET[31], "9");
  assert.equal(makeInviteCode(sequenceRng([0, 0.5, 0.9999999]), 3), "AS9");
  assert.equal(makeInviteCode(sequenceRng([0, 0, 0, 0]), 4), "AAAA");
  assert.equal(makeInviteCode(sequenceRng([1 / 32, 2 / 32]), 2), "BC"); // 경계값은 다음 글자
});

test("초대 코드: 같은 씨앗이면 같은 코드, 다른 씨앗이면 다른 코드", () => {
  assert.equal(makeInviteCode(seededRng(7)), makeInviteCode(seededRng(7)));
  assert.notEqual(makeInviteCode(seededRng(7)), makeInviteCode(seededRng(8)));

  const rng = seededRng(99);
  const codes = new Set<string>();
  for (let i = 0; i < 1000; i++) codes.add(makeInviteCode(rng));
  assert.equal(codes.size, 1000); // 32^8 가지 중에서 1000개를 뽑았으니 겹치지 않는다
});

test("초대 코드: 길이가 잘못됐거나 난수가 범위를 벗어나면 오류", () => {
  assert.throws(() => makeInviteCode(seededRng(1), 0), RangeError);
  assert.throws(() => makeInviteCode(seededRng(1), -3), RangeError);
  assert.throws(() => makeInviteCode(seededRng(1), 2.5), RangeError);
  assert.throws(() => makeInviteCode(() => 1), RangeError);
  assert.throws(() => makeInviteCode(() => -0.1), RangeError);
  assert.throws(() => makeInviteCode(() => NaN), RangeError);
});

// ── 입력한 코드 정리 ────────────────────────────────────────────
test("친구 코드 정리: 앞뒤 공백·소문자·공백·줄(-)을 없앤다", () => {
  assert.equal(normalizeFriendCode("ABCD2345"), "ABCD2345");
  assert.equal(normalizeFriendCode("  abcd2345  "), "ABCD2345");
  assert.equal(normalizeFriendCode("abcd-2345"), "ABCD2345");
  assert.equal(normalizeFriendCode("ab cd 23 45"), "ABCD2345");
  assert.equal(normalizeFriendCode("ab\tcd\n2345"), "ABCD2345");
  assert.equal(normalizeFriendCode(" a-b - c d--2 3  4-5 "), "ABCD2345");
  assert.equal(normalizeFriendCode("abcd–2345"), "ABCD2345"); // 긴 줄(–)
  assert.equal(normalizeFriendCode("ＡＢＣＤ－２３４５"), "ABCD2345"); // 한글 자판에서 나오는 전각
  assert.equal(normalizeFriendCode("ABCD　2345"), "ABCD2345"); // 전각 공백
  assert.equal(normalizeFriendCode(""), "");
  assert.equal(normalizeFriendCode("  - - "), "");
});

test("친구 코드 정리: 두 번 해도 같고, 만든 코드는 그대로이고, 보기 좋게 끊어도 되돌아온다", () => {
  const rng = seededRng(5);
  for (let i = 0; i < 50; i++) {
    const code = makeInviteCode(rng);
    assert.equal(normalizeFriendCode(code), code);
    assert.equal(normalizeFriendCode(normalizeFriendCode(code.toLowerCase())), code);
    assert.equal(normalizeFriendCode(formatFriendCode(code)), code);
  }
  assert.equal(formatFriendCode("ABCD2345"), "ABCD-2345");
  assert.equal(formatFriendCode("ABCDEFG"), "ABCD-EFG");
  assert.equal(formatFriendCode("ABC"), "ABC");
  assert.equal(formatFriendCode(""), "");
});

// ── friendState.ts 는 순수해야 한다 ──────────────────────────────
test("friendState.ts 는 다른 모듈·현재 시각·난수에 기대지 않는다", () => {
  const source = readFileSync(new URL("../src/lib/friendState.ts", import.meta.url), "utf8")
    .replace(/\/\/.*$/gm, ""); // 주석은 뺀다
  assert.ok(!/^\s*import\s/m.test(source), "import 가 있음");
  assert.ok(!/\bsupabase\b/.test(source), "supabase 를 씀");
  assert.ok(!/Date\.now|new Date\(|Math\.random/.test(source), "현재 시각이나 난수를 직접 읽음");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
