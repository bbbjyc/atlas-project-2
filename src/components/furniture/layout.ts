// 집 꾸미기 배치 규칙. 가구는 방의 정해진 범위 안에서만 놓고, 같은 종류는 하나씩, 전부 6개까지다
// 저장: 지금은 브라우저에만 둔다. plan.md 에서는 style_logs.furniture (가구 id 를 쉼표로 이은 값)
// TODO: 위치(x, y)는 style_logs 에 열이 없어서 지금은 브라우저에만 남는다. 팀장님과 위치 저장 방식을 정한다
import { ITEM, Item, itemArt } from '../shop/catalog';

export const MAX_FURNITURE = 6;

// 놓을 수 있는 범위 (방 전체에 대한 %). 벽 오른쪽 위와 바닥 양쪽. 왼쪽 위 스탯 칸과 캐릭터 자리는 피한다
export const ZONES = [
  { x1: 38, x2: 92, y1: 22, y2: 50 },   // 벽 (오른쪽)
  { x1: 8, x2: 30, y1: 64, y2: 80 },    // 바닥 왼쪽
  { x1: 70, x2: 92, y1: 64, y2: 80 },   // 바닥 오른쪽
];

export interface Placed { name: string; x: number; y: number }

export const inZone = (x: number, y: number) => ZONES.some(z => x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2);

// 같은 느낌의 종류 (그림 종류가 같으면 같은 것으로 본다: 달력 2개 → 하나만)
export const groupOf = (it: Item) => itemArt(it).arch;

// 놓을 수 없으면 이유를 돌려주고, 놓을 수 있으면 null
// replacing: 옮기는 중이면 그 자리의 원래 가구는 세지 않는다
export function placeError(placed: Placed[], name: string, x: number, y: number, replacing?: number): string | null {
  const it = ITEM[name];
  if (!it || it.cat !== 'deco') return '가구만 놓을 수 있어요';
  if (!inZone(x, y)) return '여기는 놓을 수 없어요. 벽이나 바닥의 밝은 곳에 놓아 주세요';
  const others = placed.filter((_, i) => i !== replacing);
  if (others.length >= MAX_FURNITURE) return `가구는 ${MAX_FURNITURE}개까지만 놓을 수 있어요`;
  const g = groupOf(it);
  if (others.some(p => ITEM[p.name] && groupOf(ITEM[p.name]) === g)) return '같은 종류의 가구가 이미 있어요';
  return null;
}

const KEY = 'atlas.furniture';
export function loadPlaced(): Placed[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]') as Placed[];
    return Array.isArray(list) ? list.filter(p => ITEM[p.name]?.cat === 'deco' && typeof p.x === 'number' && typeof p.y === 'number') : [];
  } catch { return []; }
}
export function savePlaced(list: Placed[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* 저장 안 돼도 화면은 그대로 */ }
}
