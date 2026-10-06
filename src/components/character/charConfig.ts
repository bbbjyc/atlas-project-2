// 캐릭터 설정(어떤 동물인지)과 옷장(슬롯마다 입은 아이템). 그림은 Character.tsx 가 그린다
import { ITEM, Item, itemArt } from '../shop/catalog';

// ── 캐릭터: 4마리 중 하나. 몸 규격이 같아서 아이템 그림을 모두 같이 쓴다 ──
export type Species = 'rabbit' | 'sheep' | 'bear' | 'chick';
export interface CharConfig { species: Species }
export const SPECIES: Record<Species, { label: string; desc: string }> = {
  rabbit: { label: '토끼', desc: '노란 귀가 쫑긋' },
  sheep: { label: '양', desc: '구름 같은 털' },
  bear: { label: '곰', desc: '하늘색 곰돌이' },
  chick: { label: '병아리', desc: '머리에 새싹이' },
};
export const SPECIES_LIST = Object.keys(SPECIES) as Species[];
export const DEFAULT_CFG: CharConfig = { species: 'rabbit' };

// 목록에 없는 값(예전 사람 캐릭터 설정 등)은 기본값으로
export function sanitize(raw: unknown): CharConfig {
  const s = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>).species : null) as string | null;
  return { species: s && s in SPECIES ? (s as Species) : DEFAULT_CFG.species };
}

const CFG_KEY = 'atlas.charCfg';
export function loadCfg(): CharConfig {
  try { return sanitize(JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch { return { ...DEFAULT_CFG }; }
}
export function saveCfg(cfg: CharConfig) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch { /* 저장 안 돼도 화면은 그대로 */ }
}

// ── 옷장: 슬롯마다 아이템 이름 하나 ──
export type Slot = 'head' | 'face' | 'neck' | 'top' | 'bottom' | 'feet' | 'back' | 'rightHand' | 'leftHand' | 'hands';
export type Equip = Partial<Record<Slot, string>>;
export const SLOT_LABEL: Record<Slot, string> = {
  head: '머리', face: '얼굴', neck: '목', top: '상의', bottom: '하의', feet: '발', back: '등', rightHand: '오른손', leftHand: '왼손', hands: '장갑',
};
// 꾸미기 창의 탭마다 보여 줄 슬롯
export const WARDROBE_TABS: { key: string; label: string; slots: Slot[] }[] = [
  { key: 'head', label: '머리·얼굴', slots: ['head', 'face', 'neck'] },
  { key: 'clothes', label: '옷', slots: ['top', 'bottom', 'feet', 'back'] },
  { key: 'gear', label: '장비', slots: ['rightHand', 'leftHand', 'hands'] },
];

// 아이템 그림 종류(catalog 의 ART_RULES) → 슬롯. 무기는 모두 오른손
const SLOT_OF: Record<string, Slot> = {
  crown: 'head', helm: 'head', beanie: 'head', cap: 'head', hat: 'head', ribbon: 'head',
  glasses: 'face', scarf: 'neck',
  tee: 'top', tank: 'top', vest: 'top', hood: 'top', jacket: 'top', dress: 'top', armor: 'top',
  pants: 'bottom', sock: 'feet', shoe: 'feet', boot: 'feet',
  wings: 'back', cape: 'back',
  shield: 'leftHand', glove: 'hands',
};
export function slotOf(it: Item): Slot | undefined {
  if (it.cat === 'weapon') return 'rightHand';
  if (it.cat === 'clothes' || it.cat === 'armor') return SLOT_OF[itemArt(it).arch];
  return undefined;   // 집 꾸미기·음식·물약은 입지 않는다
}

// 입은 모습 그림: public/sprites/wear.svg 의 w-… 와 색
export function wornArt(name: string) {
  const it = ITEM[name];
  if (!it) return null;
  const { arch, style } = itemArt(it);
  return { id: `w-${arch}`, style };
}

export const EQUIP_KEY = 'atlas.equip';
