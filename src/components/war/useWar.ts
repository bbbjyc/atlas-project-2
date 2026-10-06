'use client';

import { useCallback, useMemo, useRef } from 'react';
import {
  BattleKind, BattleReward, battleReward, formatRemaining, hideoutUpgradeCost, hpAfterBattle,
  pickPlunderItem, pvpCooldownLeft, Rng, WAR_RULES,
} from '@/lib/war';
import type { GameApi } from '../game/GameContext';
import { usePersisted } from '../game/useGameState';
import { cleanWar, INIT_WAR, kstDay, upcomingClanWar, WAR_KEY, WarState } from './warState';

// 전쟁모드 상태 + 행동 (대전·클랜전 결과 적용, 아지트 올리기, 출전 등록).
// 기존 게임 상태(useGameState)는 GameApi 로 받아서 쓰기만 하고, 전쟁 전용 값(클랜 골드·평판·아지트·쿨타임)은 여기서 따로 저장한다.
// TODO: DB 지금은 브라우저(localStorage 'atlas.war')에만 저장. 각 값의 필요한 테이블은 warState.ts 의 WarState 주석 참고

// useWar 가 게임 상태에서 쓰는 것들 (GameApi 의 일부)
export type WarHost = Pick<GameApi,
  'getPet' | 'addExp' | 'addCash' | 'owned' | 'own' | 'loseItem' | 'equip' | 'finishBattle' | 'bump' | 'toast' | 'openTopup'>;

// 이겼을 때 가져올 수 있는 상대 아이템 (장착 중인 것은 미리 뺀 목록)
export interface LootCandidate { name: string; from: string }

export interface SettleInput {
  kind: BattleKind;
  win: boolean;
  hpLeft: number;           // 내 펫이 전투가 끝났을 때 남은 체력 (0 이어도 된다. 저장할 때 최소 1 로 맞춘다)
  loot: LootCandidate[];    // 이겼을 때 빼앗을 수 있는 상대 아이템
  taker: string;            // 졌을 때 내 아이템을 가져가는 상대 이름 (화면 표시용)
}

export interface SettleOutcome {
  cost: number;             // 낸 캐시
  reward: BattleReward;     // 클랜 골드·평판·경험치 변화
  levelUp: number;          // 레벨이 올랐으면 새 레벨, 아니면 0
  hpAfter: number;          // 전투 뒤 내 체력
  plunder: { type: 'got' | 'lost'; item: string; who: string } | null;   // 약탈 결과 (null 이면 아무것도 안 오감)
}

export interface WarApi {
  state: WarState;
  checkReady: (kind: BattleKind) => boolean;
  settle: (input: SettleInput, rng?: Rng) => SettleOutcome;
  upgradeHideout: () => boolean;
  registerRoster: () => boolean;
}

const costOf = (kind: BattleKind) => (kind === 'pvp' ? WAR_RULES.pvp.costCash : WAR_RULES.clanWar.costCash);

export function useWar(host: WarHost): WarApi {
  const [raw, setRaw] = usePersisted<WarState>(WAR_KEY, INIT_WAR);
  const state = useMemo(() => cleanWar(raw), [raw]);
  // 클릭 순간의 최신 값을 읽으려고 (화면 그린 뒤 바뀐 값에 뒤처지지 않게)
  const hostRef = useRef(host); hostRef.current = host;
  const stateRef = useRef(state); stateRef.current = state;
  const update = useCallback((fn: (s: WarState) => WarState) => setRaw(r => fn(cleanWar(r))), [setRaw]);

  // 전투를 시작하기 전 확인 (애완모드 돌봄과 같은 규칙): 자는 중 → 너무 피곤 → 대전 쿨타임 → 캐시 부족(충전 팝업)
  // 못 하면 이유를 알려 주고 false
  const checkReady = useCallback((kind: BattleKind) => {
    const h = hostRef.current;
    const p = h.getPet();
    if (!p.isAwake) { h.toast('펫이 자고 있습니다'); return false; }
    if (p.tiredness >= 80) { h.toast('펫이 너무 피곤합니다'); return false; }
    if (kind === 'pvp') {
      const left = pvpCooldownLeft(stateRef.current.lastPvpAt || null, Date.now());
      if (left > 0) { h.toast(`아직 준비 중입니다. ${formatRemaining(left)} 후`); return false; }
    }
    const cost = costOf(kind);
    if (cost > 0 && p.cash < cost) { h.openTopup(cost, 'battle'); return false; }
    return true;
  }, []);

  // 싸움이 끝난 결과를 게임에 적용한다 (한 번만 부를 것): 캐시 → 약탈 → 보상(경험치·골드·평판) → 체력 → 미션용 승리 횟수 → 쿨타임·전적 저장
  const settle = useCallback((input: SettleInput, rng: Rng = Math.random): SettleOutcome => {
    const h = hostRef.current;
    const { kind, win } = input;

    const cost = costOf(kind);
    if (cost > 0) h.addCash(-cost);

    // 약탈: 이기면 상대 아이템 중 내가 아직 없는 것 하나, 지면 내 아이템 중 장착하지 않은 것 하나 (장착 중인 무기·갑옷은 보호)
    let plunder: SettleOutcome['plunder'] = null;
    if (win) {
      const free = input.loot.filter(l => !h.owned.includes(l.name));
      const item = pickPlunderItem(free.map(l => l.name), [], rng);
      if (item) { h.own(item); plunder = { type: 'got', item, who: free.find(l => l.name === item)?.from ?? '' }; }
    } else {
      const guard = Object.values(h.equip).flatMap(n => (n ? [n] : []));   // 입고 있는 것(옷·무기·갑옷)은 빼앗기지 않는다
      const item = pickPlunderItem(h.owned, guard, rng);
      if (item) { h.loseItem(item); plunder = { type: 'lost', item, who: input.taker }; }
    }

    const reward = battleReward(kind, win);
    const levelUp = reward.exp > 0 ? h.addExp(reward.exp) : 0;

    const hpAfter = hpAfterBattle(input.hpLeft);
    h.finishBattle(hpAfter);

    // 미션 진행용 승리 횟수 (전쟁모드에서는 미션이 멈춰 있어서 지금은 쌓이기만 한다)
    if (win) h.bump(kind === 'pvp' ? 'battleWins' : 'clanWins');

    const now = Date.now();
    update(s => ({
      ...s,
      clanGold: s.clanGold + reward.gold,
      reputation: s.reputation + reward.reputation,
      lastPvpAt: kind === 'pvp' ? now : s.lastPvpAt,
      clanWar: kind === 'clanwar' ? { ...s.clanWar, lastDay: kstDay(now), result: win ? 'win' : 'lose' } : s.clanWar,
      record: {
        pvpWins: s.record.pvpWins + (kind === 'pvp' && win ? 1 : 0),
        pvpLosses: s.record.pvpLosses + (kind === 'pvp' && !win ? 1 : 0),
        clanWins: s.record.clanWins + (kind === 'clanwar' && win ? 1 : 0),
        clanLosses: s.record.clanLosses + (kind === 'clanwar' && !win ? 1 : 0),
      },
    }));

    return { cost, reward, levelUp, hpAfter, plunder };
  }, [update]);

  // 아지트를 다음 레벨로 (클랜 골드를 쓴다). 효과는 아직 보여주기만 한다 (TODO)
  const upgradeHideout = useCallback(() => {
    const h = hostRef.current, s = stateRef.current;
    const cost = hideoutUpgradeCost(s.hideoutLevel);
    if (cost === null) { h.toast('아지트가 이미 최고 레벨이에요'); return false; }
    if (s.clanGold < cost) { h.toast(`클랜 골드가 ${(cost - s.clanGold).toLocaleString()} 부족해요`); return false; }
    update(x => (x.clanGold < cost || x.hideoutLevel !== s.hideoutLevel ? x : { ...x, clanGold: x.clanGold - cost, hideoutLevel: x.hideoutLevel + 1 }));
    h.toast(`아지트가 Lv.${s.hideoutLevel + 1} 이 되었어요!`);
    return true;
  }, [update]);

  // 다음 클랜전 출전 등록 (명단 마감 19:50 전에만)
  const registerRoster = useCallback(() => {
    const h = hostRef.current;
    const next = upcomingClanWar(stateRef.current, Date.now());
    if (!next.isOpenNow) { h.toast('명단 접수가 마감됐어요'); return false; }
    update(s => ({ ...s, clanWar: { ...s.clanWar, rosterDay: kstDay(next.startsAtMs) } }));
    h.toast('클랜전 출전 등록 완료!');
    return true;
  }, [update]);

  return { state, checkReady, settle, upgradeHideout, registerRoster };
}
