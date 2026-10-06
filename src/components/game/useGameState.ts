'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pet } from '@/types/pet';
import { Fx, ITEM, Item, SHOP, WAR_SHOP } from '../shop/catalog';
import { Equip, EQUIP_KEY, slotOf } from '../character/charConfig';
import { baseAtk, baseDef, maxHp as maxHpAt } from '@/lib/war';   // 전투 능력치 규칙 (레벨 1 이 시작, 레벨마다 늘어남)
import { savePet } from './storage';

export const COST = 10;   // 돌봄 1번에 드는 캐시
export type CareAction = 'feed' | 'clean' | 'shower';
export interface Buff { k: 'atk' | 'def' | 'regen'; a: number; t: number }

// 애완모드 스탯 (0~100)
export interface PetStats {
  hunger: number;      // 높을수록 배고픔
  tiredness: number;   // 높을수록 피로
  cleanliness: number; // 높을수록 깨끗함
  happiness: number;   // 높을수록 행복함
  isAwake: boolean;
  sleepStartTime: number | null;
  lastUpdateTime: number; // 자동 변화 계산용
  lastCashRecoveryTime: number; // 캐시 자동 회복용
}

// 돌봄 행동별 설정
interface CareConfig {
  hunger?: number;
  tiredness?: number;
  cleanliness?: number;
  happiness?: number;
  cost: number;
  cooldown: number;
  exp: number;
}

const CARE_CONFIG: Record<string, CareConfig> = {
  feed: { hunger: -30, cost: 10, cooldown: 90, exp: 3 },
  clean: { cleanliness: 40, cost: 15, cooldown: 120, exp: 2 },
  shower: { cleanliness: 40, cost: 15, cooldown: 120, exp: 2 },
  sleep: { tiredness: -50, cost: 0, cooldown: 0, exp: 1 },
  play: { happiness: 30, cost: 5, cooldown: 45, exp: 5 },
};

// 자동 변화 (1시간마다)
const AUTO_CHANGE_RATE = {
  hunger: 10,
  tiredness: 5,
  cleanliness: -3,
  happiness: -2,
};

// 미션 진행도용 횟수. 아직 없는 기능(초대·방문·선물·대전)은 0에 머문다
// TODO: DB 가 붙으면 care_logs · cash_logs · visit_logs · battle_logs 를 세서 계산
export const EMPTY_STATS = {
  feed: 0, clean: 0, shower: 0, sleep: 0, play: 0, shopOpen: 0, customSave: 0, modeSwitch: 0, buy: 0, buyClothes: 0,
  invites: 0, visits: 0, gifts: 0, battleWins: 0, clanWins: 0, chainDepth: 0,
  potions: 0, gearBuy: 0,   // 전쟁 미션: 물약을 마신 횟수, 무기·갑옷을 산 횟수
};
export type Stats = typeof EMPTY_STATS;

// 브라우저에 남겨 두는 값 (새로고침해도 유지). TODO: 가진 아이템은 cash_logs 의 item 으로 계산 (plan.md)
export function usePersisted<T>(key: string, init: T) {   // 전쟁모드(src/components/war)도 같은 방식으로 저장한다
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? { ...init, ...JSON.parse(s) } : init; } catch { return init; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 저장 안 돼도 화면은 그대로 */ } }, [key, v]);
  return [v, setV] as const;
}

const ownedIn = (owned: string[], cat: string) => owned.map(n => ITEM[n]).filter(it => it?.cat === cat);

export function useGameState(initialPet: Pet, toast: (msg: string) => void, isWarMode: boolean = false) {
  const [pet, setPet] = useState(initialPet);
  const petRef = useRef(pet);   // 빠르게 여러 번 눌러도 마지막 값에서 계산하도록
  const updatePet = useCallback((fn: (p: Pet) => Pet) => { petRef.current = fn(petRef.current); setPet(petRef.current); }, []);
  const getPet = useCallback(() => petRef.current, []);
  useEffect(() => { savePet(pet); }, [pet]);

  // ── 애완모드 자동 변화 (1시간마다, 애완모드에서만) ──
  useEffect(() => {
    if (isWarMode) return; // 전쟁모드에선 실행하지 않음

    const interval = setInterval(() => {
      updatePet(p => {
        if (!p.isAwake) return p; // 자는 중이면 변화 없음

        const now = Math.floor(Date.now() / 1000);
        const elapsed = Math.max(0, (now - p.lastUpdateTime) / 3600); // 시간 단위

        return {
          ...p,
          hunger: Math.min(100, p.hunger + AUTO_CHANGE_RATE.hunger * elapsed),
          tiredness: Math.min(100, p.tiredness + AUTO_CHANGE_RATE.tiredness * elapsed),
          cleanliness: Math.max(0, p.cleanliness + AUTO_CHANGE_RATE.cleanliness * elapsed),
          happiness: Math.max(0, p.happiness + AUTO_CHANGE_RATE.happiness * elapsed),
          lastUpdateTime: now,
        };
      });
    }, 10000); // 10초마다 체크 (개발 편의상)
    return () => clearInterval(interval);
  }, [updatePet, isWarMode]);

  // ── 캐시 자동 회복 (1시간마다 +20, 애완모드에서만) ──
  useEffect(() => {
    if (isWarMode) return; // 전쟁모드에선 실행하지 않음

    const interval = setInterval(() => {
      updatePet(p => {
        if (!p.isAwake) return p; // 자는 중이면 회복 없음

        const now = Math.floor(Date.now() / 1000);
        const elapsed = Math.max(0, now - p.lastCashRecoveryTime);
        const times = Math.floor(elapsed / 3600); // 경과한 시간

        if (times > 0) {
          return {
            ...p,
            cash: Math.min(150, p.cash + 20 * times),
            lastCashRecoveryTime: now,
          };
        }
        return p;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [updatePet, isWarMode]);

  const [{ list: owned }, setOwned] = usePersisted('atlas.owned', { list: [] as string[] });
  const [stats, setStats] = usePersisted('atlas.stats', EMPTY_STATS);
  // 옷장: 슬롯마다 입은 아이템. 사면 그 슬롯에 바로 입고, 꾸미기 창에서 바꿀 수 있다
  const [equip, setEquip] = usePersisted<Equip>(EQUIP_KEY, {});
  const wear = useCallback((it: Item) => { const slot = slotOf(it); if (slot) setEquip(e => ({ ...e, [slot]: it.name })); }, [setEquip]);
  const isWorn = (name: string) => Object.values(equip).includes(name);
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
  // 전투력·방어력은 지금 입고 있는 전투 장비(무기·갑옷)만 더한다
  const gear: Item[] = Object.values(equip).map(n => ITEM[n]).filter(it => it?.kind === 'gear');

  // ── 물약 효과: 같은 종류는 쌓이지 않고 더 강한(같으면 더 긴) 것 하나만 남는다. 재생은 1초 = 1턴 ──
  const maxHp = maxHpAt(pet.level);
  const [hp, setHp] = useState(() => maxHpAt(initialPet.level));   // 처음엔 가득. 전투(src/components/war)가 끝나면 남은 체력으로 줄어든다
  const [buffs, setBuffs] = useState<Buff[]>([]);
  const hpRef = useRef(hp); hpRef.current = hp;
  useEffect(() => { setHp(h => Math.min(h, maxHp)); }, [maxHp]);   // 체력은 최대 체력을 넘지 않는다
  const buffsRef = useRef(buffs); buffsRef.current = buffs;
  const buffPct = (k: Buff['k']) => buffs.find(b => b.k === k)?.a || 0;

  const power = Math.round((baseAtk(pet.level) + baseLove + gear.reduce((s, it) => s + (it?.atk || 0), 0)) * (1 + buffPct('atk') / 100));
  const def = Math.round((baseDef(pet.level) + gear.reduce((s, it) => s + (it?.def || 0), 0)) * (1 + buffPct('def') / 100));

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
  const loseItem = useCallback((name: string) => setOwned(o => ({ list: o.list.filter(n => n !== name) })), [setOwned]);   // 전투에 져서 빼앗긴 아이템

  // 전투가 끝났을 때: 체력을 남은 값으로(최소 1) 바꾸고, 공격·방어 물약은 한 판씩 줄인다 (0판이 되면 사라진다. 재생은 그대로)
  const finishBattle = useCallback((hpLeft: number) => {
    hpRef.current = Math.min(maxHp, Math.max(1, Math.round(hpLeft)));
    setHp(hpRef.current);
    const next = buffsRef.current.flatMap(b => (b.k === 'regen' ? [b] : b.t > 1 ? [{ ...b, t: b.t - 1 }] : []));
    buffsRef.current = next; setBuffs(next);
  }, [maxHp]);

  // ── 돌봄 행동 (애완모드) ──
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  const care = useCallback((action: 'feed' | 'clean' | 'shower' | 'sleep' | 'wake' | 'play') => {
    if (isWarMode) { toast('전쟁모드에서는 사용할 수 없습니다'); return; }

    const p = getPet();
    const now = Math.floor(Date.now() / 1000);

    // 특수 행동: 깨우기
    if (action === 'wake') {
      if (!p.isAwake) {
        updatePet(pet => ({ ...pet, isAwake: true, sleepStartTime: null }));
        bump('feed'); // TODO: 실제로는 다른 카테고리
      }
      return;
    }

    // 특수 행동: 재우기
    if (action === 'sleep') {
      if (p.isAwake) {
        updatePet(pet => ({ ...pet, isAwake: false, sleepStartTime: now }));
        addExp(1);
        bump('feed');
      }
      return;
    }

    // 펫이 자는 중이면 불가
    if (!p.isAwake) { toast('펫이 자고 있습니다'); return; }

    const config = CARE_CONFIG[action as 'feed' | 'clean' | 'shower' | 'play'];
    if (!config) return;

    // 쿨타임 체크
    const cd = cooldowns[action] || 0;
    if (cd > 0) { toast(`아직 준비 중입니다. ${cd}초 후`); return; }

    // 캐시 체크
    if (p.cash < config.cost) { toast('캐시가 부족합니다'); return; }

    // 놀아주기: 피로도 80 이상이면 불가
    if (action === 'play' && p.tiredness >= 80) { toast('펫이 너무 피곤합니다'); return; }

    // 행동 실행
    updatePet(pet => {
      let changes: Partial<Pet> = { cash: pet.cash - config.cost };

      if ('hunger' in config && config.hunger) changes.hunger = Math.max(0, Math.min(100, pet.hunger + config.hunger));
      if ('tiredness' in config && config.tiredness) changes.tiredness = Math.max(0, Math.min(100, pet.tiredness + config.tiredness));
      if ('cleanliness' in config && config.cleanliness) changes.cleanliness = Math.max(0, Math.min(100, pet.cleanliness + config.cleanliness));
      if ('happiness' in config && config.happiness) changes.happiness = Math.max(0, Math.min(100, pet.happiness + config.happiness));

      return { ...pet, ...changes };
    });

    // 경험치 추가 (배고픔 80 이상이면 불가)
    if (p.hunger < 80) {
      addExp(config.exp);
    }

    // 쿨타임 설정
    if (config.cooldown > 0) {
      setCooldowns(cd => ({ ...cd, [action]: config.cooldown }));
    }

    bump(action);
  }, [getPet, updatePet, addExp, toast, bump, cooldowns, isWarMode]);

  // 쿨타임 감소
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns(cd => {
        const next = { ...cd };
        Object.keys(next).forEach(k => {
          next[k] = Math.max(0, next[k] - 1);
          if (next[k] === 0) delete next[k];
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    pet, getPet, updatePet, addExp, addCash, owned, own, loseItem, stats, bump,
    equip, setEquip, wear, isWorn,
    love, power, def, hp, maxHp, buffs, fxUseful, drink, finishBattle, toast,
    shops: { pet: SHOP, war: WAR_SHOP },
    care, cooldowns, // 애완모드
  };
}
export type GameState = ReturnType<typeof useGameState>;
