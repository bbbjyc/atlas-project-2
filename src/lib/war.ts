// 전쟁모드 규칙 모음 (팀장님이 정한 값 + [제안] 표시는 AI가 채운 기본값)
// - 순수 TypeScript: React·supabase를 가져오지 않고, Date.now()·Math.random()도 쓰지 않는다.
//   시각(nowMs)과 난수(rng)는 항상 바깥에서 넘겨받으므로 테스트로 같은 결과를 다시 만들 수 있다.
// - 이 파일의 값은 아직 DB에 없다. 필요한 테이블이 생기기 전까지 화면은 브라우저(localStorage)에만 저장한다.
//   TODO: DB 클랜 골드·평판·아지트 레벨 → clans 에 열이 필요하거나 별도 로그 테이블이 필요 (plan.md 수정은 팀장님만)
//   TODO: DB 약탈한 아이템 → 지금 plan.md 에는 아이템을 뺏는 기록이 없음 (cash_logs 로는 표현 불가)
//   TODO: DB 3대3 명단 → 대전 신청 명단을 담을 테이블이 필요 (battle_logs 는 1대1 한 줄)
//   TODO: players/battle_logs 상대와 아군은 지금 DEMO 데이터. 진짜 플레이어가 생기면 players·battle_logs 로 바꾼다

// ───────────────────────── 규칙 숫자 ─────────────────────────

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// 한국 표준시(Asia/Seoul)는 UTC+9 이고 서머타임이 없다. Intl 시간대 기능에 기대지 않고 더하기로 계산한다
// (그래서 브라우저가 어느 나라 시간대여도 같은 결과가 나온다)
const KST_OFFSET_MS = 9 * HOUR;

export const WAR_RULES = {
  // ── 펫 능력치 (레벨 기준). 레벨 1 이 시작 레벨이라 레벨 1 값이 기본값이고, 1 을 넘는 레벨마다 늘어난다 ──
  pet: {
    startLevel: 1,      // 시작 레벨 (펫은 레벨 1 에서 시작)
    baseHp: 150,        // 레벨 1 체력
    hpPerLevel: 10,     // 레벨이 1 오를 때마다 체력 +10
    baseAtk: 10,        // 레벨 1 공격력
    atkPerLevel: 2,     // 레벨이 1 오를 때마다 공격력 +2
    baseDef: 5,         // 레벨 1 방어력
    defPerLevel: 2,     // 레벨이 1 오를 때마다 방어력 +2
  },

  // ── 1. 클랜 인원 · 대전 인원 ──
  clan: {
    maxMembers: 20,     // 클랜 최대 인원 20명
  },
  pvp: {
    teamSize: 3,        // 3대3 (한 팀 최대 3명)
    cooldownMs: HOUR,   // 2. 대전 쿨타임: 대전 후 1시간 [제안]
    costCash: 10,       // 2. 대전을 시작할 때 드는 캐시 10 (밥주기와 같은 값) [제안]
  },

  // ── 7. 전투 계산 [제안] ──
  battle: {
    maxRounds: 30,      // 최대 30라운드 (살아 있는 모두가 한 번씩 공격하면 1라운드)
    damageMinRate: 0.9, // 피해 흔들림 최소 (0.9배)
    damageMaxRate: 1.1, // 피해 흔들림 최대 (1.1배)
  },

  // ── 3. 클랜전 시간 ──
  clanWar: {
    startHourKst: 20,             // 매일 오후 8시(한국 시간)에 클랜전
    rosterCloseMinutesBefore: 10, // 명단 마감은 시작 10분 전(19:50) [제안]
    costCash: 0,                  // 2. 클랜전은 무료
  },

  // ── 4. 전투 보상 ──
  reward: {
    pvp: {
      win: { gold: 0, exp: 10, reputation: 0 },    // 대전 승리: 개인 경험치 +10 [제안], 골드는 없음
      lose: { gold: 0, exp: 0, reputation: 0 },    // 대전 패배: 잃는 건 약탈(5번)뿐
    },
    clanWar: {
      win: { gold: 100, exp: 30, reputation: 0 },  // 클랜전 승리: 클랜 골드 +100, 개인 경험치 +30 [제안]
      lose: { gold: 0, exp: 0, reputation: -5 },   // 클랜전 패배: 평판 -5, 클랜 골드 변화 없음 [제안]
    },
  },

  // ── 5. 약탈 ──
  plunder: {
    itemsPerBattle: 1,  // 이긴 쪽이 진 쪽에게서 랜덤 1개를 가져간다. 장착 중인 아이템은 보호, 뺏을 게 없으면 안 뺏는다 [제안]
  },

  // ── 6. 클랜 아지트 ──
  hideout: {
    maxLevel: 5,                         // 아지트는 Lv1~Lv5
    upgradeCosts: [100, 300, 700, 1500], // 클랜 골드: Lv1→2 100 / Lv2→3 300 / Lv3→4 700 / Lv4→5 1500 [제안]
  },
} as const;

// ───────────────────────── 공통 도우미 ─────────────────────────

// 0 이상 1 미만의 난수를 돌려주는 함수. 화면에서는 Math.random, 테스트에서는 seededRng 를 넣는다
export type Rng = () => number;

// 같은 씨앗이면 항상 같은 순서의 난수를 내는 간단한 난수기 (mulberry32). 테스트·다시보기용
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 0 이상 n 미만의 정수를 하나 고른다 (rng 가 1 이거나 이상한 값이어도 범위를 넘지 않게 막는다)
function pickIndex(rng: Rng, n: number): number {
  const r = rng();
  const x = Number.isFinite(r) ? r : 0;
  return Math.min(n - 1, Math.max(0, Math.floor(x * n)));
}

// 레벨이 소수·음수·0·NaN 으로 와도 1 이상 정수로 바로잡는다 (레벨 1 이 시작 레벨)
function cleanLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(WAR_RULES.pet.startLevel, Math.floor(level)) : WAR_RULES.pet.startLevel;
}

// ───────────────────────── 펫 능력치 ─────────────────────────

// 최대 체력 = 150 + 10 × (레벨 − 1). 레벨 1 → 150, 레벨 5 → 190
export function maxHp(level: number): number {
  const { baseHp, hpPerLevel, startLevel } = WAR_RULES.pet;
  return baseHp + (cleanLevel(level) - startLevel) * hpPerLevel;
}

// 기본 공격력 = 10 + 2 × (레벨 − 1). 레벨 1 → 10, 레벨 5 → 18 (장비·물약은 buildFighter 에서 더한다)
export function baseAtk(level: number): number {
  const { baseAtk: base, atkPerLevel, startLevel } = WAR_RULES.pet;
  return base + (cleanLevel(level) - startLevel) * atkPerLevel;
}

// 기본 방어력 = 5 + 2 × (레벨 − 1). 레벨 1 → 5, 레벨 5 → 13
export function baseDef(level: number): number {
  const { baseDef: base, defPerLevel, startLevel } = WAR_RULES.pet;
  return base + (cleanLevel(level) - startLevel) * defPerLevel;
}

// ───────────────────────── 전투원 ─────────────────────────

export interface Fighter {
  name: string;
  level: number;
  atk: number;      // 최종 공격력 (장비·물약 반영 후)
  def: number;      // 최종 방어력 (장비·물약 반영 후)
  hp: number;       // 전투를 시작할 때의 체력 (0 이하이면 처음부터 쓰러진 상태)
  maxHp: number;    // 최대 체력 (화면의 체력 바 표시용. 전투 계산에는 hp 만 쓴다)
}

export interface BuildFighterOptions {
  weaponAtk?: number;    // 장착한 무기의 전투력
  armorDef?: number;     // 장착한 갑옷의 방어력
  extraAtk?: number;     // 그 밖에 더하는 공격력 (예: 애정 점수). 기존 화면의 baseLove 자리
  atkBuffPct?: number;   // 공격 물약 효과(%)
  defBuffPct?: number;   // 방어 물약 효과(%)
  hp?: number;           // 지금 체력 (비우면 최대 체력으로 가득)
}

// 레벨·장비·물약으로 전투원을 만든다.
// 기존 화면(useGameState)과 같은 방식: (기본 능력치 + 장비) × (1 + 물약 %), 반올림
export function buildFighter(name: string, level: number, opts: BuildFighterOptions = {}): Fighter {
  const lv = cleanLevel(level);
  const { weaponAtk = 0, armorDef = 0, extraAtk = 0, atkBuffPct = 0, defBuffPct = 0 } = opts;
  const full = maxHp(lv);
  const hp = opts.hp === undefined || !Number.isFinite(opts.hp) ? full : Math.min(full, Math.max(0, Math.round(opts.hp)));
  return {
    name,
    level: lv,
    atk: Math.round((baseAtk(lv) + extraAtk + weaponAtk) * (1 + atkBuffPct / 100)),
    def: Math.round((baseDef(lv) + armorDef) * (1 + defBuffPct / 100)),
    hp,
    maxHp: full,
  };
}

// ───────────────────────── 7. 전투 시뮬레이션 ─────────────────────────

export type Side = 'A' | 'B';

// 전투 기록에서 누구인지 가리키는 값 (이름이 같은 전투원이 있어도 side + index 로 구분한다)
export interface FighterRef {
  side: Side;
  index: number;   // 그 팀 명단에서의 순서 (0부터)
  name: string;
}

// 공격 한 번
export interface BattleStep {
  round: number;          // 몇 라운드의 공격인지 (1부터)
  attacker: FighterRef;
  target: FighterRef;
  dmg: number;            // 준 피해 (최소 1)
  targetHpAfter: number;  // 맞은 뒤 체력 (0 이상)
}

export interface Survivor extends FighterRef {
  hp: number;             // 전투가 끝났을 때 남은 체력
}

export interface BattleResult {
  winner: Side;
  rounds: BattleStep[];          // 공격 기록 (순서대로). 한 라운드에 여러 번의 공격이 들어 있다
  roundCount: number;            // 전투가 끝난 라운드 번호 (처음부터 승부가 나 있으면 0)
  survivors: Survivor[];         // 끝났을 때 살아 있는 전투원 (A팀 → B팀 순)
  teamAHpLeft: number;           // A팀 남은 체력 합
  teamBHpLeft: number;           // B팀 남은 체력 합
  finalHp: Record<Side, number[]>;  // 팀별 전투원의 남은 체력 (명단 순서대로, 쓰러졌으면 0)
  endedBy: 'knockout' | 'roundCap';  // 한 팀이 전멸했나 / 30라운드를 다 채웠나
}

// 피해 한 번 계산: max(1, 반올림(공격력 − 방어력÷2)) 에 0.9~1.1배 흔들림을 곱한다 (최소 1)
// rng 는 한 번만 쓴다
export function calcDamage(atk: number, def: number, rng: Rng): number {
  const { damageMinRate, damageMaxRate } = WAR_RULES.battle;
  const a = Number.isFinite(atk) ? atk : 0;
  const d = Number.isFinite(def) ? def : 0;
  const base = Math.max(1, Math.round(a - d / 2));
  const r = rng();
  const rate = damageMinRate + (damageMaxRate - damageMinRate) * (Number.isFinite(r) ? r : 0);
  return Math.max(1, Math.round(base * rate));
}

// 3대3 자동 전투. teamA 가 신청한 쪽(플레이어 팀), teamB 가 받은 쪽(방어한 쪽)이다.
// - 한 라운드: A1 → B1 → A2 → B2 → A3 → B3 순서로, 살아 있는 사람이 살아 있는 상대 한 명을 무작위로 공격한다.
//   (같은 라운드에 먼저 쓰러진 사람은 공격하지 못한다)
// - 최대 30라운드. 한 팀이 전멸하면 바로 끝나고, 30라운드를 채우면 남은 체력 합이 큰 팀이 이긴다.
//   (전멸한 팀의 체력은 0 이라 어느 경우든 "남은 체력이 많은 팀이 이긴다"로 같다)
// - 남은 체력 합이 같으면 B팀(방어한 쪽)이 이긴다.
// - rng 사용 순서: 공격할 때마다 (1) 표적 고르기 (2) 피해 흔들림. 같은 rng 면 결과가 똑같다.
// - 입력 배열은 바꾸지 않는다.
export function simulateBattle(teamA: Fighter[], teamB: Fighter[], rng: Rng): BattleResult {
  const { teamSize } = WAR_RULES.pvp;
  if (teamA.length < 1 || teamB.length < 1) {
    throw new RangeError('전투원이 없는 팀은 대전할 수 없어요.');
  }
  if (teamA.length > teamSize || teamB.length > teamSize) {
    throw new RangeError(`한 팀은 최대 ${teamSize}명까지예요.`);
  }

  const teams: Record<Side, Fighter[]> = { A: teamA, B: teamB };
  const startHp = (f: Fighter) => (Number.isFinite(f.hp) ? Math.max(0, f.hp) : 0);
  const hp: Record<Side, number[]> = { A: teamA.map(startHp), B: teamB.map(startHp) };
  const ref = (side: Side, index: number): FighterRef => ({ side, index, name: teams[side][index].name });
  const aliveIdx = (side: Side) => hp[side].flatMap((h, i) => (h > 0 ? [i] : []));
  const totalHp = (side: Side) => hp[side].reduce((s, h) => s + h, 0);

  // 행동 순서: A1, B1, A2, B2, ... (한쪽 팀이 짧으면 있는 사람만)
  const order: { side: Side; index: number }[] = [];
  for (let i = 0; i < Math.max(teamA.length, teamB.length); i++) {
    if (i < teamA.length) order.push({ side: 'A', index: i });
    if (i < teamB.length) order.push({ side: 'B', index: i });
  }

  const steps: BattleStep[] = [];
  let roundCount = 0;
  let knockout = aliveIdx('A').length === 0 || aliveIdx('B').length === 0;

  for (let round = 1; round <= WAR_RULES.battle.maxRounds && !knockout; round++) {
    roundCount = round;
    for (const actor of order) {
      if (hp[actor.side][actor.index] <= 0) continue;   // 쓰러진 사람은 쉰다
      const enemy: Side = actor.side === 'A' ? 'B' : 'A';
      const targets = aliveIdx(enemy);
      if (targets.length === 0) break;

      const targetIndex = targets[pickIndex(rng, targets.length)];
      const me = teams[actor.side][actor.index];
      const foe = teams[enemy][targetIndex];
      const dmg = calcDamage(me.atk, foe.def, rng);
      hp[enemy][targetIndex] = Math.max(0, hp[enemy][targetIndex] - dmg);

      steps.push({
        round,
        attacker: ref(actor.side, actor.index),
        target: ref(enemy, targetIndex),
        dmg,
        targetHpAfter: hp[enemy][targetIndex],
      });

      if (aliveIdx(enemy).length === 0) { knockout = true; break; }
    }
  }

  const teamAHpLeft = totalHp('A');
  const teamBHpLeft = totalHp('B');
  const winner: Side = teamAHpLeft > teamBHpLeft ? 'A' : 'B';   // 같으면 방어한 쪽(B)

  const survivors: Survivor[] = (['A', 'B'] as const).flatMap((side) =>
    aliveIdx(side).map((index) => ({ ...ref(side, index), hp: hp[side][index] })),
  );

  return {
    winner,
    rounds: steps,
    roundCount,
    survivors,
    teamAHpLeft,
    teamBHpLeft,
    finalHp: { A: [...hp.A], B: [...hp.B] },
    endedBy: knockout ? 'knockout' : 'roundCap',
  };
}

// 전투가 끝난 뒤 펫의 체력으로 저장할 값. 이기든 지든 쓰러진 채로 두지 않고 최소 1 로 맞춘다
export function hpAfterBattle(hpLeft: number): number {
  return Math.max(1, Number.isFinite(hpLeft) ? Math.round(hpLeft) : 1);
}

// ───────────────────────── 2. 대전 쿨타임 ─────────────────────────

// 마지막 대전 뒤 남은 쿨타임(밀리초). 0이면 지금 대전할 수 있다.
// 정확히 1시간이 지난 순간부터 0 이다. 대전한 적이 없으면(null·undefined) 0.
// 기기 시계가 되돌려져 마지막 대전이 미래로 보여도 쿨타임 전체(1시간)를 넘지 않게 막는다.
export function pvpCooldownLeft(lastBattleAtMs: number | null | undefined, nowMs: number): number {
  if (lastBattleAtMs === null || lastBattleAtMs === undefined || !Number.isFinite(lastBattleAtMs)) return 0;
  if (!Number.isFinite(nowMs)) return 0;
  const { cooldownMs } = WAR_RULES.pvp;
  return Math.min(cooldownMs, Math.max(0, lastBattleAtMs + cooldownMs - nowMs));
}

// ───────────────────────── 3. 클랜전 시간 ─────────────────────────

export interface ClanWarTime {
  startsAtMs: number;        // 다음 클랜전 시작 시각 (20:00 한국 시간, UTC 밀리초)
  rosterClosesAtMs: number;  // 그 클랜전의 명단 마감 시각 (시작 10분 전)
  msLeft: number;            // 시작까지 남은 밀리초 (정각이면 0)
  isOpenNow: boolean;        // 지금 명단을 낼 수 있는가 (마감 시각 전이면 true)
}

// 지금 이전(같은 순간 포함)에 가장 최근 시작한 클랜전 시각. 앱을 늦게 열어도 놓친 클랜전이 있었는지 알 수 있다
export function lastClanWarStartMs(nowMs: number): number {
  if (!Number.isFinite(nowMs)) throw new RangeError('시각이 올바르지 않아요.');
  const kstDayStart = Math.floor((nowMs + KST_OFFSET_MS) / DAY) * DAY - KST_OFFSET_MS;   // 오늘 한국 시간 0시
  const todayStart = kstDayStart + WAR_RULES.clanWar.startHourKst * HOUR;
  return nowMs >= todayStart ? todayStart : todayStart - DAY;
}

// 다음 클랜전(지금 이후 가장 가까운 20:00 한국 시간). 딱 20:00 정각이면 그 순간이 곧 시작이라 msLeft 는 0.
// 20:00 이 지나면 다음 날 20:00 을 가리킨다. 명단은 19:50 에 마감되고, 그 클랜전이 시작하면 다음 날 명단이 다시 열린다.
export function nextClanWar(nowMs: number): ClanWarTime {
  const last = lastClanWarStartMs(nowMs);
  const startsAtMs = last === nowMs ? last : last + DAY;
  const rosterClosesAtMs = startsAtMs - WAR_RULES.clanWar.rosterCloseMinutesBefore * MINUTE;
  return {
    startsAtMs,
    rosterClosesAtMs,
    msLeft: startsAtMs - nowMs,
    isOpenNow: nowMs < rosterClosesAtMs,
  };
}

// ───────────────────────── 4. 전투 보상 ─────────────────────────

export type BattleKind = 'pvp' | 'clanwar';

export interface BattleReward {
  gold: number;        // 클랜 골드 변화
  exp: number;         // 개인 경험치 변화
  reputation: number;  // 평판 변화
}

// 대전: 이기면 경험치 +10 (골드 없음). 클랜전: 이기면 클랜 골드 +100·경험치 +30, 지면 평판 -5 (골드 변화 없음).
// 매번 새 객체를 돌려준다.
// TODO: DB 클랜 골드·평판은 저장할 테이블이 아직 없어 브라우저에만 저장
export function battleReward(kind: BattleKind, win: boolean): BattleReward {
  const table = kind === 'clanwar' ? WAR_RULES.reward.clanWar : WAR_RULES.reward.pvp;
  return { ...(win ? table.win : table.lose) };
}

// ───────────────────────── 5. 약탈 ─────────────────────────

// 뺏길 수 있는 아이템 목록: 가진 것 중 보호(장착 중)가 아닌 것. 같은 이름은 한 번만 센다
export function plunderCandidates(owned: string[], protectedNames: string[]): string[] {
  const guard = new Set(protectedNames);
  return [...new Set(owned)].filter((name) => !guard.has(name));
}

// 뺏을 아이템 하나를 무작위로 고른다. 보호된 아이템은 절대 고르지 않고, 뺏을 게 없으면 null.
// 이긴 쪽이 진 쪽에게서 가져올 때도, 내가 졌을 때 잃을 것을 정할 때도 같은 함수를 쓴다
// TODO: DB 약탈 기록 (누가 무엇을 뺏었는지) 은 저장할 테이블이 아직 없다
export function pickPlunderItem(owned: string[], protectedNames: string[], rng: Rng): string | null {
  const list = plunderCandidates(owned, protectedNames);
  if (list.length === 0) return null;
  return list[pickIndex(rng, list.length)];
}

// ───────────────────────── 6. 클랜 아지트 ─────────────────────────

// 아지트를 다음 레벨로 올리는 데 드는 클랜 골드. 현재 레벨 기준이고, 최고 레벨(Lv5)이거나 잘못된 레벨이면 null.
// 효과는 지금은 보여주기만 한다.
// TODO: 아지트 효과 (아직 정해진 게 없음) / DB 아지트 레벨은 저장할 테이블이 아직 없어 브라우저에만 저장
export function hideoutUpgradeCost(level: number): number | null {
  if (!Number.isInteger(level) || level < 1) return null;
  return WAR_RULES.hideout.upgradeCosts[level - 1] ?? null;
}

// 저장된 아지트 레벨이 이상한 값이어도 1~5 사이 정수로 바로잡는다
export function clampHideoutLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.min(WAR_RULES.hideout.maxLevel, Math.max(1, Math.floor(level)));
}

// ───────────────────────── 1. 클랜 인원 ─────────────────────────

// 클랜이 가득 찼는가 (20명 이상)
export function isClanFull(memberCount: number): boolean {
  return memberCount >= WAR_RULES.clan.maxMembers;
}

// 클랜에 남은 자리 수 (가득 차면 0)
export function clanSlotsLeft(memberCount: number): number {
  return Math.max(0, WAR_RULES.clan.maxMembers - memberCount);
}

// ───────────────────────── 남은 시간 글자 ─────────────────────────

// 남은 시간(밀리초)을 한국어로. 초 단위로 올림하므로 0초가 되는 순간이 곧 준비 끝이다.
// 1시간 이상: '1시간 2분' (분이 0 이면 '1시간') / 1시간 미만: '12분 3초' / 1분 미만: '45초' / 0 이하: '0초'
export function formatRemaining(ms: number): string {
  const totalSec = Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / SECOND)) : 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}
