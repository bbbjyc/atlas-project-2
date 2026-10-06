// 전쟁모드 화면 상태의 모양과 계산 (순수 TypeScript: React 없음. 시각은 늘 바깥에서 받는다)
// 저장은 useWar.ts 가 브라우저(localStorage 'atlas.war')에 한다. 이 값들은 아직 DB 에 둘 곳이 없다 (plan.md 는 팀장님만 고친다).

import { ClanWarTime, lastClanWarStartMs, nextClanWar } from '../../lib/war';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const WAR_KEY = 'atlas.war';

// 클랜전은 시작 뒤 30분 동안 입장할 수 있다 [제안: 구현 세부. 팀장님 규칙에는 없음]
export const CLAN_WAR_ENTRY_MS = 30 * 60 * 1000;
// 시연용 버튼을 하루에 여러 번 눌러도 되게 하려면 true (보상도 그만큼 계속 쌓인다). 기본은 규칙대로 하루 한 번
export const DEMO_CLANWAR_REPEATABLE = false;

// 한국 시간 기준 날짜 번호 (1970-01-01 부터 센 날 수). 한국은 UTC+9 이고 서머타임이 없다
export const kstDay = (ms: number) => Math.floor((ms + 9 * HOUR) / DAY);
// '10월 6일' 처럼 보여 줄 글자 (날짜 번호 → 한국 날짜)
export function kstDayLabel(day: number) {
  const d = new Date(day * DAY);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export interface WarState {
  clanGold: number;       // 클랜 골드. TODO: DB clans 에 gold 열이 없다 → 클랜 골드 로그 테이블이 필요 (plan.md 에 없음)
  reputation: number;     // 평판. TODO: DB 평판을 남길 곳이 없다 → 평판 로그 테이블이 필요 (plan.md 에 없음)
  hideoutLevel: number;   // 클랜 아지트 레벨 1~5. TODO: DB 아지트 레벨/업그레이드 기록 테이블이 필요 (plan.md 에 없음)
  lastPvpAt: number;      // 마지막 대전 시각(밀리초, 0 이면 없음). TODO: DB battle_logs.created_at 의 마지막 값으로 계산 (쿨다운은 계산하는 값, plan.md)
  clanWar: {
    lastDay: number;      // 마지막으로 클랜전을 치른 한국 날짜 번호 (0 이면 없음)
    result: '' | 'win' | 'lose';   // 그날의 결과. TODO: DB battle_logs 에 클랜전 결과를 남길 열/테이블이 필요
    rosterDay: number;    // 출전 등록을 한 클랜전의 날짜 번호. TODO: DB 3대3 명단 테이블이 필요 (battle_logs 는 1대1 한 줄)
  };
  record: {               // 전적. TODO: DB battle_logs 를 clan_id·winner_id 로 센 값 (plan.md 의 '클랜 전적')
    pvpWins: number; pvpLosses: number; clanWins: number; clanLosses: number;
  };
}

export const INIT_WAR: WarState = {
  clanGold: 0, reputation: 0, hideoutLevel: 1, lastPvpAt: 0,
  clanWar: { lastDay: 0, result: '', rosterDay: 0 },
  record: { pvpWins: 0, pvpLosses: 0, clanWins: 0, clanLosses: 0 },
};

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const count = (v: unknown) => Math.max(0, Math.floor(num(v, 0)));

// 저장돼 있던 값이 깨졌거나 예전 모양이어도 정상 값으로 바로잡는다
export function cleanWar(raw: unknown): WarState {
  const r = obj(raw), cw = obj(r.clanWar), rec = obj(r.record);
  return {
    clanGold: count(r.clanGold),
    reputation: Math.floor(num(r.reputation, 0)),   // 평판은 음수도 될 수 있다
    hideoutLevel: Math.max(1, Math.min(5, Math.floor(num(r.hideoutLevel, 1)))),
    lastPvpAt: count(r.lastPvpAt),
    clanWar: {
      lastDay: count(cw.lastDay),
      result: cw.result === 'win' || cw.result === 'lose' ? cw.result : '',
      rosterDay: count(cw.rosterDay),
    },
    record: { pvpWins: count(rec.pvpWins), pvpLosses: count(rec.pvpLosses), clanWins: count(rec.clanWins), clanLosses: count(rec.clanLosses) },
  };
}

// ── 클랜전 카드가 지금 무엇을 보여 줄지 ──
export type ClanWarAction =
  | 'enter'        // 출전 등록을 했고 입장 시간이다 → 입장 버튼
  | 'register'     // 명단 접수 중 (19:50 전) → 출전 등록 버튼
  | 'registered'   // 등록 완료, 시작을 기다리는 중
  | 'closed';      // 명단 마감(19:50) 뒤, 시작 전. 등록하지 않았다

export interface ClanWarStatus {
  action: ClanWarAction;
  next: ClanWarTime;       // 카운트다운이 가리키는 다음 클랜전 (오늘 이미 치렀으면 내일 것)
  playedToday: boolean;    // 오늘(한국 날짜) 클랜전을 이미 치렀다
  inWindow: boolean;       // 방금 시작한 클랜전의 입장 시간(시작 뒤 30분) 안인가
  entryLeftMs: number;     // 입장이 마감될 때까지 (inWindow 일 때만 의미 있음)
  missed: boolean;         // 방금 시작한 클랜전에 출전 등록을 하지 않아 못 들어간다
  demoLocked: boolean;     // 오늘은 시연용 클랜전을 이미 썼다
}

// 출전 등록·카운트다운이 가리키는 클랜전. 오늘 클랜전을 이미 치렀으면 (시연용으로 미리 했어도) 다음 날 것이다
export function upcomingClanWar(s: WarState, nowMs: number): ClanWarTime {
  const next = nextClanWar(nowMs);
  return s.clanWar.lastDay === kstDay(next.startsAtMs) ? nextClanWar(next.startsAtMs + 1) : next;
}

export function clanWarStatus(s: WarState, nowMs: number): ClanWarStatus {
  const lastStart = lastClanWarStartMs(nowMs);
  const lastDay = kstDay(lastStart);
  const inWindow = nowMs - lastStart < CLAN_WAR_ENTRY_MS;
  const pending = inWindow && s.clanWar.lastDay !== lastDay;   // 방금 시작한 클랜전을 아직 안 치렀다
  const registeredLast = s.clanWar.rosterDay === lastDay;

  const next = upcomingClanWar(s, nowMs);
  const nextDay = kstDay(next.startsAtMs);

  let action: ClanWarAction;
  if (pending && registeredLast) action = 'enter';
  else if (s.clanWar.rosterDay === nextDay) action = 'registered';
  else if (next.isOpenNow) action = 'register';
  else action = 'closed';

  return {
    action, next, inWindow,
    playedToday: s.clanWar.lastDay === kstDay(nowMs),
    entryLeftMs: Math.max(0, lastStart + CLAN_WAR_ENTRY_MS - nowMs),
    missed: pending && !registeredLast,
    demoLocked: !DEMO_CLANWAR_REPEATABLE && s.clanWar.lastDay === kstDay(nowMs),
  };
}
