-- =============================================================================
-- 이름 통계 구조 개편: 성별 단위 행 + 데이터 기준일(스냅샷) + 관리자 쓰기 권한
-- 이미 운영 중인 DB에는 이 파일만 SQL Editor 에서 실행하면 됩니다. (여러 번 실행해도 안전)
-- 같은 내용이 supabase/schema.sql 의 3번 섹션에도 들어 있습니다.
-- =============================================================================

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
