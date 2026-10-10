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

create index if not exists hanja_dict_eum_idx     on public.hanja_dict (eum);
create index if not exists hanja_dict_element_idx on public.hanja_dict (element);
create index if not exists hanja_dict_usable_idx  on public.hanja_dict (eum, element)
  where is_forbidden = false and is_name_hanja = true;

-- -----------------------------------------------------------------------------
-- 3. name_stats : 한글 이름별 연도별 출생 통계 (희소성)
-- -----------------------------------------------------------------------------
create table if not exists public.name_stats (
  id            bigint generated always as identity primary key,
  name          text not null,                          -- 한글 이름 (성 제외, 예: 서윤)
  year          smallint not null check (year between 1900 and 2100),
  total_count   integer  not null default 0 check (total_count >= 0),  -- 해당 연도 출생 인원
  male_count    integer  not null default 0 check (male_count >= 0),
  female_count  integer  not null default 0 check (female_count >= 0),
  -- 남아 비율 (0~1). 인원이 0이면 null
  male_ratio    numeric(5, 4) generated always as (
    case when male_count + female_count > 0
         then male_count::numeric / (male_count + female_count)
    end
  ) stored,
  created_at    timestamptz not null default now(),
  unique (name, year)
);

create index if not exists name_stats_name_idx on public.name_stats (name);
create index if not exists name_stats_year_idx on public.name_stats (year);

-- 연도별 집계: 통계가 "상위 N개 이름"만 공개되는 경우, 목록에 없는 이름은 0명이 아니라
-- "해당 연도 목록의 최소 인원 미만"이다. min_listed 가 그 상한이다.
create or replace view public.name_stats_year_summary
with (security_invoker = true) as
select
  year,
  min(total_count) as min_listed,
  count(*)         as names,
  sum(total_count) as listed_total
from public.name_stats
group by year;

grant select on public.name_stats_year_summary to anon, authenticated;

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

-- ---- name_stats : 공개 통계. 누구나 읽기 가능, 쓰기는 service_role 만 ----
drop policy if exists "name_stats_select_all" on public.name_stats;
create policy "name_stats_select_all" on public.name_stats
  for select to anon, authenticated
  using (true);

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

-- ---- orders : 본인 주문 조회 + 'pending' 상태로만 생성 가능 ----
-- 결제 확정(paid), 환불, 배송 상태 변경 등은 서버(service_role, 포트원 웹훅/검증 API)에서만 처리합니다.
-- 클라이언트에서 status/amount/payment_id 를 임의로 바꿀 수 없도록 update/delete 정책은 두지 않습니다.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "orders_insert_own_pending" on public.orders;
create policy "orders_insert_own_pending" on public.orders
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and payment_id is null
    and portone_tx_id is null
    and paid_at is null
  );
