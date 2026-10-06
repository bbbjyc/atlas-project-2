'use client';

import Icon from '../ui/Icon';
import { clampHideoutLevel, clanSlotsLeft, hideoutUpgradeCost, isClanFull, WAR_RULES } from '@/lib/war';
import type { WarApi } from './useWar';

// 클랜 현황: 인원 n/20, (전쟁모드) 클랜 골드·평판·아지트 레벨과 올리기
// 인원은 지금 예시 친구 + 나. TODO: players 에서 내 clan_id 가 같은 행을 센다 (plan.md), 20명이 넘으면 joinClan 이 막아야 한다
// 클랜 골드·평판·아지트는 브라우저에만 저장한다. TODO: DB 클랜 골드/평판 로그, 아지트 업그레이드 기록 테이블이 필요 (plan.md 에 없음)
export default function ClanPanel({ wr, members, war }: { wr: WarApi; members: number; war: boolean }) {
  const { clanGold, reputation, hideoutLevel } = wr.state;
  const max = WAR_RULES.clan.maxMembers;
  const full = isClanFull(members);
  const lv = clampHideoutLevel(hideoutLevel);
  const cost = hideoutUpgradeCost(lv);   // 최고 레벨이면 null

  return (
    <section className="rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Icon name="i-home" className="size-4 text-(--primary)" />클랜 현황</h3>

      <div className="mt-2.5">
        <div className="flex items-baseline justify-between text-[11px] font-bold text-(--ink-2)">
          <span>클랜 인원</span>
          <b className="text-sm font-extrabold text-(--ink) tabular-nums">{members}<small className="text-[11px] font-bold text-(--ink-2)"> / {max}명</small></b>
        </div>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-[3px] bg-(--track)">
          <i className={`block h-full rounded-[inherit] bg-linear-90 transition-[width] duration-450 ${full ? 'from-[#ff9f4a] to-[#ff5d6c]' : 'from-(--primary) to-(--accent)'}`} style={{ width: `${Math.min(100, members / max * 100)}%` }} />
        </span>
        <p className={`mt-1.5 text-[11px] font-bold ${full ? 'text-[#e5484d]' : 'text-(--ink-2)'}`}>
          {full ? `클랜이 가득 찼어요 (${max}/${max}). 새 친구는 초대 링크로 와도 이 클랜에는 들어올 수 없어요` : `자리가 ${clanSlotsLeft(members)}개 남았어요`}
        </p>
      </div>

      {war && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-center">
            <div className="rounded-xl bg-(--chip-bg) py-2">
              <b className="flex items-center justify-center gap-1 text-[15px] font-extrabold tabular-nums"><Icon name="i-coin" className="size-3.5 text-[#e0950e]" />{clanGold.toLocaleString()}</b>
              <span className="text-[10px] font-bold text-(--ink-2)">클랜 골드</span>
            </div>
            <div className="rounded-xl bg-(--chip-bg) py-2">
              <b className={`flex items-center justify-center gap-1 text-[15px] font-extrabold tabular-nums ${reputation < 0 ? 'text-[#ff8791]' : ''}`}><Icon name="i-star" className="size-3.5 text-[#ffd21f]" />{reputation.toLocaleString()}</b>
              <span className="text-[10px] font-bold text-(--ink-2)">평판</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-(--chip-bg) p-3">
            <div className="flex items-center gap-2">
              <b className="text-[13px] font-extrabold">클랜 아지트 Lv.{lv}</b>
              <span className="ml-auto flex gap-[3px]" aria-hidden="true">
                {Array.from({ length: WAR_RULES.hideout.maxLevel }, (_, i) => (
                  <i key={i} className={`size-2 rounded-full ${i < lv ? 'bg-[#ffd21f]' : 'bg-(--track)'}`} />
                ))}
              </span>
            </div>
            {/* TODO: 아지트 효과는 아직 정해진 게 없다. 지금은 레벨만 보여 준다 */}
            <p className="mt-1 text-[11px] font-semibold text-(--ink-2)">레벨이 오르면 어떤 효과가 생길지는 아직 준비 중이에요. 지금은 레벨만 표시돼요</p>
            <button onClick={wr.upgradeHideout} disabled={cost === null}
              className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-[11px] bg-(--primary) text-[13px] font-extrabold text-white transition-transform active:scale-97 disabled:cursor-default disabled:bg-(--track) disabled:text-(--ink-2)">
              {cost === null ? `Lv${lv} (최대)` : (
                <>Lv.{lv + 1} 로 올리기 <span className="flex items-center gap-0.5"><Icon name="i-coin" className="size-3.5 stroke-[2.4]!" />{cost.toLocaleString()}</span></>
              )}
            </button>
            {cost !== null && clanGold < cost && (
              <p className="mt-1.5 text-center text-[11px] font-bold text-(--ink-2)">클랜 골드가 {(cost - clanGold).toLocaleString()} 더 필요해요. 클랜전에서 이기면 +100 이에요</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
