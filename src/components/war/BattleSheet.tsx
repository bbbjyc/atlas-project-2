'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import Sheet, { SheetHead, useSheetClose, Wallet } from '../ui/Sheet';
import Character from '../character/Character';
import type { CharConfig } from '../character/charConfig';
import { useGame } from '../game/GameContext';
import { BattleKind, BattleResult, Fighter, formatRemaining, seededRng, simulateBattle, WAR_RULES } from '@/lib/war';
import { allyForBattle, DEMO_ENEMY_CLAN, demoFighter, makeEnemyTeam, WarMember } from './demo';
import type { SettleOutcome, WarApi } from './useWar';

// 3 대 3 대전 · 클랜전 창. 열기 전에 Friends 가 자는 중·피로·쿨타임·캐시를 이미 확인했다 (wr.checkReady).
// 순서: 준비(아군 2명 고르기, 상대 팀 보기) → 시작(캐시를 내고 한 번에 계산해서 결과를 게임에 적용) → 공격 기록을 짧게 보여 주기 → 결과
// 결과는 시작하는 순간 이미 적용된다. 중간에 창을 닫아도 보상·약탈은 그대로다.
// TODO: players/battle_logs 상대와 아군은 지금 예시 데이터. 진짜 플레이어가 생기면 battle_logs 에 한 줄(신청한 사람·받은 사람·이긴 사람·이긴 쪽 클랜)을 추가한다

interface BattleSheetProps {
  kind: BattleKind;
  foe: WarMember | null;    // 대전을 신청한 친구 (클랜전이면 null)
  allies: WarMember[];      // 고를 수 있는 아군 후보 (대전이면 신청한 친구는 뺀 목록)
  wr: WarApi;
  onClose: () => void;
}

export default function BattleSheet({ kind, foe, allies, wr, onClose }: BattleSheetProps) {
  const { pet } = useGame();
  return (
    <Sheet onClose={onClose} labelledBy="battleTitle">
      <SheetHead id="battleTitle" title={kind === 'clanwar' ? '클랜전' : '대전'}><Wallet cash={pet.cash} className="ml-auto" /></SheetHead>
      <BattleBody kind={kind} foe={foe} allies={allies} wr={wr} />
    </Sheet>
  );
}

// 화면에 보이는 사람 (이름·레벨·모습)
interface Looks { name: string; level: number; cfg: CharConfig }
// 시작한 싸움 한 판의 기록
interface Run { result: BattleResult; teamA: Fighter[]; teamB: Fighter[]; looksA: Looks[]; looksB: Looks[]; outcome: SettleOutcome; win: boolean }

const MY_COLOR = 'text-[#8fb2ff]';
const FOE_COLOR = 'text-[#ff8791]';
const ANIMATION_TOTAL_MS = 6000;   // 공격 기록을 보여 주는 시간은 길어도 대략 이 정도 (기록이 많으면 더 빠르게)

// 예상 승률: 같은 규칙으로 200번 미리 돌려 본 값 (씨앗을 고정해서 같은 구성이면 늘 같은 숫자). 참고용이고 실제 결과는 달라진다
function estimateWinRate(a: Fighter[], b: Fighter[]) {
  const rng = seededRng(2026);
  let wins = 0;
  for (let i = 0; i < 200; i++) if (simulateBattle(a, b, rng).winner === 'A') wins++;
  return Math.round(wins / 2);
}

function BattleBody({ kind, foe, allies, wr }: Omit<BattleSheetProps, 'onClose'>) {
  const game = useGame();
  const close = useSheetClose();
  const { pet } = game;
  const need = Math.min(WAR_RULES.pvp.teamSize - 1, allies.length);   // 고를 아군 수 (보통 2명)
  const cost = kind === 'pvp' ? WAR_RULES.pvp.costCash : WAR_RULES.clanWar.costCash;

  // 창을 연 순간의 레벨로 상대·아군을 맞춰 둔다 (싸운 뒤 레벨이 올라도 목록이 바뀌지 않게)
  const [enemies] = useState(() => makeEnemyTeam(kind, foe, pet.level));
  const [cands] = useState(() => allies.map(a => allyForBattle(a, pet.level)));
  const [picked, setPicked] = useState<string[]>(() => [...cands].sort((a, b) => b.level - a.level).slice(0, need).map(a => a.id));
  const [phase, setPhase] = useState<'ready' | 'fight' | 'done'>('ready');
  const [run, setRun] = useState<Run | null>(null);
  const [shown, setShown] = useState(0);   // 지금까지 보여 준 공격 수
  const started = useRef(false);
  const resultRef = useRef<HTMLElement>(null);

  // 뒤에 깔린 친구 창이 같이 닫히지 않게 Esc 는 이 창이 먼저 받는다 (충전 팝업이 떠 있으면 팝업에 양보)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.getElementById('topupTitle')) return;
      e.stopImmediatePropagation();
      close();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [close]);

  // ── 준비 화면용: 우리 팀과 예상 승률 ──
  const pickedMembers = useMemo(() => picked.flatMap(id => cands.filter(c => c.id === id)), [picked, cands]);
  const meFighter = useMemo<Fighter>(
    () => ({ name: pet.name, level: pet.level, atk: game.power, def: game.def, hp: game.hp, maxHp: game.maxHp }),
    [pet.name, pet.level, game.power, game.def, game.hp, game.maxHp],
  );
  const allyFighters = useMemo(() => pickedMembers.map((m, i) => demoFighter(m, i + 1).fighter), [pickedMembers]);
  const enemyFighters = useMemo(() => enemies.map(e => e.fighter), [enemies]);
  const winRate = useMemo(
    () => (phase === 'ready' ? estimateWinRate([meFighter, ...allyFighters], enemyFighters) : 0),
    [phase, meFighter, allyFighters, enemyFighters],
  );

  const toggle = (id: string) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : p.length < need ? [...p, id] : [...p.slice(1), id]));

  const start = () => {
    if (started.current || picked.length < need) return;
    if (!wr.checkReady(kind)) return;   // 창을 연 뒤에 바뀐 게 없는지 한 번 더
    started.current = true;
    const teamA = [meFighter, ...allyFighters];
    const teamB = enemyFighters;
    const result = simulateBattle(teamA, teamB, Math.random);   // 화면 쪽에서만 Math.random 을 쓴다 (규칙 계산은 난수를 받아서 쓴다)
    const win = result.winner === 'A';
    const loot = enemies.flatMap(e => e.inventory.filter(n => !e.protectedNames.includes(n)).map(name => ({ name, from: e.name })));
    const outcome = wr.settle({ kind, win, hpLeft: result.finalHp.A[0], loot, taker: foe?.name ?? enemies[0].name });
    const me: Looks = { name: pet.name, level: pet.level, cfg: game.cfg };
    setRun({ result, teamA, teamB, looksA: [me, ...pickedMembers], looksB: enemies, outcome, win });
    setShown(0);
    setPhase('fight');
  };

  // 공격 기록을 하나씩 보여 준다. 기록이 많으면 빠르게, 움직임 줄이기 설정이면 바로 끝까지
  useEffect(() => {
    if (phase !== 'fight' || !run) return;
    const total = run.result.rounds.length;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && shown < total) { setShown(total); return; }
    if (shown >= total) {
      const id = window.setTimeout(() => setPhase('done'), reduce ? 0 : 700);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setShown(n => n + 1), Math.max(40, Math.min(320, Math.round(ANIMATION_TOTAL_MS / total))));
    return () => window.clearTimeout(id);
  }, [phase, run, shown]);

  useEffect(() => { if (phase === 'done') resultRef.current?.focus({ preventScroll: false }); }, [phase]);

  // 지금까지 보여 준 공격을 반영한 체력
  const hpNow = useMemo(() => {
    if (!run) return null;
    const hp = { A: run.teamA.map(f => f.hp), B: run.teamB.map(f => f.hp) };
    for (const s of run.result.rounds.slice(0, shown)) hp[s.target.side][s.target.index] = s.targetHpAfter;
    return hp;
  }, [run, shown]);
  const lastStep = run && phase === 'fight' && shown > 0 ? run.result.rounds[shown - 1] : null;   // 싸우는 동안만 방금 맞은 사람을 표시

  return (
    <>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pt-0.5 pb-4">
        {phase === 'ready' && (
          <>
            <section className="rounded-[18px] bg-linear-135 from-[#ff7a6b] to-[#c8364a] px-3.5 pt-3.5 pb-3 text-white shadow-[0_6px_16px_rgba(200,54,74,.3)]">
              <h3 className="flex items-center gap-1.5 text-base font-extrabold">
                <Icon name="i-swords" className="size-[18px]" />{kind === 'pvp' ? `${foe?.name ?? '상대'}님과 3 대 3 대전` : `${DEMO_ENEMY_CLAN}과 클랜전`}
              </h3>
              <p className="mt-0.5 text-xs opacity-85">
                {kind === 'pvp'
                  ? '지면 장착하지 않은 아이템 하나를 빼앗길 수 있어요. 이기면 상대 아이템 하나를 가져와요'
                  : '이기면 클랜 골드 +100 · 경험치 +30, 지면 평판 -5예요. 아이템도 걸려 있어요'}
              </p>
            </section>
            <p className="rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-[11px] font-bold text-(--ink-2)">
              예시 상대예요. 상대와 아군의 레벨은 내 레벨에 맞춰 조정돼요. 진짜 친구가 연결되면 실제 펫으로 바뀌어요
            </p>

            <h4 className="mt-1 flex items-center justify-between text-[13px] font-extrabold">
              <span className={`flex items-center gap-1 ${MY_COLOR}`}><Icon name="i-shield" className="size-3.5" />우리 팀</span>
              <span className="text-[11px] font-bold text-(--ink-2)">아군 {picked.length}/{need}명 고르기</span>
            </h4>
            <ul className="flex flex-col gap-1.5">
              <FighterRow look={{ name: `${pet.name} (나)`, level: pet.level, cfg: game.cfg }} atk={game.power} def={game.def} hp={game.hp} maxHp={game.maxHp} />
              {cands.map(c => {
                const on = picked.includes(c.id);
                const f = demoFighter(c, 1).fighter;
                return (
                  <li key={c.id}>
                    <button onClick={() => toggle(c.id)} aria-pressed={on} aria-label={`아군 ${c.name} ${on ? '빼기' : '넣기'}`}
                      className={`flex w-full items-center gap-2 rounded-xl bg-(--card) p-2 text-left shadow-[0_2px_8px_rgba(0,0,0,.12)] transition-[transform,box-shadow] active:scale-98 ${on ? 'shadow-[0_0_0_2px_var(--primary)]' : 'opacity-80'}`}>
                      <Avatar cfg={c.cfg} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-extrabold">{c.name} <small className="text-[11px] font-bold text-(--ink-2)">Lv.{c.level}</small></span>
                        <Stats atk={f.atk} def={f.def} hp={f.maxHp} />
                      </span>
                      <span aria-hidden="true" className={`grid size-5 flex-none place-items-center rounded-full border-2 text-[11px] font-black ${on ? 'border-(--primary) bg-(--primary) text-white' : 'border-(--ink-2) text-transparent'}`}>✓</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <h4 className={`mt-1 flex items-center gap-1 text-[13px] font-extrabold ${FOE_COLOR}`}><Icon name="i-swords" className="size-3.5" />상대 팀</h4>
            <ul className="flex flex-col gap-1.5">
              {enemies.map(e => <FighterRow key={e.id} look={e} atk={e.fighter.atk} def={e.fighter.def} hp={e.fighter.hp} maxHp={e.fighter.maxHp} />)}
            </ul>

            <div className="mt-1 flex items-center gap-2 rounded-[14px] bg-(--chip-bg) px-3.5 py-2.5 text-xs font-bold">
              <Icon name="i-star" className="size-4 flex-none text-[#e0950e]" />
              <span>예상 승률 <b className="text-sm font-black tabular-nums">약 {winRate}%</b> <small className="font-semibold text-(--ink-2)">(참고용)</small></span>
            </div>
            {game.hp < game.maxHp * 0.3 && (
              <p className="rounded-[14px] bg-[rgba(255,93,108,.15)] px-3.5 py-2.5 text-xs font-bold text-[#ff8791]">
                체력이 {game.hp}/{game.maxHp} 밖에 안 남았어요. 상점에서 물약을 사서 회복하고 오면 유리해요
              </p>
            )}
          </>
        )}

        {phase !== 'ready' && run && hpNow && (
          <>
            <TeamBoard title="우리 팀" tone={MY_COLOR} looks={run.looksA} fighters={run.teamA} hp={hpNow.A}
              hit={lastStep?.target.side === 'A' ? lastStep : null} shown={shown} />
            <TeamBoard title="상대 팀" tone={FOE_COLOR} looks={run.looksB} fighters={run.teamB} hp={hpNow.B}
              hit={lastStep?.target.side === 'B' ? lastStep : null} shown={shown} />
            {phase === 'fight' && (
              <ol aria-hidden="true" className="flex flex-col gap-1 rounded-xl bg-(--chip-bg) p-2.5 text-xs font-semibold text-(--ink-2)">
                {shown === 0 && <li>전투 시작!</li>}
                {run.result.rounds.slice(Math.max(0, shown - 5), shown).map((s, i, arr) => (
                  <li key={s.round + '-' + (shown - arr.length + i)} className={i === arr.length - 1 ? 'font-extrabold text-(--ink)' : ''}>
                    <span className="mr-1 tabular-nums opacity-70">{s.round}R</span>
                    <b className={s.attacker.side === 'A' ? MY_COLOR : FOE_COLOR}>{s.attacker.name}</b> → <b className={s.target.side === 'A' ? MY_COLOR : FOE_COLOR}>{s.target.name}</b>{' '}
                    <span className="font-extrabold text-[#ff5d6c]">-{s.dmg}</span>{s.targetHpAfter === 0 && ' 쓰러졌어요!'}
                  </li>
                ))}
              </ol>
            )}
            {phase === 'done' && <ResultCard run={run} kind={kind} foe={foe} refEl={resultRef} />}
          </>
        )}
      </div>

      <footer className="flex gap-2 border-t border-(--chip-bg) px-4 pt-3 pb-4">
        {phase === 'ready' && (
          <button onClick={start} disabled={picked.length < need}
            className="flex h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(255,93,108,.3)] transition-transform active:scale-97 disabled:bg-(--chip-bg) disabled:text-(--ink-2) disabled:shadow-none">
            <Icon name="i-swords" className="size-[18px]" />{kind === 'pvp' ? '대전 시작' : '클랜전 시작'}
            {cost > 0 ? <span className="flex items-center gap-0.5 text-[13px]"><Icon name="i-coin" className="size-3.5 stroke-[2.4]!" />{cost}</span> : <small className="text-xs font-bold opacity-85">무료</small>}
          </button>
        )}
        {phase === 'fight' && run && (
          <button autoFocus onClick={() => setShown(run.result.rounds.length)}
            className="h-[46px] flex-1 rounded-[14px] bg-(--chip-bg) text-[15px] font-extrabold text-(--ink) transition-transform active:scale-97">건너뛰기</button>
        )}
        {phase === 'done' && (
          <button autoFocus onClick={close}
            className="h-[46px] flex-1 rounded-[14px] bg-(--primary) text-[15px] font-extrabold text-white shadow-[0_6px_14px_rgba(255,93,108,.3)] transition-transform active:scale-97">닫기</button>
        )}
      </footer>
    </>
  );
}

// 받침이 있으면 '을', 없으면 '를' (한글이 아니면 '을(를)')
function eulReul(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code < 0 || code > 11171 ? '을(를)' : code % 28 === 0 ? '를' : '을';
}

function Avatar({ cfg }: { cfg: CharConfig }) {
  return (
    <span className="size-9 flex-none overflow-hidden rounded-full bg-linear-135 from-[#ffe1ec] to-[#e4dcff]">
      <Character cfg={cfg} headOnly viewBox="40 26 120 120" className="size-full" />
    </span>
  );
}

function Stats({ atk, def, hp }: { atk: number; def: number; hp: string | number }) {
  return (
    <span className="mt-0.5 flex flex-wrap gap-x-2 text-[10.5px] font-bold text-(--ink-2) tabular-nums">
      <span className="inline-flex items-center gap-[3px]"><Icon name="i-sword" className="size-3" />{atk}</span>
      <span className="inline-flex items-center gap-[3px]"><Icon name="i-shield" className="size-3" />{def}</span>
      <span className="inline-flex items-center gap-[3px]"><Icon name="i-heart" className="size-3" />{hp}</span>
    </span>
  );
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  return (
    <span className="mt-1 block h-1.5 overflow-hidden rounded-[3px] bg-(--track)">
      <i className="block h-full rounded-[inherit] bg-linear-90 from-[#ff5d6c] to-[#ff9f4a] transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, max > 0 ? hp / max * 100 : 0))}%` }} />
    </span>
  );
}

// 준비 화면의 사람 한 줄 (전투력·방어력·체력 표시)
function FighterRow({ look, atk, def, hp, maxHp }: { look: Looks; atk: number; def: number; hp: number; maxHp: number }) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-(--card) p-2 shadow-[0_2px_8px_rgba(0,0,0,.12)]">
      <Avatar cfg={look.cfg} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-extrabold">{look.name} <small className="text-[11px] font-bold text-(--ink-2)">Lv.{look.level}</small></span>
        <Stats atk={atk} def={def} hp={hp < maxHp ? `${hp}/${maxHp}` : maxHp} />
        {hp < maxHp && <HpBar hp={hp} max={maxHp} />}
      </span>
    </li>
  );
}

// 싸우는 중·끝난 뒤의 한 팀: 사람마다 체력 바. 방금 맞은 사람은 흔들리고 피해량이 뜬다
function TeamBoard({ title, tone, looks, fighters, hp, hit, shown }: {
  title: string; tone: string; looks: Looks[]; fighters: Fighter[]; hp: number[];
  hit: { target: { index: number }; dmg: number } | null; shown: number;
}) {
  return (
    <section>
      <h4 className={`mb-1.5 text-[13px] font-extrabold ${tone}`}>{title}</h4>
      <ul className="flex flex-col gap-1.5">
        {looks.map((l, i) => {
          const dead = hp[i] <= 0;
          const hurt = hit?.target.index === i ? hit : null;
          return (
            <li key={i} className={`flex items-center gap-2 rounded-xl bg-(--card) p-2 shadow-[0_2px_8px_rgba(0,0,0,.12)] transition-opacity ${dead ? 'opacity-45 grayscale' : ''}`}>
              <span key={hurt ? shown : 'idle'} className={`flex flex-none ${hurt ? 'animate-shake' : ''}`}><Avatar cfg={l.cfg} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1 text-[13px] font-extrabold">
                  <span className="truncate">{l.name}</span><small className="flex-none text-[11px] font-bold text-(--ink-2)">Lv.{l.level}</small>
                  {hurt && <em className="ml-auto flex-none text-xs font-black text-[#ff5d6c] not-italic">-{hurt.dmg}</em>}
                </span>
                <HpBar hp={hp[i]} max={fighters[i].maxHp} />
              </span>
              <b className="w-[54px] flex-none text-right text-[11px] font-extrabold tabular-nums">{hp[i]}<small className="font-bold text-(--ink-2)">/{fighters[i].maxHp}</small></b>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ResultCard({ run, kind, foe, refEl }: { run: Run; kind: BattleKind; foe: WarMember | null; refEl: React.RefObject<HTMLElement | null> }) {
  const game = useGame();
  const { win, outcome, result } = run;
  const { reward, plunder } = outcome;
  const how = result.endedBy === 'roundCap'
    ? `${WAR_RULES.battle.maxRounds}라운드가 끝나 남은 체력으로 가렸어요`
    : win ? '상대 팀을 모두 쓰러뜨렸어요' : '우리 팀이 모두 쓰러졌어요';
  const rows: { label: string; value: string; tone?: string }[] = [];
  if (outcome.cost > 0) rows.push({ label: '캐시', value: `-${outcome.cost}` });
  if (reward.exp > 0) rows.push({ label: '경험치', value: `+${reward.exp}` });
  if (reward.gold !== 0) rows.push({ label: '클랜 골드', value: `+${reward.gold}`, tone: 'text-[#5fd3b5]' });
  if (reward.reputation !== 0) rows.push({ label: '평판', value: `${reward.reputation > 0 ? '+' : ''}${reward.reputation}`, tone: reward.reputation < 0 ? 'text-[#ff8791]' : 'text-[#5fd3b5]' });

  return (
    <section ref={refEl} tabIndex={-1} role="status" className="rounded-2xl bg-(--card) p-3.5 shadow-[0_2px_10px_rgba(0,0,0,.18)] outline-none">
      <h3 className={`text-xl font-black ${win ? 'text-[#5fd3b5]' : 'text-[#ff8791]'}`}>{win ? '승리!' : '패배'}</h3>
      <p className="mt-0.5 text-xs font-semibold text-(--ink-2)">{kind === 'clanwar' ? DEMO_ENEMY_CLAN : `${foe?.name ?? '상대'}님 팀`} · {result.roundCount}라운드 · {how}</p>

      {rows.length > 0 && (
        <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
          {rows.map(r => (
            <div key={r.label} className="rounded-[10px] bg-(--chip-bg) px-2.5 py-1.5">
              <dt className="text-[10px] font-bold text-(--ink-2)">{r.label}</dt>
              <dd className={`text-sm font-extrabold tabular-nums ${r.tone ?? ''}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {outcome.levelUp > 0 && (
        <p className="mt-2 rounded-[10px] bg-[rgba(255,210,31,.15)] px-3 py-2 text-[13px] font-extrabold text-[#ffd21f]">레벨 업! Lv.{outcome.levelUp}</p>
      )}

      <p className="mt-2.5 flex items-start gap-1.5 rounded-[10px] bg-(--chip-bg) px-3 py-2 text-[13px] font-bold">
        <Icon name="i-gift" className="mt-px size-4 flex-none" />
        <span>
          {plunder?.type === 'got' ? <>{plunder.who}에게서 <b className="font-extrabold text-[#ffd21f]">{plunder.item}</b>{eulReul(plunder.item)} 빼앗았어요</>
            : plunder?.type === 'lost' ? <>{plunder.who}에게 <b className="font-extrabold text-[#ff8791]">{plunder.item}</b>{eulReul(plunder.item)} 빼앗겼어요</>
              : win ? '빼앗을 아이템이 없어요' : '빼앗길 아이템이 없었어요'}
        </span>
      </p>

      <div className="mt-2.5">
        <div className="flex justify-between text-[11px] font-bold text-(--ink-2)"><span>내 체력</span><b className="text-(--ink) tabular-nums">{outcome.hpAfter} / {game.maxHp}</b></div>
        <HpBar hp={outcome.hpAfter} max={game.maxHp} />
      </div>
      {kind === 'pvp' && <p className="mt-2.5 text-[11px] font-semibold text-(--ink-2)">다음 대전은 {formatRemaining(WAR_RULES.pvp.cooldownMs)} 뒤에 할 수 있어요</p>}
      {kind === 'clanwar' && <p className="mt-2.5 text-[11px] font-semibold text-(--ink-2)">클랜전은 하루에 한 번이에요. 내일 저녁 8시에 다시 열려요</p>}
    </section>
  );
}
