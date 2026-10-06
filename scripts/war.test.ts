// 전쟁모드 규칙(src/lib/war.ts) 검사 스크립트. 테스트 도구 없이 Node 24 만으로 돌린다.
//   실행: node scripts/war.test.ts      (하나라도 틀리면 종료 코드 1)
//   시간대 확인: TZ=America/New_York node scripts/war.test.ts  (클랜전 시각은 기기 시간대와 상관없어야 한다)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Node 에서 바로 실행하려면 .ts 확장자가 필요한데 tsc 는 이걸 오류로 본다. tsconfig 는 건드리지 않으려고 이 줄만 넘어간다
// @ts-ignore TS5097
import * as war from '../src/lib/war.ts';

type Fighter = war.Fighter;

// 규칙 함수가 몰래 Date.now / Math.random 을 쓰면 바로 터지도록 막아 둔다
Math.random = () => { throw new Error('규칙 함수 안에서 Math.random 을 썼어요'); };
Date.now = () => { throw new Error('규칙 함수 안에서 Date.now 를 썼어요'); };

const {
  WAR_RULES, maxHp, baseAtk, baseDef, buildFighter, calcDamage, seededRng, simulateBattle, hpAfterBattle,
  pvpCooldownLeft, nextClanWar, lastClanWarStartMs, battleReward, plunderCandidates, pickPlunderItem,
  hideoutUpgradeCost, clampHideoutLevel, isClanFull, clanSlotsLeft, formatRemaining,
} = war;

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// 한국 시간 → UTC 밀리초 (UTC+9)
const kst = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0) => Date.UTC(y, mo - 1, d, h - 9, mi, s, ms);

let passed = 0;
const failed: string[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed.push(name);
    console.log(`  FAIL ${name}\n       ${(e as Error).message.split('\n').join('\n       ')}`);
  }
}

const fighter = (name: string, atk: number, def: number, hp: number, level = 1): Fighter => ({ name, level, atk, def, hp, maxHp: hp });
const team = (prefix: string, level: number): Fighter[] => [1, 2, 3].map((n) => buildFighter(`${prefix}${n}`, level));

console.log(`war.ts 검사 (TZ=${process.env.TZ ?? '기기 기본값'})`);

// ── 파일 자체 ──
// 주석을 뺀 코드만 본다 (머리말 주석에는 Date.now·Math.random 을 쓰지 않는다고 적혀 있다)
const warSource = readFileSync(new URL('../src/lib/war.ts', import.meta.url), 'utf8');
const warCode = warSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

test('war.ts 는 아무것도 import 하지 않는다 (React·supabase 없음)', () => {
  assert.equal(/^\s*import\s/m.test(warCode), false);
  assert.equal(/\bfrom\s+['"]/.test(warCode), false);
  assert.equal(/\brequire\s*\(/.test(warCode), false);
});

test('war.ts 코드에는 Date.now·Math.random·new Date·Intl 이 없다', () => {
  assert.equal(/Date\.now|Math\.random|new Date|Intl\./.test(warCode), false);
});

// ── 규칙 숫자 ──
test('WAR_RULES 숫자가 팀장님 규칙과 같다', () => {
  assert.equal(WAR_RULES.pet.startLevel, 1);
  assert.equal(WAR_RULES.pet.baseHp, 150);
  assert.equal(WAR_RULES.pet.hpPerLevel, 10);
  assert.equal(WAR_RULES.pet.baseAtk, 10);
  assert.equal(WAR_RULES.pet.atkPerLevel, 2);
  assert.equal(WAR_RULES.pet.baseDef, 5);
  assert.equal(WAR_RULES.pet.defPerLevel, 2);
  assert.equal(WAR_RULES.clan.maxMembers, 20);
  assert.equal(WAR_RULES.pvp.teamSize, 3);
  assert.equal(WAR_RULES.pvp.cooldownMs, HOUR);
  assert.equal(WAR_RULES.pvp.costCash, 10);
  assert.equal(WAR_RULES.clanWar.costCash, 0);
  assert.equal(WAR_RULES.battle.maxRounds, 30);
  assert.equal(WAR_RULES.battle.damageMinRate, 0.9);
  assert.equal(WAR_RULES.battle.damageMaxRate, 1.1);
  assert.equal(WAR_RULES.clanWar.startHourKst, 20);
  assert.equal(WAR_RULES.clanWar.rosterCloseMinutesBefore, 10);
  assert.equal(WAR_RULES.plunder.itemsPerBattle, 1);
  assert.deepEqual([...WAR_RULES.hideout.upgradeCosts], [100, 300, 700, 1500]);
  assert.equal(WAR_RULES.hideout.maxLevel, 5);
});

// ── 펫 능력치 (레벨 1 이 시작) ──
test('레벨 1 능력치: 체력 150 · 공격 10 · 방어 5', () => {
  assert.equal(maxHp(1), 150);
  assert.equal(baseAtk(1), 10);
  assert.equal(baseDef(1), 5);
});

test('레벨 5 능력치: 체력 190 · 공격 18 · 방어 13', () => {
  assert.equal(maxHp(5), 190);
  assert.equal(baseAtk(5), 18);
  assert.equal(baseDef(5), 13);
});

test('레벨이 1 오를 때마다 체력 +10 · 공격 +2 · 방어 +2', () => {
  for (let lv = 1; lv < 40; lv++) {
    assert.equal(maxHp(lv + 1) - maxHp(lv), 10);
    assert.equal(baseAtk(lv + 1) - baseAtk(lv), 2);
    assert.equal(baseDef(lv + 1) - baseDef(lv), 2);
  }
  assert.equal(maxHp(10), 240);
  assert.equal(baseAtk(10), 28);
  assert.equal(baseDef(10), 23);
});

test('이상한 레벨(0·음수·소수·NaN)은 1 이상 정수로 바로잡는다', () => {
  assert.equal(maxHp(0), 150);
  assert.equal(maxHp(-3), 150);
  assert.equal(maxHp(Number.NaN), 150);
  assert.equal(baseAtk(Infinity), 10);
  assert.equal(baseDef(Number.NEGATIVE_INFINITY), 5);
  assert.equal(maxHp(2.9), 160);   // 소수는 버린다 → 레벨 2
  assert.equal(baseAtk(1.99), 10);
});

test('buildFighter: (기본 + 장비) × (1 + 물약%) 를 반올림한다', () => {
  const f = buildFighter('코코', 3, { weaponAtk: 8, armorDef: 4, atkBuffPct: 50, defBuffPct: 20 });
  // 공격 (14+8)×1.5 = 33 / 방어 (9+4)×1.2 = 15.6 → 16 / 체력 150+20
  assert.deepEqual(f, { name: '코코', level: 3, atk: 33, def: 16, hp: 170, maxHp: 170 });
  const bare = buildFighter('맨몸', 1);
  assert.deepEqual(bare, { name: '맨몸', level: 1, atk: 10, def: 5, hp: 150, maxHp: 150 });
  assert.equal(buildFighter('애정', 2, { extraAtk: 3 }).atk, 15);   // 12 + 3
  assert.equal(buildFighter('이상', 0).level, 1);
});

test('buildFighter: 지금 체력은 0~최대 체력 사이로 맞추고, 비우면 가득', () => {
  assert.equal(buildFighter('a', 5, { hp: 80 }).hp, 80);
  assert.equal(buildFighter('a', 5, { hp: 9999 }).hp, 190);
  assert.equal(buildFighter('a', 5, { hp: -5 }).hp, 0);
  assert.equal(buildFighter('a', 5, { hp: 0 }).hp, 0);
  assert.equal(buildFighter('a', 5).hp, 190);
  assert.equal(buildFighter('a', 5, { hp: Number.NaN }).hp, 190);
  assert.equal(buildFighter('a', 5, { hp: 80 }).maxHp, 190);
});

// ── 난수기 ──
test('seededRng: 같은 씨앗은 같은 순서, 값은 0 이상 1 미만', () => {
  const a = seededRng(42);
  const b = seededRng(42);
  const c = seededRng(43);
  const sa = Array.from({ length: 200 }, () => a());
  const sb = Array.from({ length: 200 }, () => b());
  const sc = Array.from({ length: 200 }, () => c());
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  assert.ok(sa.every((v) => v >= 0 && v < 1));
});

// ── 피해 계산 ──
test('calcDamage: max(1, round(공격 − 방어/2)) × 0.9~1.1, 최소 1', () => {
  assert.equal(calcDamage(30, 20, () => 0), 18);        // 기본 20 × 0.9
  assert.equal(calcDamage(30, 20, () => 0.5), 20);      // 기본 20 × 1.0
  assert.equal(calcDamage(30, 20, () => 0.999999), 22); // 기본 20 × 1.1
  assert.equal(calcDamage(1, 100, () => 0.5), 1);       // 방어가 훨씬 높아도 최소 1
  assert.equal(calcDamage(0, 0, () => 0), 1);
  assert.equal(calcDamage(Number.NaN, Number.NaN, () => 0.5), 1);
  const rng = seededRng(7);
  for (let i = 0; i < 500; i++) {
    const d = calcDamage(25, 11, rng);   // 기본 round(19.5) = 20 → 18~22
    assert.ok(d >= 18 && d <= 22, `피해 ${d}`);
  }
});

// ── 2. 대전 쿨타임·비용 ──
test('쿨타임: 대전 직후 1시간, 정확히 1시간 뒤부터 0', () => {
  const t = kst(2026, 10, 6, 12, 0, 0);
  assert.equal(pvpCooldownLeft(t, t), HOUR);
  assert.equal(pvpCooldownLeft(t, t + 30 * MIN), 30 * MIN);
  assert.equal(pvpCooldownLeft(t, t + HOUR - 1), 1);
  assert.equal(pvpCooldownLeft(t, t + HOUR), 0);
  assert.equal(pvpCooldownLeft(t, t + HOUR + 1), 0);
  assert.equal(pvpCooldownLeft(t, t + 5 * DAY), 0);
});

test('쿨타임: 대전한 적이 없으면 0, 시계가 되돌려져도 1시간을 넘지 않는다', () => {
  const t = kst(2026, 10, 6, 12, 0, 0);
  assert.equal(pvpCooldownLeft(null, t), 0);
  assert.equal(pvpCooldownLeft(undefined, t), 0);
  assert.equal(pvpCooldownLeft(Number.NaN, t), 0);
  assert.equal(pvpCooldownLeft(t, Number.NaN), 0);
  assert.equal(pvpCooldownLeft(t, t - 5 * HOUR), HOUR);
});

// ── 3. 클랜전 시간 ──
// 시간대와 상관없이 같은 값이 나와야 하는 검사 모음 (아래에서 여러 시간대로 다시 돌린다)
function checkClanWarTimes() {
  // 20:00 전이면 오늘 20:00
  const before = nextClanWar(kst(2026, 10, 6, 19, 0));
  assert.equal(before.startsAtMs, kst(2026, 10, 6, 20, 0));
  assert.equal(before.rosterClosesAtMs, kst(2026, 10, 6, 19, 50));
  assert.equal(before.msLeft, HOUR);
  assert.equal(before.isOpenNow, true);

  // 명단 마감 19:50 정각부터 isOpenNow 가 꺼진다
  assert.equal(nextClanWar(kst(2026, 10, 6, 19, 49, 59, 999)).isOpenNow, true);
  assert.equal(nextClanWar(kst(2026, 10, 6, 19, 50)).isOpenNow, false);
  const late = nextClanWar(kst(2026, 10, 6, 19, 59, 59, 999));
  assert.equal(late.isOpenNow, false);
  assert.equal(late.msLeft, 1);
  assert.equal(late.startsAtMs, kst(2026, 10, 6, 20, 0));

  // 20:00 정각이면 지금이 시작(msLeft 0), 1ms 지나면 내일 20:00
  const exact = kst(2026, 10, 6, 20, 0);
  const at = nextClanWar(exact);
  assert.equal(at.startsAtMs, exact);
  assert.equal(at.msLeft, 0);
  assert.equal(at.isOpenNow, false);   // 명단은 이미 마감
  const after = nextClanWar(exact + 1);
  assert.equal(after.startsAtMs, kst(2026, 10, 7, 20, 0));
  assert.equal(after.msLeft, DAY - 1);
  assert.equal(after.rosterClosesAtMs, kst(2026, 10, 7, 19, 50));
  assert.equal(after.isOpenNow, true);   // 내일 클랜전 명단은 다시 열린다
  const night = nextClanWar(kst(2026, 10, 6, 22, 30));
  assert.equal(night.startsAtMs, kst(2026, 10, 7, 20, 0));
  assert.equal(night.msLeft, 21 * HOUR + 30 * MIN);

  // 날짜 경계는 UTC·기기 시간이 아니라 한국 시간으로 센다
  const beforeMidnight = nextClanWar(kst(2026, 10, 6, 23, 59, 59, 999));   // UTC 14:59:59.999
  assert.equal(beforeMidnight.startsAtMs, kst(2026, 10, 7, 20, 0));
  assert.equal(beforeMidnight.msLeft, 20 * HOUR + 1);
  const midnight = nextClanWar(kst(2026, 10, 7, 0, 0));                      // UTC 15:00
  assert.equal(midnight.startsAtMs, kst(2026, 10, 7, 20, 0));
  assert.equal(midnight.msLeft, 20 * HOUR);
  assert.equal(nextClanWar(kst(2026, 10, 7, 3, 0)).startsAtMs, kst(2026, 10, 7, 20, 0));

  // 해가 바뀌어도, 윤년 2월 말에도 맞다
  assert.equal(nextClanWar(kst(2026, 12, 31, 21, 0)).startsAtMs, kst(2027, 1, 1, 20, 0));
  assert.equal(nextClanWar(kst(2028, 2, 28, 21, 0)).startsAtMs, kst(2028, 2, 29, 20, 0));
  assert.equal(nextClanWar(kst(2028, 2, 29, 21, 0)).startsAtMs, kst(2028, 3, 1, 20, 0));
  assert.equal(nextClanWar(kst(2027, 2, 28, 21, 0)).startsAtMs, kst(2027, 3, 1, 20, 0));

  // 다른 나라의 서머타임이 바뀌는 날 앞뒤로 훑어도 시작 시각은 늘 UTC 11:00(= 한국 20:00)이고 24시간을 넘지 않는다
  for (const [y, mo, d] of [[2026, 3, 7], [2026, 3, 28], [2026, 10, 24], [2026, 10, 31]]) {
    for (let t = kst(y, mo, d); t < kst(y, mo, d + 3); t += 37 * MIN) {
      const w = nextClanWar(t);
      const s = new Date(w.startsAtMs);
      assert.equal(s.getUTCHours(), 11, `시작 시각이 UTC 11시가 아니에요 (now=${new Date(t).toISOString()})`);
      assert.equal(s.getUTCMinutes(), 0);
      assert.equal(s.getUTCSeconds(), 0);
      assert.ok(w.msLeft >= 0 && w.msLeft <= DAY, `msLeft ${w.msLeft}`);
      assert.equal(w.msLeft, w.startsAtMs - t);
      assert.equal(w.rosterClosesAtMs, w.startsAtMs - 10 * MIN);
      assert.equal(w.isOpenNow, t < w.rosterClosesAtMs);
      assert.equal(lastClanWarStartMs(t) <= t && t - lastClanWarStartMs(t) < DAY, true);
    }
  }
}

test('클랜전: 20:00 전·마감 19:50·정각·자정 경계·윤년 (이 기기 시간대)', checkClanWarTimes);

test('클랜전: 기기 시간대가 달라도 결과가 같다 (서울·뉴욕·UTC·런던·로스앤젤레스·오클랜드·키리바시)', () => {
  const original = process.env.TZ;
  // 아래 시간대로 실제로 바뀌었는지 먼저 확인한다 (안 바뀌면 이 검사는 아무것도 증명하지 못한다)
  // 기준일 2026-10-06 12:00 UTC 의 getTimezoneOffset (분, UTC − 현지)
  const zones: [string, number][] = [
    ['Asia/Seoul', -540],
    ['America/New_York', 240],     // 뉴욕은 이때 서머타임(EDT)
    ['UTC', 0],
    ['Europe/London', -60],        // 런던도 서머타임(BST)
    ['America/Los_Angeles', 420],
    ['Pacific/Auckland', -780],    // 오클랜드는 이때 서머타임(NZDT)
    ['Pacific/Kiritimati', -840],  // UTC+14: 한국과 날짜가 가장 크게 어긋나는 곳
  ];
  try {
    for (const [tz, offset] of zones) {
      process.env.TZ = tz;
      assert.equal(new Date(Date.UTC(2026, 9, 6, 12)).getTimezoneOffset(), offset, `${tz} 로 바뀌지 않았어요`);
      checkClanWarTimes();
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('lastClanWarStartMs: 지금까지 가장 최근에 시작한 클랜전', () => {
  assert.equal(lastClanWarStartMs(kst(2026, 10, 6, 19, 59, 59, 999)), kst(2026, 10, 5, 20, 0));
  assert.equal(lastClanWarStartMs(kst(2026, 10, 6, 20, 0)), kst(2026, 10, 6, 20, 0));
  assert.equal(lastClanWarStartMs(kst(2026, 10, 6, 23, 0)), kst(2026, 10, 6, 20, 0));
  assert.equal(lastClanWarStartMs(kst(2026, 10, 7, 1, 0)), kst(2026, 10, 6, 20, 0));
});

test('클랜전: 시각이 NaN 이면 조용히 틀린 값을 주지 않고 오류를 낸다', () => {
  assert.throws(() => nextClanWar(Number.NaN), RangeError);
  assert.throws(() => lastClanWarStartMs(Infinity), RangeError);
});

// ── 4. 전투 보상 ──
test('보상: 클랜전 이기면 골드 +100·경험치 +30, 지면 평판 -5 (골드 변화 없음)', () => {
  assert.deepEqual(battleReward('clanwar', true), { gold: 100, exp: 30, reputation: 0 });
  assert.deepEqual(battleReward('clanwar', false), { gold: 0, exp: 0, reputation: -5 });
});

test('보상: 대전 이기면 경험치 +10 (골드 없음), 지면 아무것도 없음', () => {
  assert.deepEqual(battleReward('pvp', true), { gold: 0, exp: 10, reputation: 0 });
  assert.deepEqual(battleReward('pvp', false), { gold: 0, exp: 0, reputation: 0 });
});

test('보상: 받은 객체를 고쳐도 다음 값이 바뀌지 않는다', () => {
  const r = battleReward('clanwar', true);
  r.gold = 99999;
  assert.equal(battleReward('clanwar', true).gold, 100);
  assert.equal(WAR_RULES.reward.clanWar.win.gold, 100);
});

// ── 5. 약탈 ──
test('약탈: 보호된(장착 중) 아이템은 절대 뽑히지 않는다', () => {
  const owned = ['빨간 슬리퍼', '나무 검', '가죽 갑옷', '쿠션', '화분'];
  const guard = ['나무 검', '가죽 갑옷'];
  const rng = seededRng(2026);
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const pick = pickPlunderItem(owned, guard, rng);
    assert.notEqual(pick, null);
    assert.ok(!guard.includes(pick as string), `보호된 ${pick} 를 뽑았어요`);
    assert.ok(owned.includes(pick as string));
    seen.add(pick as string);
  }
  assert.deepEqual([...seen].sort(), ['빨간 슬리퍼', '쿠션', '화분'].sort());   // 뺏길 수 있는 건 전부 나올 수 있다
});

test('약탈: 뺏을 게 없으면 null', () => {
  const rng = () => 0;
  assert.equal(pickPlunderItem([], [], rng), null);
  assert.equal(pickPlunderItem([], ['나무 검'], rng), null);
  assert.equal(pickPlunderItem(['나무 검'], ['나무 검'], rng), null);
  assert.equal(pickPlunderItem(['나무 검', '가죽 갑옷'], ['가죽 갑옷', '나무 검'], rng), null);
});

test('약탈: rng 값으로 고르는 칸이 정해진다 (처음·끝·범위를 벗어난 1.0·NaN)', () => {
  const owned = ['가', '나', '다', '라'];
  assert.equal(pickPlunderItem(owned, ['나'], () => 0), '가');
  assert.equal(pickPlunderItem(owned, ['나'], () => 0.5), '다');
  assert.equal(pickPlunderItem(owned, ['나'], () => 0.999999), '라');
  assert.equal(pickPlunderItem(owned, ['나'], () => 1), '라');   // 약속을 어긴 rng 여도 범위 밖으로 안 나간다
  assert.equal(pickPlunderItem(owned, ['나'], () => Number.NaN), '가');
});

test('약탈: 같은 이름이 겹쳐도 한 번만 세고, 입력은 바꾸지 않는다', () => {
  const owned = ['가', '가', '나'];
  const guard = ['나'];
  assert.deepEqual(plunderCandidates(owned, guard), ['가']);
  assert.equal(pickPlunderItem(owned, guard, () => 0.7), '가');
  assert.deepEqual(owned, ['가', '가', '나']);
  assert.deepEqual(guard, ['나']);
});

// ── 6. 클랜 아지트 ──
test('아지트: 올리는 비용 100/300/700/1500, Lv5 는 null', () => {
  assert.equal(hideoutUpgradeCost(1), 100);
  assert.equal(hideoutUpgradeCost(2), 300);
  assert.equal(hideoutUpgradeCost(3), 700);
  assert.equal(hideoutUpgradeCost(4), 1500);
  assert.equal(hideoutUpgradeCost(5), null);
  assert.equal(hideoutUpgradeCost(6), null);
});

test('아지트: 잘못된 레벨은 null, 저장값은 1~5 로 바로잡는다', () => {
  assert.equal(hideoutUpgradeCost(0), null);
  assert.equal(hideoutUpgradeCost(-1), null);
  assert.equal(hideoutUpgradeCost(1.5), null);
  assert.equal(hideoutUpgradeCost(Number.NaN), null);
  assert.equal(clampHideoutLevel(0), 1);
  assert.equal(clampHideoutLevel(3), 3);
  assert.equal(clampHideoutLevel(3.9), 3);
  assert.equal(clampHideoutLevel(99), 5);
  assert.equal(clampHideoutLevel(Number.NaN), 1);
});

// ── 1. 클랜 인원 ──
test('클랜 인원: 20명이면 가득 참', () => {
  assert.equal(isClanFull(0), false);
  assert.equal(isClanFull(19), false);
  assert.equal(isClanFull(20), true);
  assert.equal(isClanFull(21), true);
  assert.equal(clanSlotsLeft(0), 20);
  assert.equal(clanSlotsLeft(15), 5);
  assert.equal(clanSlotsLeft(20), 0);
  assert.equal(clanSlotsLeft(25), 0);
});

// ── 남은 시간 글자 ──
test('formatRemaining: 12분 3초 / 1시간 2분 / 1시간 / 45초 / 0초', () => {
  assert.equal(formatRemaining(12 * MIN + 3 * SEC), '12분 3초');
  assert.equal(formatRemaining(HOUR + 2 * MIN), '1시간 2분');
  assert.equal(formatRemaining(HOUR + 2 * MIN + 59 * SEC), '1시간 2분');   // 1시간이 넘으면 초는 버린다
  assert.equal(formatRemaining(HOUR), '1시간');
  assert.equal(formatRemaining(20 * HOUR + 30 * MIN), '20시간 30분');
  assert.equal(formatRemaining(2 * MIN), '2분 0초');
  assert.equal(formatRemaining(59 * MIN + 59 * SEC), '59분 59초');
  assert.equal(formatRemaining(45 * SEC), '45초');
  assert.equal(formatRemaining(0), '0초');
});

test('formatRemaining: 초 단위로 올림하고, 음수·NaN 은 0초', () => {
  assert.equal(formatRemaining(1), '1초');
  assert.equal(formatRemaining(999), '1초');
  assert.equal(formatRemaining(1001), '2초');
  assert.equal(formatRemaining(-5000), '0초');
  assert.equal(formatRemaining(Number.NaN), '0초');
  // 쿨타임 직후(정확히 1시간)와 끝나기 직전
  const t = kst(2026, 10, 6, 12, 0, 0);
  assert.equal(formatRemaining(pvpCooldownLeft(t, t)), '1시간');
  assert.equal(formatRemaining(pvpCooldownLeft(t, t + HOUR - 1)), '1초');
  assert.equal(formatRemaining(pvpCooldownLeft(t, t + HOUR)), '0초');
});

// ── 7. 전투 ──
test('전투: 같은 씨앗이면 기록이 똑같고, 씨앗이 다르면 달라진다', () => {
  const a = team('A', 4);
  const b = team('B', 4);
  const r1 = simulateBattle(a, b, seededRng(123));
  const r2 = simulateBattle(a, b, seededRng(123));
  assert.deepEqual(r1, r2);
  assert.ok(r1.rounds.length > 0);
  assert.notDeepEqual(r1.rounds, simulateBattle(a, b, seededRng(124)).rounds);
});

test('전투: 씨앗 123 의 결과를 고정해 둔다 (rng 를 쓰는 순서를 바꾸면 이 값도 바뀐다)', () => {
  const r = simulateBattle(team('A', 4), team('B', 4), seededRng(123));
  assert.equal(r.winner, 'B');
  assert.equal(r.rounds.length, 99);
  assert.equal(r.roundCount, 20);
  assert.equal(r.teamAHpLeft, 0);
  assert.equal(r.teamBHpLeft, 30);
  assert.deepEqual(r.rounds[0], {
    round: 1,
    attacker: { side: 'A', index: 0, name: 'A1' },
    target: { side: 'B', index: 2, name: 'B3' },
    dmg: 10,
    targetHpAfter: 170,
  });
});

test('전투: 30라운드 안에 끝나고 기록이 앞뒤가 맞다', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const lvA = (seed % 7) + 1;
    const lvB = ((seed * 3) % 7) + 1;
    const teamA = [buildFighter('a1', lvA), buildFighter('a2', lvA + 1), buildFighter('a3', lvA + 2)];
    const teamB = [buildFighter('b1', lvB), buildFighter('b2', lvB + 1), buildFighter('b3', lvB + 2)];
    const res = simulateBattle(teamA, teamB, seededRng(seed));

    assert.ok(res.roundCount >= 1 && res.roundCount <= 30, `라운드 ${res.roundCount}`);
    assert.ok(res.rounds.every((s) => s.round >= 1 && s.round <= 30));

    // 기록을 처음부터 다시 따라가며 검사
    const hp = { A: teamA.map((f) => f.hp), B: teamB.map((f) => f.hp) };
    let lastRound = 0;
    for (const s of res.rounds) {
      assert.ok(s.round >= lastRound, '라운드 번호가 거꾸로 갔어요');
      lastRound = s.round;
      assert.notEqual(s.attacker.side, s.target.side, '같은 팀을 공격했어요');
      assert.ok(hp[s.attacker.side][s.attacker.index] > 0, '쓰러진 사람이 공격했어요');
      assert.ok(hp[s.target.side][s.target.index] > 0, '이미 쓰러진 사람을 공격했어요');
      assert.ok(s.dmg >= 1);
      assert.equal(s.targetHpAfter, Math.max(0, hp[s.target.side][s.target.index] - s.dmg));
      hp[s.target.side][s.target.index] = s.targetHpAfter;
    }
    // 마지막 상태가 survivors·finalHp·팀 체력 합과 같다
    const expected = (['A', 'B'] as const).flatMap((side) =>
      hp[side].flatMap((h, index) => (h > 0 ? [{ side, index, hp: h }] : [])),
    );
    assert.deepEqual(res.survivors.map(({ side, index, hp: h }) => ({ side, index, hp: h })), expected);
    assert.deepEqual(res.finalHp, hp);
    const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
    assert.equal(res.teamAHpLeft, sum(hp.A));
    assert.equal(res.teamBHpLeft, sum(hp.B));
    // 남은 체력이 더 많은 쪽이 이긴다 (같으면 B)
    assert.equal(res.winner, res.teamAHpLeft > res.teamBHpLeft ? 'A' : 'B');

    if (res.endedBy === 'knockout') {
      const loser = res.winner === 'A' ? 'B' : 'A';
      assert.ok(res.survivors.every((p) => p.side === res.winner), '진 팀에 생존자가 남았어요');
      assert.ok(res.survivors.length >= 1);
      assert.equal(hp[loser].every((h) => h === 0), true);
    }
  }
});

test('전투: 확연히 센 팀이 항상 이기고 전멸시킨다 (A든 B든)', () => {
  const strong = team('강', 12);
  const weak = team('약', 1);
  for (let seed = 1; seed <= 200; seed++) {
    const asA = simulateBattle(strong, weak, seededRng(seed));
    assert.equal(asA.winner, 'A');
    assert.equal(asA.endedBy, 'knockout');
    assert.equal(asA.teamBHpLeft, 0);
    assert.ok(asA.roundCount <= 30);
    const asB = simulateBattle(weak, strong, seededRng(seed));
    assert.equal(asB.winner, 'B');
    assert.equal(asB.endedBy, 'knockout');
    assert.equal(asB.teamAHpLeft, 0);
  }
});

test('전투: 비슷한 팀끼리는 양쪽 다 이길 수 있다 (한쪽이 90% 넘게 이기지 않는다)', () => {
  let aWins = 0;
  const n = 400;
  for (let seed = 1; seed <= n; seed++) {
    if (simulateBattle(team('A', 3), team('B', 3), seededRng(seed)).winner === 'A') aWins++;
  }
  assert.ok(aWins > n * 0.1 && aWins < n * 0.9, `A 승률 ${aWins / n}`);
});

test('전투: 30라운드를 다 채우면 남은 체력 합이 큰 팀이 이긴다', () => {
  // 방어가 아주 높아 피해는 늘 최소 1 → 30라운드 동안 아무도 쓰러지지 않는다
  const tank = (name: string, hp: number) => fighter(name, 0, 9999, hp);
  const rich = [tank('a1', 1000), tank('a2', 1000), tank('a3', 1000)];
  const poor = [tank('b1', 500), tank('b2', 500), tank('b3', 500)];

  const r1 = simulateBattle(rich, poor, seededRng(1));
  assert.equal(r1.endedBy, 'roundCap');
  assert.equal(r1.roundCount, 30);
  assert.equal(r1.rounds.length, 3 * 30 * 2);   // 6명이 30라운드 동안 한 번씩
  assert.equal(r1.winner, 'A');

  const r2 = simulateBattle(poor, rich, seededRng(1));
  assert.equal(r2.endedBy, 'roundCap');
  assert.equal(r2.winner, 'B');
  assert.equal(r2.survivors.length, 6);
});

test('전투: 30라운드에 남은 체력 합이 같으면 B(방어한 쪽)가 이긴다', () => {
  const tank = (name: string) => fighter(name, 0, 9999, 1000);
  for (let seed = 1; seed <= 50; seed++) {
    const r = simulateBattle([tank('a1'), tank('a2'), tank('a3')], [tank('b1'), tank('b2'), tank('b3')], seededRng(seed));
    assert.equal(r.endedBy, 'roundCap');
    assert.equal(r.teamAHpLeft, r.teamBHpLeft, '체력 합이 같아야 하는 시험이에요');
    assert.equal(r.winner, 'B');
  }
});

test('전투: 같은 라운드에 쓰러진 사람은 더 공격하지 못한다', () => {
  // A1 은 한 방에 B1 을 쓰러뜨리고, 쓰러진 B1 은 반격하지 못한다
  const a = [fighter('a1', 500, 0, 100)];
  const b = [fighter('b1', 500, 0, 100)];
  const r = simulateBattle(a, b, seededRng(9));
  assert.equal(r.winner, 'A');
  assert.equal(r.rounds.length, 1);
  assert.equal(r.roundCount, 1);
  assert.equal(r.rounds[0].attacker.name, 'a1');
  assert.equal(r.rounds[0].targetHpAfter, 0);
  assert.deepEqual(r.survivors.map((p) => [p.side, p.name, p.hp]), [['A', 'a1', 100]]);
});

test('전투: 플레이어의 현재 체력에서 시작하고, 남은 체력은 finalHp 로 알 수 있다', () => {
  const me = buildFighter('나', 5, { hp: 40 });   // 최대 190 중 40
  const foe = buildFighter('적', 1);
  const r = simulateBattle([me], [foe], seededRng(3));
  assert.ok(r.finalHp.A[0] <= 40);
  const firstHit = r.rounds.find((s) => s.target.side === 'A');
  assert.ok(firstHit, '플레이어가 한 번도 맞지 않았어요');
  assert.equal(firstHit.targetHpAfter, Math.max(0, 40 - firstHit.dmg));   // 가득(190)이 아니라 40 에서 깎인다
});

test('전투: 1대3 처럼 인원이 달라도 되고, 입력 배열은 바뀌지 않는다', () => {
  const a = [buildFighter('용사', 20)];
  const b = team('B', 1);
  const aCopy = JSON.parse(JSON.stringify(a));
  const bCopy = JSON.parse(JSON.stringify(b));
  const r = simulateBattle(a, b, seededRng(5));
  assert.ok(['A', 'B'].includes(r.winner));
  assert.deepEqual(a, aCopy);
  assert.deepEqual(b, bCopy);
});

test('전투: 처음부터 쓰러져 있으면 상대가 이기고, 둘 다 쓰러져 있으면 B', () => {
  const alive = [fighter('산', 10, 0, 100)];
  const dead = [fighter('죽', 10, 0, 0)];
  assert.equal(simulateBattle(alive, dead, seededRng(1)).winner, 'A');
  assert.equal(simulateBattle(dead, alive, seededRng(1)).winner, 'B');
  const both = simulateBattle(dead, [fighter('죽2', 10, 0, 0)], seededRng(1));
  assert.equal(both.winner, 'B');
  assert.equal(both.rounds.length, 0);
  assert.equal(both.roundCount, 0);
});

test('전투: 빈 팀이나 4명 팀은 거절한다', () => {
  const t = team('x', 1);
  assert.throws(() => simulateBattle([], t, seededRng(1)), RangeError);
  assert.throws(() => simulateBattle(t, [], seededRng(1)), RangeError);
  assert.throws(() => simulateBattle([...t, buildFighter('넷째', 1)], t, seededRng(1)), RangeError);
});

test('전투 뒤 체력: 이기든 지든 최소 1 로 맞춘다', () => {
  assert.equal(hpAfterBattle(0), 1);
  assert.equal(hpAfterBattle(-10), 1);
  assert.equal(hpAfterBattle(1), 1);
  assert.equal(hpAfterBattle(73.6), 74);
  assert.equal(hpAfterBattle(Number.NaN), 1);
});

console.log(`\n${passed}개 통과, ${failed.length}개 실패`);
if (failed.length > 0) {
  console.log(`실패: ${failed.join(' / ')}`);
  process.exit(1);
}
