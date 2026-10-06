// 전쟁모드 예시(DEMO) 데이터: 아직 진짜 플레이어가 없어서 상대 팀과 아군의 레벨·아이템을 여기서 만들어 쓴다.
// 순수 TypeScript (React 없음). 난수도 쓰지 않아서 같은 입력이면 늘 같은 팀이 나온다.
// TODO: players/battle_logs 진짜 플레이어가 생기면 상대·아군은 players(레벨은 care_logs 수)에서 읽고, 이 파일은 지운다
// TODO: DB 상대가 가진 아이템 목록은 cash_logs 의 item 으로 계산 (plan.md). 약탈 기록을 남길 테이블은 아직 없다

import { CharConfig, DEFAULT_CFG } from '../character/charConfig';
import { Item, ITEM, SHOP, WAR_SHOP } from '../shop/catalog';
import { BattleKind, buildFighter, Fighter } from '../../lib/war';

// 화면에 보이는 사람 한 명 (친구 목록의 예시 친구도 이 모양을 그대로 쓸 수 있다)
export interface WarMember {
  id: string;
  name: string;
  level: number;
  cfg: CharConfig;
}

// 전투에 나가는 예시 상대: 레벨 + 가진 아이템 + 그중 장착(보호)되는 것
export interface DemoFoe extends WarMember {
  inventory: string[];        // 가진 아이템 이름 (카탈로그에 있는 이름만)
  protectedNames: string[];   // 장착 중이라 뺏을 수 없는 것 (가장 센 무기·갑옷)
  fighter: Fighter;           // 전투원 (장비 효과 반영, 체력은 가득)
}

// ── 장비·옷·가구 후보 (카탈로그의 일반 등급을 약한 것부터 센 것 순으로) ──
const catItems = (items: Item[], key: 'atk' | 'def' | 'price') => items.filter(it => it.g === 'n').sort((a, b) => a[key] - b[key] || a.price - b.price);
const WEAPONS = catItems(WAR_SHOP.find(c => c.key === 'weapon')!.items, 'atk');
const ARMORS = catItems(WAR_SHOP.find(c => c.key === 'armor')!.items, 'def');
const CLOTHES = catItems(SHOP.find(c => c.key === 'clothes')!.items, 'price');
const DECOS = catItems(SHOP.find(c => c.key === 'deco')!.items, 'price');

// 레벨이 오를수록 조금 더 좋은 일반 장비를 낀다. 초반에는 장비가 없어서 장비 없이 시작해도 해볼 만하다.
// back 만큼 약한 것은 예비로 들고 있다 (뺏길 수 있다)
const GEAR_START_LEVEL = 3;   // 이 레벨부터 장비를 낀다
const DEMO_GEAR_STEP = 1;     // 레벨이 1 오를 때마다 후보 목록에서 이만큼 센 것
function tier(list: Item[], level: number, back = 0): Item | undefined {
  const i = Math.round((level - GEAR_START_LEVEL) * DEMO_GEAR_STEP) - back;
  return i < 0 ? undefined : list[Math.min(list.length - 1, i)];
}

// 이름 목록에서 가장 센 무기·갑옷 이름 (상점 쪽 장착 규칙과 같다: 전투력·방어력이 가장 높은 것, 같으면 먼저 가진 것)
export function equippedNames(inventory: string[]): string[] {
  const best = (cat: string, k: 'atk' | 'def') => inventory
    .map(n => ITEM[n]).filter((it): it is Item => !!it && it.cat === cat)
    .reduce<Item | null>((b, it) => (!b || it[k] > b[k] ? it : b), null);
  return [best('weapon', 'atk'), best('armor', 'def')].flatMap(it => (it ? [it.name] : []));
}

// 가진 아이템에서 장비 효과(전투력·방어력 더하기). 상점 쪽 계산처럼 무기·갑옷 두 개의 전투력과 방어력을 각각 모두 더한다
function gearBonus(inventory: string[]) {
  const gear = equippedNames(inventory).map(n => ITEM[n]);
  return { weaponAtk: gear.reduce((s, it) => s + it.atk, 0), armorDef: gear.reduce((s, it) => s + it.def, 0) };
}

// 예시 사람이 가진 아이템: 무기·갑옷 (센 것 + 예비) + 옷 2벌 + 가구 1개. salt 로 사람마다 조금씩 다르게
export function demoInventory(level: number, salt: number): string[] {
  const gear = [tier(WEAPONS, level), tier(WEAPONS, level, 4), tier(ARMORS, level), tier(ARMORS, level, 4)].flatMap(it => (it ? [it.name] : []));
  const names = [
    ...gear,
    CLOTHES[(salt * 7 + level) % CLOTHES.length].name, CLOTHES[(salt * 11 + level * 3 + 5) % CLOTHES.length].name,
    DECOS[(salt * 5 + level * 2) % DECOS.length].name,
  ];
  return [...new Set(names)];   // 낮은 레벨에서는 예비가 같은 물건이라 겹친다 → 한 번만
}

// 아군·상대 한 명을 전투원으로 (장비 반영)
export function demoFighter(m: WarMember, salt: number): { fighter: Fighter; inventory: string[] } {
  const inventory = demoInventory(m.level, salt);
  return { inventory, fighter: buildFighter(m.name, m.level, gearBonus(inventory)) };
}

// 아군: 친구 목록의 예시 친구를 이번 전투용으로 내 레벨 근처로 맞춘다.
// (예시 친구의 레벨은 고정이라, 그대로 쓰면 내 레벨이 오를수록 아군이 너무 약해져 늘 지게 된다)
export function allyForBattle(m: WarMember, myLevel: number): WarMember {
  return { ...m, level: Math.max(1, Math.round(myLevel + (m.level - 3) / 2)) };
}

// ── 상대 팀 ──
const ENEMY_POOL: { name: string; cfg: CharConfig }[] = [
  { name: '검은늑대', cfg: { species: 'bear' } },
  { name: '붉은여우', cfg: { species: 'rabbit' } },
  { name: '푸른매', cfg: { species: 'chick' } },
  { name: '회색곰', cfg: { species: 'bear' } },
  { name: '번개토끼', cfg: { species: 'rabbit' } },
  { name: '은빛양', cfg: { species: 'sheep' } },
];
export const DEMO_ENEMY_CLAN = '그림자 클랜';

// 상대 팀 3명. 레벨은 내 레벨 근처 (대표 = 내 레벨, 나머지는 −1, +1. 레벨 1 아래로는 내려가지 않는다)
// 대전이면 신청한 친구가 대표이고, 클랜전이면 상대 클랜원 3명이 나온다
export function makeEnemyTeam(kind: BattleKind, foe: WarMember | null, myLevel: number): DemoFoe[] {
  const offsets = [0, -1, 1];
  const base = kind === 'pvp' && foe
    ? [{ id: foe.id, name: foe.name, cfg: foe.cfg }, ...ENEMY_POOL.slice(0, 2).map((e, i) => ({ id: `enemy-${i + 1}`, ...e }))]
    : ENEMY_POOL.slice(2, 5).map((e, i) => ({ id: `enemy-${i}`, ...e }));
  return base.map((m, i) => {
    const level = Math.max(1, Math.round(myLevel) + offsets[i]);
    const member: WarMember = { ...m, level };
    const { fighter, inventory } = demoFighter(member, i + (kind === 'pvp' ? 0 : 3));
    return { ...member, inventory, protectedNames: equippedNames(inventory), fighter };
  });
}
