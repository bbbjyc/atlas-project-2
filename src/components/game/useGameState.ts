'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pet } from '@/types/pet';
import { Fx, ITEM, Item, SHOP, WAR_SHOP } from '../shop/catalog';
import { savePet } from './storage';

export const COST = 10;   // 돌봄 1번에 드는 캐시
export type CareAction = 'feed' | 'clean' | 'shower';
export interface Buff { k: 'atk' | 'def' | 'regen'; a: number; t: number }

// 미션 진행도용 횟수. 아직 없는 기능(초대·방문·선물·대전)은 0에 머문다
// TODO: DB 가 붙으면 care_logs · cash_logs · visit_logs · battle_logs 를 세서 계산
export const EMPTY_STATS = {
  feed: 0, clean: 0, shower: 0, shopOpen: 0, customSave: 0, modeSwitch: 0, buy: 0, buyClothes: 0,
  invites: 0, visits: 0, gifts: 0, battleWins: 0, clanWins: 0, chainDepth: 0,
};
export type Stats = typeof EMPTY_STATS;

// 브라우저에 남겨 두는 값 (새로고침해도 유지). TODO: 가진 아이템은 cash_logs 의 item 으로 계산 (plan.md)
function usePersisted<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? { ...init, ...JSON.parse(s) } : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 저장 안 돼도 화면은 그대로 */ } }, [key, v]);
  return [v, setV] as const;
}

const ownedIn = (owned: string[], cat: string) => owned.map(n => ITEM[n]).filter(it => it?.cat === cat);
const bestBy = (list: Item[], k: 'atk' | 'def') => list.reduce<Item | null>((b, it) => (!b || it[k] > b[k] ? it : b), null);

export function useGameState(initialPet: Pet, toast: (msg: string) => void) {
  const [pet, setPet] = useState(initialPet);
  const petRef = useRef(pet);   // 빠르게 여러 번 눌러도 마지막 값에서 계산하도록
  const updatePet = useCallback((fn: (p: Pet) => Pet) => { petRef.current = fn(petRef.current); setPet(petRef.current); }, []);
  const getPet = useCallback(() => petRef.current, []);
  useEffect(() => { savePet(pet); }, [pet]);

  const [{ list: owned }, setOwned] = usePersisted('atlas.owned', { list: [] as string[] });
  const [stats, setStats] = usePersisted('atlas.stats', EMPTY_STATS);
  const bump = useCallback((k: keyof Stats, n = 1) => setStats(s => ({ ...s, [k]: s[k] + n })), [setStats]);

  // 경험치: 10 이면 레벨 1 (plan.md: 레벨 = care_logs 수 ÷ 10). 레벨이 올랐으면 새 레벨을 돌려준다
  const addExp = useCallback((n: number) => {
    const before = petRef.current.level;
    updatePet(p => { const total = p.level * 10 + p.exp + n; return { ...p, level: Math.floor(total / 10), exp: total % 10 }; });
    return petRef.current.level > before ? petRef.current.level : 0;
  }, [updatePet]);
  const addCash = useCallback((n: number) => updatePet(p => ({ ...p, cash: p.cash + n })), [updatePet]);

  // ── 애정·전투 능력치 ──
  const baseLove = 0;   // TODO: 애정점수 = 내 집이 host_id 인 visit_logs 수 (plan.md)
  const outfitLove = Math.max(0, ...ownedIn(owned, 'clothes').map(it => it.val));       // 입은 옷 중 가장 높은 것 하나
  const decoLove = ownedIn(owned, 'deco').reduce((s, it) => s + it.val, 0);            // 가진 가구는 모두 더한다
  const love = baseLove + outfitLove + decoLove;
  // 무기는 전투력, 갑옷은 방어력이 가장 높은 것을 자동 장착 (장착 화면은 나중에)
  const equipped = { weapon: bestBy(ownedIn(owned, 'weapon'), 'atk'), armor: bestBy(ownedIn(owned, 'armor'), 'def') };
  const gear = [equipped.weapon, equipped.armor];

  // ── 물약 효과: 같은 종류는 쌓이지 않고 더 강한(같으면 더 긴) 것 하나만 남는다. 재생은 1초 = 1턴 ──
  const maxHp = 300 + pet.level * 30;
  const [hp, setHp] = useState(180);   // TODO: 전투(startBattle)가 붙으면 전투 결과로 줄어든다. 지금은 물약을 시험하려고 덜 찬 상태로 시작
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const hpRef = useRef(hp); hpRef.current = hp;
  const buffsRef = useRef(buffs); buffsRef.current = buffs;
  const buffPct = (k: Buff['k']) => buffs.find(b => b.k === k)?.a || 0;

  const power = Math.round((pet.level * 10 + baseLove + gear.reduce((s, it) => s + (it?.atk || 0), 0)) * (1 + buffPct('atk') / 100));
  const def = Math.round((pet.level * 5 + gear.reduce((s, it) => s + (it?.def || 0), 0)) * (1 + buffPct('def') / 100));

  // 지금 마시면 달라지는 게 있는 효과인지 (체력이 가득이면 회복은 헛일, 더 약한 효과는 덮어쓰지 못한다)
  const fxUseful = useCallback(([k, a, t = 0]: Fx) => {
    if (k === 'heal') return hpRef.current < maxHp;
    const cur = buffsRef.current.find(b => b.k === k);
    return !cur || a > cur.a || (a === cur.a && t > cur.t);
  }, [maxHp]);

  const drink = useCallback((effects: Fx[]) => {
    const used = effects.filter(fxUseful);
    let next = buffsRef.current;
    for (const [k, a, t = 0] of used) {
      if (k === 'heal') { hpRef.current = Math.min(maxHp, hpRef.current + a); setHp(hpRef.current); continue; }
      next = [...next.filter(b => b.k !== k), { k, a, t }];
    }
    buffsRef.current = next; setBuffs(next);
    return used;
  }, [fxUseful, maxHp]);

  const hasRegen = buffs.some(b => b.k === 'regen');
  useEffect(() => {
    if (!hasRegen) return;
    const id = window.setInterval(() => {
      const r = buffsRef.current.find(b => b.k === 'regen');
      if (!r) return;
      setHp(h => Math.min(maxHp, h + r.a));
      setBuffs(bs => bs.flatMap(b => b.k !== 'regen' ? [b] : b.t > 1 ? [{ ...b, t: b.t - 1 }] : []));
    }, 1000);
    return () => clearInterval(id);
  }, [hasRegen, maxHp]);

  const own = useCallback((name: string) => setOwned(o => (o.list.includes(name) ? o : { list: [...o.list, name] })), [setOwned]);

  return {
    pet, getPet, updatePet, addExp, addCash, owned, own, stats, bump,
    love, power, def, hp, maxHp, buffs, equipped, fxUseful, drink, toast,
    shops: { pet: SHOP, war: WAR_SHOP },
  };
}
export type GameState = ReturnType<typeof useGameState>;
