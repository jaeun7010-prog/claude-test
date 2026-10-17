-- =============================================================================
-- 이름핏 (NameFit) - Supabase DB 스키마
-- Supabase SQL Editor 에서 전체 실행하거나 `supabase db push` 로 적용합니다.
-- 여러 번 실행해도 안전하도록 idempotent 하게 작성되어 있습니다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 공통
-- -----------------------------------------------------------------------------

-- 오행 (木火土金水)
do $$ begin
  create type public.five_element as enum ('목', '화', '토', '금', '수');
exception when duplicate_object then null; end $$;

-- 주문 상태
do $$ begin
  create type public.order_status as enum (
    'pending',    -- 주문 생성, 결제 대기
    'paid',       -- 결제 완료
    'preparing',  -- 상품 제작/준비 중
    'shipped',    -- 배송 중
    'delivered',  -- 배송 완료
    'cancelled',  -- 취소
    'refunded'    -- 환불
  );
exception when duplicate_object then null; end $$;

-- 주문 종류
do $$ begin
  create type public.order_type as enum (
    'premium_report',  -- 프리미엄 PDF 리포트
    'goods'            -- 사주 맞춤 자수 굿즈 (턱받이, 손수건 등)
  );
exception when duplicate_object then null; end $$;

-- updated_at 자동 갱신 트리거 함수
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. profiles : 유저 정보 (auth.users 1:1)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 작명 결과 "우리 집 우선순위" (supabase/migrations/20261017000000_naming_priorities.sql 과 같은 내용)
alter table public.profiles add column if not exists naming_priorities jsonb;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 회원가입 시 profiles 행 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. hanja_dict : 한자 사전 (성명학 엔진용 참조 데이터)
-- -----------------------------------------------------------------------------
create table if not exists public.hanja_dict (
  id               bigint generated always as identity primary key,
  hanja            text not null,                       -- 한자 (예: 賢)
  eum              text not null,                       -- 음 (예: 현)
  meaning          text,                                -- 뜻 (예: 어질다)
  stroke_count     smallint not null check (stroke_count > 0),  -- 획수 (원획/수리 기준)
  radical          text,                                -- 부수
  element          public.five_element,                 -- 자원오행
  is_forbidden     boolean not null default false,      -- 불용한자 여부
  forbidden_reason text,                                -- 불용 사유
  is_name_hanja    boolean not null default true,       -- 인명용 한자 여부
  created_at       timestamptz not null default now(),
  unique (hanja, eum)
);

-- 한문 교육용 기초 한자(1,800자) 여부: 널리 알려진 글자를 우선 추천하는 데 사용
alter table public.hanja_dict add column if not exists is_edu boolean not null default false;

-- 한글 훈 (예: 金 → 쇠). 값은 supabase/seed/hanja_hun_NN.sql 로 채웁니다.
alter table public.hanja_dict add column if not exists hun text;

create index if not exists hanja_dict_eum_idx     on public.hanja_dict (eum);
create index if not exists hanja_dict_element_idx on public.hanja_dict (element);
create index if not exists hanja_dict_usable_idx  on public.hanja_dict (eum, element)
  where is_forbidden = false and is_name_hanja = true;

-- -----------------------------------------------------------------------------
-- 3. name_stats / data_snapshots : 이름 출생신고 통계 (희소성) 와 데이터 기준일
--    (supabase/migrations/20261011000000_name_stats_snapshots.sql 과 같은 내용. RLS 포함)
-- -----------------------------------------------------------------------------

-- ---- admin_users : 관리자 목록 ----
-- 정책을 두지 않으므로 클라이언트에서는 읽기/쓰기 모두 불가능합니다.
-- 관리자 지정은 SQL Editor(또는 service_role)에서만 합니다.
create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- 현재 로그인한 사용자가 관리자인가 (RLS 정책과 서버 코드에서 사용)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

-- ---- data_snapshots : 통계 반영 이력 (기준일·출처) ----
create table if not exists public.data_snapshots (
  id           bigint generated always as identity primary key,
  as_of_date   date not null,                           -- 데이터 기준일
  source_name  text not null,                           -- 출처명
  uploaded_at  timestamptz not null default now(),
  uploaded_by  uuid references auth.users (id) on delete set null,
  row_count    integer not null check (row_count >= 0)
);

create index if not exists data_snapshots_as_of_idx
  on public.data_snapshots (as_of_date desc, uploaded_at desc);

-- ---- name_stats : 한글 이름 · 연도 · 성별별 출생신고 건수 (전국 기준) ----
-- 이전 버전(이름·연도 한 행에 남/여 인원을 함께 저장)이면 값을 옮겨 두고 테이블을 새로 만든다.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'name_stats' and column_name = 'male_count'
  ) then
    create table public.name_stats_legacy as
      select name, year, male_count, female_count from public.name_stats;
    drop table public.name_stats cascade;
  end if;
end $$;

create table if not exists public.name_stats (
  id           bigint generated always as identity primary key,
  name         text not null,                           -- 한글 이름 (성 제외, 예: 서윤)
  year         smallint not null check (year between 1900 and 2100),
  gender       text not null check (gender in ('male', 'female')),
  birth_count  integer not null check (birth_count >= 0),  -- 출생신고 건수
  snapshot_id  bigint references public.data_snapshots (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (name, year, gender)
);

create index if not exists name_stats_year_idx on public.name_stats (year);

do $$ begin
  if to_regclass('public.name_stats_legacy') is not null then
    insert into public.name_stats (name, year, gender, birth_count)
    select l.name, l.year, v.gender, v.birth_count
    from public.name_stats_legacy l
    cross join lateral (values ('male', l.male_count), ('female', l.female_count)) as v (gender, birth_count)
    where v.birth_count > 0
    on conflict (name, year, gender) do nothing;
    drop table public.name_stats_legacy;
  end if;
end $$;

-- ---- 뷰 ----
drop view if exists public.name_stats_year_summary;
drop view if exists public.name_stats_yearly;
drop view if exists public.name_stats_cumulative;
drop view if exists public.data_snapshot_latest;

-- 이름·연도별 남/여 합계
create view public.name_stats_yearly
with (security_invoker = true) as
select
  name,
  year,
  coalesce(sum(birth_count) filter (where gender = 'male'), 0)::integer   as male_count,
  coalesce(sum(birth_count) filter (where gender = 'female'), 0)::integer as female_count,
  sum(birth_count)::integer                                               as total_count
from public.name_stats
group by name, year;

-- 연도별 집계: 통계는 성별마다 "상위 N개 이름"만 공개되므로, 목록에 없는 이름은 0명이 아니라
-- "성별 목록 최소 건수의 합 미만"이다. min_listed 가 그 상한이다.
create view public.name_stats_year_summary
with (security_invoker = true) as
with g as (
  select year, gender, min(birth_count) as min_count
  from public.name_stats
  group by year, gender
)
select
  g.year,
  sum(g.min_count)::integer as min_listed,
  (select count(distinct s.name) from public.name_stats s where s.year = g.year)::integer as names
from g
group by g.year;

-- 이름별 누적 합계 (적재된 전체 연도, 목록에 오른 해만 합산)
create view public.name_stats_cumulative
with (security_invoker = true) as
select
  name,
  coalesce(sum(birth_count) filter (where gender = 'male'), 0)::integer   as male_total,
  coalesce(sum(birth_count) filter (where gender = 'female'), 0)::integer as female_total,
  min(year) as first_year,
  max(year) as last_year
from public.name_stats
group by name;

-- 최신 기준일. 화면의 출처 표기에 쓰며, 업로드한 관리자 정보는 노출하지 않으려고
-- security_invoker 를 켜지 않은 뷰(소유자 권한)로 기준일과 출처명만 공개한다.
create view public.data_snapshot_latest as
select as_of_date, source_name
from public.data_snapshots
order by as_of_date desc, uploaded_at desc
limit 1;

grant select on public.name_stats_yearly       to anon, authenticated;
grant select on public.name_stats_year_summary to anon, authenticated;
grant select on public.name_stats_cumulative   to anon, authenticated;
grant select on public.data_snapshot_latest    to anon, authenticated;

-- ---- RLS : 통계는 누구나 읽기, 쓰기는 관리자만. 스냅샷 원본은 관리자만 ----
alter table public.name_stats     enable row level security;
alter table public.data_snapshots enable row level security;

drop policy if exists "name_stats_select_all" on public.name_stats;
create policy "name_stats_select_all" on public.name_stats
  for select to anon, authenticated
  using (true);

drop policy if exists "name_stats_admin_write" on public.name_stats;
create policy "name_stats_admin_write" on public.name_stats
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "data_snapshots_admin_all" on public.data_snapshots;
create policy "data_snapshots_admin_all" on public.data_snapshots
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---- 통계 반영 : 스냅샷 기록 + 해당 연도 통째 교체를 한 트랜잭션으로 ----
-- p_rows: [{"name":"서윤","year":2023,"gender":"female","count":1234}, ...]
-- 호출자 권한으로 실행되므로 위 RLS 정책이 그대로 적용된다.
create or replace function public.apply_name_stats_snapshot(
  p_as_of_date  date,
  p_source_name text,
  p_rows        jsonb
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_snapshot_id bigint;
  v_count       integer;
begin
  if not public.is_admin() then
    raise exception '관리자만 통계를 반영할 수 있습니다.' using errcode = '42501';
  end if;

  v_count := jsonb_array_length(p_rows);
  if v_count = 0 then
    raise exception '반영할 행이 없습니다.';
  end if;

  insert into public.data_snapshots (as_of_date, source_name, uploaded_by, row_count)
  values (p_as_of_date, p_source_name, auth.uid(), v_count)
  returning id into v_snapshot_id;

  -- 일부 이름만 덮어쓰면 "목록 밖" 상한이 왜곡되므로, 포함된 연도는 전부 지우고 다시 넣는다
  delete from public.name_stats
  where year in (
    select distinct (r ->> 'year')::smallint from jsonb_array_elements(p_rows) as r
  );

  insert into public.name_stats (name, year, gender, birth_count, snapshot_id)
  select r.name, r.year, r.gender, r.count, v_snapshot_id
  from jsonb_to_recordset(p_rows) as r (name text, year smallint, gender text, count integer);

  return v_snapshot_id;
end;
$$;

revoke execute on function public.apply_name_stats_snapshot(date, text, jsonb) from public, anon;
grant  execute on function public.apply_name_stats_snapshot(date, text, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. user_naming_history : 유저가 마이페이지에 저장한 작명 이력
-- -----------------------------------------------------------------------------
create table if not exists public.user_naming_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,

  -- 입력 정보
  surname         text not null,                        -- 성 (한글)
  surname_hanja   text,                                 -- 성 (한자)
  birth_datetime  timestamptz,                          -- 생년월일시 (사주 계산용)
  gender          text check (gender in ('male', 'female', 'neutral')),

  -- 결과 정보
  given_name      text not null,                        -- 이름 (한글)
  given_name_hanja text,                                -- 이름 (한자)
  total_score     numeric(5, 2),                        -- 종합 점수
  analysis        jsonb not null default '{}'::jsonb,   -- 오행/수리 81수/4격 등 상세 분석 결과
  filters         jsonb not null default '{}'::jsonb,   -- 적용한 필터 (돌림자, 외자, 젠더 뉴트럴 등)

  is_favorite     boolean not null default false,
  memo            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists user_naming_history_user_idx
  on public.user_naming_history (user_id, created_at desc);

drop trigger if exists user_naming_history_set_updated_at on public.user_naming_history;
create trigger user_naming_history_set_updated_at
  before update on public.user_naming_history
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. orders : 결제 내역 및 굿즈 주문
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  history_id       uuid references public.user_naming_history (id) on delete set null,

  order_type       public.order_type not null,
  status           public.order_status not null default 'pending',

  -- 상품 정보
  item_name        text not null,                       -- 주문명 (포트원 orderName)
  item_options     jsonb not null default '{}'::jsonb,  -- 굿즈 종류/자수 문구/사이즈 등
  quantity         integer not null default 1 check (quantity > 0),
  amount           integer not null check (amount >= 0),  -- 결제 금액 (KRW)

  -- 포트원 결제 정보 (서버에서 결제 검증 후에만 갱신)
  payment_id       text unique,                         -- 가맹점 결제 고유 ID (paymentId)
  portone_tx_id    text,                                -- 포트원 거래 ID
  paid_at          timestamptz,

  -- 배송 정보 (굿즈)
  recipient_name   text,
  recipient_phone  text,
  zipcode          text,
  address          text,
  address_detail   text,
  delivery_memo    text,
  tracking_number  text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists orders_user_idx   on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- 프리미엄 리포트 고정 (supabase/migrations/20261018000000_order_report_snapshot.sql 과 같은 내용)
alter table public.orders add column if not exists report_snapshot jsonb;
comment on column public.orders.report_snapshot is
  '프리미엄 리포트 고정 내용 (주문 시점 분석 결과). 한 번 저장하면 변경 불가. lib/commerce/report-snapshot.ts 참고';

create or replace function public.orders_freeze_report_snapshot()
returns trigger
language plpgsql
as $$
begin
  if old.report_snapshot is not null and new.report_snapshot is distinct from old.report_snapshot then
    raise exception 'orders.report_snapshot는 한 번 저장하면 바꿀 수 없습니다 (order %)', old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_freeze_report_snapshot on public.orders;
create trigger orders_freeze_report_snapshot
  before update on public.orders
  for each row execute function public.orders_freeze_report_snapshot();

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================
alter table public.profiles             enable row level security;
alter table public.hanja_dict           enable row level security;
alter table public.name_stats           enable row level security;
alter table public.user_naming_history  enable row level security;
alter table public.orders               enable row level security;

-- ---- profiles : 본인만 조회/수정 (생성은 트리거, 삭제는 auth.users cascade) ----
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---- hanja_dict : 참조 데이터. 누구나 읽기 가능, 쓰기는 service_role 만 ----
drop policy if exists "hanja_dict_select_all" on public.hanja_dict;
create policy "hanja_dict_select_all" on public.hanja_dict
  for select to anon, authenticated
  using (true);

-- ---- name_stats / data_snapshots / admin_users : 정책은 3번 섹션에 함께 정의되어 있습니다 ----

-- ---- user_naming_history : 본인 데이터만 CRUD ----
drop policy if exists "history_select_own" on public.user_naming_history;
create policy "history_select_own" on public.user_naming_history
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "history_insert_own" on public.user_naming_history;
create policy "history_insert_own" on public.user_naming_history
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "history_update_own" on public.user_naming_history;
create policy "history_update_own" on public.user_naming_history
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "history_delete_own" on public.user_naming_history;
create policy "history_delete_own" on public.user_naming_history
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---- orders : 본인 주문 조회만 가능 ----
-- 주문 생성(pending), 결제 확정(paid), 환불, 배송 상태 변경은 모두 서버(service_role)에서만 처리합니다.
-- 클라이언트(anon 키)에서 amount/item_options 를 임의로 정해 직접 insert 하면 결제 금액을 조작할 수 있으므로
-- insert/update/delete 정책은 두지 않습니다.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- 이전 버전에서 만들었던 클라이언트 insert 정책 제거 (여러 번 실행해도 안전)
drop policy if exists "orders_insert_own_pending" on public.orders;
