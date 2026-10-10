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

## 재생성

```bash
# Unihan.zip을 풀고 CJKRadicals.txt를 내려받은 뒤
npx tsx scripts/build-hanja-seed.ts <Unihan 폴더> <CJKRadicals.txt>
```

---

# name_stats (이름 출생 통계)

저장소에는 통계 **원본이 포함되어 있지 않습니다.** 대법원 전자가족관계등록시스템의
「상위 출생신고 이름 현황」 등 정당한 경로로 확보한 데이터를 CSV로 정리해 적재하세요.

1. `supabase/schema.sql`을 다시 실행합니다 (`name_stats_year_summary` 뷰가 추가되었습니다).
2. `supabase/seed/name_stats_template.csv` 형식(`name,year,male_count,female_count`)으로 CSV를 만듭니다.
   이름은 **성을 제외한 한글 이름**입니다.
3. `npx tsx scripts/import-name-stats.ts <CSV 경로>` → `supabase/seed/name_stats_NN.sql` 생성
4. 생성된 SQL을 SQL Editor에서 순서대로 실행합니다 (upsert라 재실행해도 안전).

## 해석 규칙

공개 통계가 상위 N개 이름만 제공한다면, 목록에 없는 이름은 **0명이 아니라 "해당 연도 목록의 최소 인원 미만"**입니다.
`name_stats_year_summary.min_listed`가 그 상한이며, 화면에서는 점선 막대로 구분해 표시합니다.
같은 연도의 일부 이름만 넣으면 이 상한이 왜곡되므로, 연도 단위로 전체 목록을 한 번에 적재하세요.
