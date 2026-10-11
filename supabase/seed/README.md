# hanja_dict 시드

인명용 한자 사전(8,094자, 8,486행)입니다.

## 적용 방법 (Supabase SQL Editor)

1. `supabase/schema.sql` 전체를 먼저 실행합니다 (`is_edu` 컬럼 추가 포함, 여러 번 실행해도 안전).
2. `hanja_dict_01.sql` ~ `hanja_dict_09.sql`을 순서대로 하나씩 실행합니다.
   `on conflict do nothing`이라 중복 실행해도 안전합니다.
3. 확인: `select count(*), count(distinct hanja) from hanja_dict;` → 8486 / 8094

## 데이터 출처와 한계

- **출처**: Unicode Consortium의 Unihan 데이터베이스 (Unicode License)와 `CJKRadicals.txt`.
  - 인명용 한자: `kHangul` 출처 코드 `N`(인명용), `E`(한문 교육용 기초 한자 1,800자).
  - 획수: 강희자전 부수 획수 + 부수 외 획수 (성명학 원획 기준).
- **자원오행**: 공개된 표준 데이터가 없어 **부수 기반으로 보수적으로 추정**했습니다
  (水·氵→수, 木·禾·竹·艸→목 등). 근거가 없는 글자는 `null`이며 전체의 약 36%만 값이 있습니다.
- **뜻(`meaning`)**: Unihan의 영문 뜻풀이입니다. 한글 훈은 포함되어 있지 않습니다.
- **불용한자**: 뜻이 부정적인 글자 일부(死·病·亡 등 42행)를 `is_forbidden`으로 표시했습니다.
  목록은 `scripts/build-hanja-seed.ts`의 `FORBIDDEN`에서 관리합니다.
- **최신성**: Unihan 18.0 기준이며, 대법원 최신 개정 목록과 일부 차이가 있을 수 있습니다.

## 한글 훈 (hun)

`hanja_dict.hun`에 한글 훈(예: 金 → 쇠)을 채웁니다. 화면에는 `쇠 금`처럼 훈음으로 표시됩니다.

1. `supabase/schema.sql`을 다시 실행합니다 (`hun` 컬럼 추가, 여러 번 실행해도 안전).
2. `hanja_hun_01.sql` ~ `hanja_hun_05.sql`을 순서대로 SQL Editor에서 실행합니다 (`update`라 재실행해도 안전).
3. 확인: `select count(*) from hanja_dict where hun is not null;` → 약 7,335

- **출처**: [libhangul](https://github.com/libhangul/libhangul)의 `data/hanja/hanja.txt` (BSD-3-Clause, Copyright (c) 2005,2006 Choe Hwanjin).
- 한 글자에 훈이 여럿이면 첫 훈을 쓰되, `성 금`처럼 성씨 표기용 훈은 일반 훈이 있을 때 뒤로 밀었습니다.
- 같은 음의 훈이 없으면 같은 한자의 다른 음 훈을 빌렸습니다 (177행). 사전에 없는 약 1,150행(14%)은 `hun`이 비어 있고, 화면에서는 음만 표시하고 영문 뜻풀이로 대체합니다.
- 코드는 `hun` 컬럼이 아직 없어도 동작하도록 되어 있습니다 (훈 없이 표시).

재생성: `npx tsx scripts/build-hanja-hun.ts <hanja.txt 경로>`

## 재생성

```bash
# Unihan.zip을 풀고 CJKRadicals.txt를 내려받은 뒤
npx tsx scripts/build-hanja-seed.ts <Unihan 폴더> <CJKRadicals.txt>
```

---

# name_stats (이름 출생신고 통계)

저장소에는 통계 **원본이 포함되어 있지 않습니다.** 대법원 전자가족관계등록시스템의
「상위 출생신고 이름 현황」(2008년~, 출생신고 기준) 공개 통계를 관리자가 CSV로 정리해 업로드합니다.
해당 사이트는 robots.txt로 자동 접근을 막고 있으므로 자동 수집은 하지 않습니다.

1. `supabase/schema.sql`(신규) 또는 `supabase/migrations/20261011000000_name_stats_snapshots.sql`(기존 DB)을 실행합니다.
2. 관리자를 지정합니다 (SQL Editor).
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict do nothing;
   ```
3. `supabase/seed/name_stats_template.csv` 형식으로 CSV(UTF-8)를 만듭니다.
   ```
   name,year,gender,count
   서윤,2023,여,1234
   ```
   이름은 **성을 제외한 한글 이름**, 성별은 `남`/`여`(또는 `male`/`female`, `M`/`F`), 건수는 쉼표 없는 숫자입니다.
4. 관리자 계정으로 로그인해 `/admin/name-stats`에서 CSV와 **데이터 기준일**을 입력해 업로드합니다.
   잘못된 행이 하나라도 있으면 아무것도 반영되지 않고 오류 목록이 표시됩니다.
   반영 이력은 `data_snapshots`에 남고, 화면의 "○○○○년 ○월 ○일 기준" 표기는 가장 최근 기준일을 따릅니다.

## 해석 규칙

- CSV에 포함된 연도는 **통째로 교체**됩니다. 연도 단위로 남/여 전체 목록을 한 번에 올리세요.
  일부 이름만 올리면 그 연도의 나머지 이름이 지워지고 아래 상한도 왜곡됩니다.
- 공개 통계는 성별마다 상위 N개 이름만 제공하므로, 목록에 없는 이름은 **0명이 아니라 "목록의 최소 건수 미만"**입니다.
  `name_stats_year_summary.min_listed`(성별 목록 최소 건수의 합)가 그 상한이며, 화면에서는 점선 막대로 구분해 표시합니다.
- 누적 건수(`name_stats_cumulative`)는 목록에 오른 해만 합산한 값입니다.
