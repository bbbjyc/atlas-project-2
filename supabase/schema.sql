-- 설계 ⑥ 단계에서 @docs/plan.md 를 보고 AI가 생성 -> 팀장이 Supabase SQL Editor에서 실행
-- 규칙: RLS 켜기, 읽기·추가만 허용(수정/삭제 X). 테이블 변경은 plan.md 먼저 수정 후 여기에 추가.

-- clans: 클랜 하나당 한 줄
create table public.clans (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null
);

-- players: 플레이어 한 명당 한 줄
create table public.players (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  nickname text not null,
  invite_code text not null unique,
  invited_by_id bigint references public.players (id),
  clan_id bigint not null references public.clans (id)
);

-- care_logs: 내 펫 돌봄 한 번당 한 줄
create table public.care_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  player_id bigint not null references public.players (id),
  action_type text not null check (action_type in ('feed', 'clean', 'shower'))
);

-- style_logs: 꾸미기를 바꿀 때마다 한 줄 (가장 최근 행이 현재 상태)
create table public.style_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  player_id bigint not null references public.players (id),
  outfit text not null,
  background_color text not null
);

-- visit_logs: 친구 집 방문·선물 한 번당 한 줄
create table public.visit_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id bigint not null references public.players (id),
  host_id bigint not null references public.players (id),
  action_type text not null check (action_type in ('visit', 'feed', 'clean', 'shower'))
);

-- battle_logs: 대전 한 판당 한 줄
create table public.battle_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  attacker_id bigint not null references public.players (id),
  defender_id bigint not null references public.players (id),
  winner_id bigint not null references public.players (id),
  clan_id bigint not null references public.clans (id)
);

-- cash_logs: 캐시가 늘거나 줄 때마다 한 줄 (잔액은 amount 합계로 계산)
create table public.cash_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  player_id bigint not null references public.players (id),
  amount integer not null,
  reason text not null check (reason in ('mission', 'purchase', 'feed', 'clean', 'shower', 'heal', 'gift', 'battle', 'buy_item')),
  item text
);

-- fake_door_logs: 충전 팝업 노출 또는 금액 클릭 한 번당 한 줄
create table public.fake_door_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  player_id bigint not null references public.players (id),
  event_type text not null check (event_type in ('popup_shown', 'tier_clicked')),
  tier text,
  shortage_reason text not null check (shortage_reason in ('feed', 'clean', 'shower', 'heal', 'gift', 'battle', 'buy_item'))
);

-- RLS: 모든 테이블에서 읽기·추가만 허용 (정책이 없는 수정·삭제는 막힌다)
alter table public.clans enable row level security;
alter table public.players enable row level security;
alter table public.care_logs enable row level security;
alter table public.style_logs enable row level security;
alter table public.visit_logs enable row level security;
alter table public.battle_logs enable row level security;
alter table public.cash_logs enable row level security;
alter table public.fake_door_logs enable row level security;

create policy "clans_select" on public.clans for select to anon, authenticated using (true);
create policy "clans_insert" on public.clans for insert to anon, authenticated with check (true);

create policy "players_select" on public.players for select to anon, authenticated using (true);
create policy "players_insert" on public.players for insert to anon, authenticated with check (true);

create policy "care_logs_select" on public.care_logs for select to anon, authenticated using (true);
create policy "care_logs_insert" on public.care_logs for insert to anon, authenticated with check (true);

create policy "style_logs_select" on public.style_logs for select to anon, authenticated using (true);
create policy "style_logs_insert" on public.style_logs for insert to anon, authenticated with check (true);

create policy "visit_logs_select" on public.visit_logs for select to anon, authenticated using (true);
create policy "visit_logs_insert" on public.visit_logs for insert to anon, authenticated with check (true);

create policy "battle_logs_select" on public.battle_logs for select to anon, authenticated using (true);
create policy "battle_logs_insert" on public.battle_logs for insert to anon, authenticated with check (true);

create policy "cash_logs_select" on public.cash_logs for select to anon, authenticated using (true);
create policy "cash_logs_insert" on public.cash_logs for insert to anon, authenticated with check (true);

create policy "fake_door_logs_select" on public.fake_door_logs for select to anon, authenticated using (true);
create policy "fake_door_logs_insert" on public.fake_door_logs for insert to anon, authenticated with check (true);

-- 변경 1 (plan.md 반영): 화면의 재우기·놀기를 위해 care_logs.action_type 에 sleep, play 추가
-- 이미 위 테이블을 실행한 DB는 아래 "변경" 블록만 따로 실행한다 (여러 번 실행해도 안전).
alter table public.care_logs drop constraint if exists care_logs_action_type_check;
alter table public.care_logs
  add constraint care_logs_action_type_check
  check (action_type in ('feed', 'clean', 'shower', 'sleep', 'play'));

-- 변경 2 (plan.md 반영): 산 아이템의 종류를 구분하기 위해 cash_logs.item_type 추가
alter table public.cash_logs add column if not exists item_type text;
alter table public.cash_logs drop constraint if exists cash_logs_item_type_check;
alter table public.cash_logs
  add constraint cash_logs_item_type_check
  check (item_type in ('outfit', 'background', 'furniture'));

-- 변경 3 (plan.md 반영): 배치한 가구를 저장하기 위해 style_logs.furniture 추가 (가구 id를 쉼표로 이은 값)
alter table public.style_logs add column if not exists furniture text;

-- 변경 4 (plan.md 반영): 잠들었다 깨우는 행동 wake 추가 (변경 1을 대체해 다시 만든다. 여러 번 실행해도 안전)
alter table public.care_logs drop constraint if exists care_logs_action_type_check;
alter table public.care_logs
  add constraint care_logs_action_type_check
  check (action_type in ('feed', 'clean', 'shower', 'sleep', 'wake', 'play'));

-- 변경 5 (plan.md 반영): 상점 아이템 종류에 food / weapon / armor / potion 추가 (변경 2를 대체)
alter table public.cash_logs drop constraint if exists cash_logs_item_type_check;
alter table public.cash_logs
  add constraint cash_logs_item_type_check
  check (item_type in ('outfit', 'background', 'furniture', 'food', 'weapon', 'armor', 'potion'));

-- 변경 6 (plan.md 반영): 자동으로 차는 캐시 reason 'recovery' 추가
alter table public.cash_logs drop constraint if exists cash_logs_reason_check;
alter table public.cash_logs
  add constraint cash_logs_reason_check
  check (reason in ('mission', 'recovery', 'purchase', 'feed', 'clean', 'shower', 'heal', 'gift', 'battle', 'buy_item'));

-- 변경 7 (plan.md 반영): 상점 "충전" 버튼으로 직접 연 팝업을 구분하는 shortage_reason 'topup_button' 추가
alter table public.fake_door_logs drop constraint if exists fake_door_logs_shortage_reason_check;
alter table public.fake_door_logs
  add constraint fake_door_logs_shortage_reason_check
  check (shortage_reason in ('feed', 'clean', 'shower', 'heal', 'gift', 'battle', 'buy_item', 'topup_button'));

-- 변경 8 (plan.md 반영): 미션 보상·시작 캐시를 플레이어당 한 번만 받게 한다 (item = 'mission:<id>')
create unique index if not exists cash_logs_mission_once
  on public.cash_logs (player_id, item)
  where reason = 'mission';

-- 변경 9 (plan.md 반영): 로그인 계정과 플레이어를 잇는다 (계정 하나에 플레이어 하나)
-- auth.users 는 Supabase Auth 가 관리하는 계정 표이고, 계정이 지워지면 연결만 끊는다.
alter table public.players
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;
create unique index if not exists players_auth_user_id_key
  on public.players (auth_user_id)
  where auth_user_id is not null;

-- 변경 10 (plan.md 반영): 친구 요청·수락·거절·삭제를 한 줄씩 쌓는 friendships 테이블 (쌍마다 가장 최근 행이 현재 상태)
create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  from_player_id bigint not null references public.players (id),
  to_player_id bigint not null references public.players (id),
  status text not null check (status in ('request', 'accept', 'decline', 'remove')),
  check (from_player_id <> to_player_id)
);
create index if not exists friendships_from_idx on public.friendships (from_player_id);
create index if not exists friendships_to_idx on public.friendships (to_player_id);

alter table public.friendships enable row level security;
drop policy if exists "friendships_select" on public.friendships;
drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_select" on public.friendships for select to anon, authenticated using (true);
create policy "friendships_insert" on public.friendships for insert to anon, authenticated with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2단계 (지금은 실행하지 않는다! 앱에서 로그인·가입이 잘 되는 것을 확인한 뒤에만 한 번에 실행)
-- 하는 일: 읽기·추가는 로그인한 사람만, 추가는 "내 player_id"로만 허용한다.
-- 이걸 실행하면 로그인하지 않은 상태(옛 브라우저 id 방식)로는 저장이 안 되니 순서를 꼭 지킨다.
-- 아래 줄 맨 앞의 "-- " 를 지우고 실행한다.
-- ─────────────────────────────────────────────────────────────────────────────
-- create or replace function public.my_player_id() returns bigint
--   language sql stable security definer set search_path = public
--   as $$ select id from public.players where auth_user_id = auth.uid() limit 1 $$;
--
-- drop policy if exists "clans_select" on public.clans;
-- drop policy if exists "clans_insert" on public.clans;
-- create policy "clans_select" on public.clans for select to authenticated using (true);
-- create policy "clans_insert" on public.clans for insert to authenticated with check (true);
--
-- drop policy if exists "players_select" on public.players;
-- drop policy if exists "players_insert" on public.players;
-- create policy "players_select" on public.players for select to authenticated using (true);
-- create policy "players_insert" on public.players for insert to authenticated with check (auth_user_id = auth.uid());
--
-- drop policy if exists "care_logs_select" on public.care_logs;
-- drop policy if exists "care_logs_insert" on public.care_logs;
-- create policy "care_logs_select" on public.care_logs for select to authenticated using (true);
-- create policy "care_logs_insert" on public.care_logs for insert to authenticated with check (player_id = public.my_player_id());
--
-- drop policy if exists "style_logs_select" on public.style_logs;
-- drop policy if exists "style_logs_insert" on public.style_logs;
-- create policy "style_logs_select" on public.style_logs for select to authenticated using (true);
-- create policy "style_logs_insert" on public.style_logs for insert to authenticated with check (player_id = public.my_player_id());
--
-- drop policy if exists "visit_logs_select" on public.visit_logs;
-- drop policy if exists "visit_logs_insert" on public.visit_logs;
-- create policy "visit_logs_select" on public.visit_logs for select to authenticated using (true);
-- create policy "visit_logs_insert" on public.visit_logs for insert to authenticated with check (visitor_id = public.my_player_id());
--
-- drop policy if exists "battle_logs_select" on public.battle_logs;
-- drop policy if exists "battle_logs_insert" on public.battle_logs;
-- create policy "battle_logs_select" on public.battle_logs for select to authenticated using (true);
-- create policy "battle_logs_insert" on public.battle_logs for insert to authenticated with check (attacker_id = public.my_player_id());
--
-- drop policy if exists "cash_logs_select" on public.cash_logs;
-- drop policy if exists "cash_logs_insert" on public.cash_logs;
-- create policy "cash_logs_select" on public.cash_logs for select to authenticated using (true);
-- create policy "cash_logs_insert" on public.cash_logs for insert to authenticated with check (player_id = public.my_player_id());
--
-- drop policy if exists "fake_door_logs_select" on public.fake_door_logs;
-- drop policy if exists "fake_door_logs_insert" on public.fake_door_logs;
-- create policy "fake_door_logs_select" on public.fake_door_logs for select to authenticated using (true);
-- create policy "fake_door_logs_insert" on public.fake_door_logs for insert to authenticated with check (player_id = public.my_player_id());
--
-- drop policy if exists "friendships_select" on public.friendships;
-- drop policy if exists "friendships_insert" on public.friendships;
-- create policy "friendships_select" on public.friendships for select to authenticated using (true);
-- create policy "friendships_insert" on public.friendships for insert to authenticated with check (from_player_id = public.my_player_id());
