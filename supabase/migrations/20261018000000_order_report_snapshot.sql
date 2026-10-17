-- =============================================================================
-- 프리미엄 리포트 고정: 주문 시점의 분석 결과(사주·용신·격국·점수·풀이)를 주문에 저장
-- 이미 운영 중인 DB에는 이 파일만 SQL Editor 에서 실행하면 됩니다. (여러 번 실행해도 안전)
-- 같은 내용이 supabase/schema.sql 의 5번 섹션(orders)에도 들어 있습니다.
--
-- 값은 lib/commerce/report-snapshot.ts 의 ReportSnapshot. 주문 생성(service_role) 때 한 번만 넣고,
-- 한 번 들어간 값은 트리거로 바꾸거나 지울 수 없다 (엔진이 바뀌어도 결제한 리포트는 그대로).
-- =============================================================================

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
