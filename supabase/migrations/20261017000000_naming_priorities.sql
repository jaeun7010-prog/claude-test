-- =============================================================================
-- 작명 결과 "우리 집 우선순위" 저장용 컬럼
-- 이미 운영 중인 DB에는 이 파일만 SQL Editor 에서 실행하면 됩니다. (여러 번 실행해도 안전)
-- 같은 내용이 supabase/schema.sql 의 1번 섹션(profiles)에도 들어 있습니다.
--
-- 값 예: {"rare":"very","global":"important","sort":"custom"}
-- 본인 행 수정은 기존 정책 profiles_update_own 으로 허용됩니다.
-- =============================================================================

alter table public.profiles add column if not exists naming_priorities jsonb;

comment on column public.profiles.naming_priorities is
  '작명 결과 우선순위 (희귀한 이름/글로벌 발음 친화 단계와 정렬 기준). lib/naming/priorities.ts 참고';
