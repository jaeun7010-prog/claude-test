-- =============================================================================
-- 공유용 이름 카드 (/s/[id])
-- 이미 운영 중인 DB에는 이 파일만 SQL Editor 에서 실행하면 됩니다. (여러 번 실행해도 안전)
-- 같은 내용이 supabase/schema.sql 의 6번 섹션(name_shares)에도 들어 있습니다.
--
-- 이름과 뜻만 담는다. 생년월일·시각·출생지·성별·사주·점수는 넣지 않는다 (2026-10-25 사용자 결정).
-- 뜻·축원 문장은 서버가 확인한 이름·한자로 만들어 넣고(lib/share/name-share.ts), 한 번 넣은 줄은 바꾸지 않는다
-- (문구 표가 바뀌어도 이미 보낸 카드는 그대로).
-- 읽기·쓰기 모두 서버(service_role)에서만: 정책을 두지 않아 anon 키로 목록을 훑어볼 수 없다.
-- =============================================================================

create table if not exists public.name_shares (
  id               text primary key,                     -- 짧은 주소 (/s/<id>, 영문·숫자 8자)
  content_key      text not null unique,                 -- 같은 내용이면 같은 주소 (종류|성|이름|한자|부모 성 글자 수|축원)
  kind             text not null check (kind in ('hanja', 'native')),
  surname          text not null,                        -- 성 (한글)
  surname_hanja    text,                                 -- 성 (한자, 순우리말이면 null)
  given_name       text not null,                        -- 법적 이름 (한글, 부모 성 포함)
  given_name_hanja text,                                 -- 법적 이름 (한자, 순우리말이면 null)
  prefix_length    smallint not null default 0,          -- 이름 앞의 부모 성 글자 수 (부모 성 함께 쓰기)
  meaning          text not null,                        -- 카드 뜻 한 줄
  meaning_chars    text,                                 -- 한자 훈음 (霞(노을 하) + 潾(맑을 린)), 순우리말이면 null
  meaning_note     text,                                 -- 공유 페이지에만 보이는 원래 뜻 전체 (순우리말 근거 안내 등)
  blessing_index   smallint not null,                    -- 축원 목록 번호 (lib/share/blessings.ts)
  blessing         text not null,                        -- 축원 한 줄 (이름을 넣은 문장)
  created_at       timestamptz not null default now()
);

comment on table public.name_shares is
  '공유용 이름 카드. 이름·뜻·축원만 담는다 (생년월일·사주 없음). lib/share/name-share.ts 참고';

alter table public.name_shares enable row level security;
