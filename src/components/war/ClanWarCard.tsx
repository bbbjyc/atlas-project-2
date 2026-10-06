'use client';

import Icon from '../ui/Icon';
import { formatRemaining, WAR_RULES } from '@/lib/war';
import { useNow } from './useNow';
import { CLAN_WAR_ENTRY_MS, clanWarStatus, kstDayLabel } from './warState';
import type { WarApi } from './useWar';

const pad = (n: number) => String(n).padStart(2, '0');
// 남은 시간을 시:분:초 로 (초 단위 올림. 0 이 되는 순간이 곧 시작)
function clock(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}
// 하루 중 몇 분째인지 → '오후 7시 50분'
const hhmm = (totalMin: number) => {
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return `${h < 12 ? '오전' : '오후'} ${h > 12 ? h - 12 : h}시${m ? ` ${m}분` : ''}`;
};

// 클랜 탭의 클랜전 카드: 매일 20:00(한국 시간), 명단 마감 19:50, 하루 한 번 결과
// 이 카드가 화면에 있는 동안만 1초마다 시간을 갱신한다.
// TODO: DB 진짜 클랜끼리의 대결은 서버가 정해진 시각에 두 클랜의 명단을 모아 battle_logs 에 기록해야 한다. 지금은 예시 상대와 싸운다
export default function ClanWarCard({ wr, onStart }: { wr: WarApi; onStart: () => void }) {
  const now = useNow(1000);
  const st = clanWarStatus(wr.state, now);
  const { lastDay, result } = wr.state.clanWar;
  const { startHourKst, rosterCloseMinutesBefore } = WAR_RULES.clanWar;
  const entering = st.action === 'enter';

  const chip = entering ? ['bg-[rgba(46,196,166,.2)] text-[#5fd3b5]', '입장 가능']
    : st.action === 'register' ? ['bg-[rgba(255,159,74,.18)] text-[#ffb36e]', '명단 접수 중']
      : st.action === 'registered' ? ['bg-[rgba(46,196,166,.2)] text-[#5fd3b5]', '출전 등록 완료']
        : ['bg-(--chip-bg) text-(--ink-2)', '명단 마감'];

  return (
    <section className="rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_8px_rgba(60,40,80,.07)]">
      <div className="flex items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold"><Icon name="i-swords" className="size-4 text-(--primary)" />클랜전</h3>
        <span className={`ml-auto rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${chip[0]}`}>{chip[1]}</span>
      </div>
      <p className="mt-0.5 text-[11px] font-semibold text-(--ink-2)">
        매일 {hhmm(startHourKst * 60)}(한국 시간) · 출전 명단은 {hhmm(startHourKst * 60 - rosterCloseMinutesBefore)}에 마감 · 3 대 3 · 참가비 없음
      </p>

      <div className="mt-3 rounded-xl bg-(--chip-bg) py-2.5 text-center">
        <span className="text-[11px] font-bold text-(--ink-2)">{entering ? '입장 마감까지' : st.playedToday ? '내일 클랜전까지' : '다음 클랜전까지'}</span>
        <b className="block text-[26px] leading-tight font-black tabular-nums" aria-label={`${formatRemaining(entering ? st.entryLeftMs : st.next.msLeft)} 남음`}>
          {clock(entering ? st.entryLeftMs : st.next.msLeft)}
        </b>
        {!entering && <span className="text-[11px] font-bold text-(--ink-2)">{st.next.isOpenNow ? `명단 마감까지 ${formatRemaining(st.next.rosterClosesAtMs - now)}` : '명단이 마감됐어요'}</span>}
      </div>

      {st.playedToday && <p className="mt-2 rounded-[10px] bg-(--chip-bg) px-3 py-2 text-xs font-bold">오늘 클랜전은 이미 치렀어요. 하루에 한 번이에요</p>}
      {st.missed && <p className="mt-2 rounded-[10px] bg-(--chip-bg) px-3 py-2 text-xs font-bold text-(--ink-2)">방금 시작한 클랜전은 명단 마감 전에 출전 등록을 하지 않아 들어갈 수 없어요</p>}

      {entering && (
        <button onClick={onStart} className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-(--primary) text-sm font-extrabold text-white transition-transform active:scale-97">
          <Icon name="i-swords" className="size-4" />클랜전 입장
        </button>
      )}
      {!entering && st.action === 'register' && (
        <button onClick={wr.registerRoster} className="mt-2.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-(--primary) text-sm font-extrabold text-white transition-transform active:scale-97">
          <Icon name="i-shield" className="size-4" />출전 등록하기
        </button>
      )}
      {st.action === 'registered' && <p className="mt-2.5 text-center text-xs font-bold text-[#5fd3b5]">시작하면 {CLAN_WAR_ENTRY_MS / 60000}분 동안 입장할 수 있어요</p>}
      {st.action === 'closed' && !entering && <p className="mt-2.5 text-center text-xs font-bold text-(--ink-2)">등록하지 않아 이번 클랜전에는 나갈 수 없어요. 다음 클랜전은 명단이 열리면 등록해요</p>}

      {lastDay > 0 && (
        <p className="mt-2.5 flex items-center justify-between text-[11px] font-bold text-(--ink-2)">
          <span>최근 클랜전 {kstDayLabel(lastDay)}</span>
          <b className={`font-extrabold ${result === 'win' ? 'text-[#5fd3b5]' : 'text-[#ff8791]'}`}>{result === 'win' ? '승리' : '패배'}</b>
        </p>
      )}
      <p className="mt-1 text-[11px] font-bold text-(--ink-2)">클랜전 전적 {wr.state.record.clanWins}승 {wr.state.record.clanLosses}패</p>

      {/* 시연용: 저녁 8시를 기다리지 않고 같은 3 대 3 싸움을 지금 한 판 */}
      <div className="mt-3 rounded-xl border-[1.5px] border-dashed border-(--ink-2) p-2.5">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-(--ink-2)">
          <span className="rounded-md bg-(--accent) px-1.5 py-px text-[10px] text-white">DEMO</span>시연용 버튼
        </p>
        <p className="mt-1 text-[11px] font-semibold text-(--ink-2)">저녁 8시를 기다리지 않고 지금 클랜전 한 판을 해 볼 수 있어요. 규칙과 보상은 진짜 클랜전과 같아요</p>
        <button onClick={onStart} disabled={st.demoLocked}
          className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-[11px] bg-(--chip-bg) text-[13px] font-extrabold text-(--ink) transition-transform active:scale-97 disabled:cursor-default disabled:opacity-55">
          시연용으로 지금 클랜전 시작
        </button>
        {st.demoLocked && <p className="mt-1.5 text-center text-[11px] font-bold text-(--ink-2)">오늘 클랜전은 이미 치러서 내일 다시 할 수 있어요</p>}
      </div>
    </section>
  );
}
