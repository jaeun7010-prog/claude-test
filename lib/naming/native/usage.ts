/**
 * 순우리말 이름 쓰임 (2026-10-22 사용자 확인). 한자 쪽 "소리 먼저"(`../name-sounds.ts`)처럼 실제로 이름에 쓰이는 정도를 정렬에 반영한다.
 * - 자주 +10 · 가끔 +5 가점 (NATIVE_USAGE_BONUS). 정렬 점수 = (우리말 이름 점수 + 가점) ÷ (100 + 자주 가점) × 100.
 *   우리말 이름 점수(35/25/20/20)와 화면 점수는 바꾸지 않는다.
 * - 드묾 이름 카드에 RARE_USAGE_LABEL을 작게 붙인다.
 * 표는 기억에 기댄 임시 판단이다(DRAFT_NATIVE_USAGE). 대법원 통계가 오면 NativeUsageSource를 출생 건수 기반으로 바꾼다.
 * 쓰임을 바꿀 때는 사용자에게 표로 먼저 보여 주고 확인받는다.
 * 시험: `scripts/_tmp/native-usage-trial.ts`(가점 크기), `native-usage-compare.ts`(전후 상위 10).
 */

export type NativeUsage = "frequent" | "sometimes" | "rare";

export const NATIVE_USAGE_LABEL: Record<NativeUsage, string> = { frequent: "자주", sometimes: "가끔", rare: "드묾" };

/** 정렬 가점. 가점 크기 시험(표본 50건): 상위 10 중 드묾 61 → 43%, 1위가 드묾 27 → 9건, 상위 10 평균 점수 79.0 → 78.5 */
export const NATIVE_USAGE_BONUS: Record<NativeUsage, number> = { frequent: 10, sometimes: 5, rare: 0 };
const MAX_USAGE_BONUS = NATIVE_USAGE_BONUS.frequent;

export const RARE_USAGE_LABEL = "이름으로는 드물게 쓰여요";

/** 이름 쓰임 출처. 지금은 임시 표, 대법원 통계가 오면 출생 건수 구간으로 바꾼다 */
export interface NativeUsageSource {
  label: string;
  usageOf(name: string): NativeUsage;
}

/** [쓰임, 근거]. 기억에 기댄 임시 판단 (자주 6 · 가끔 46 · 드묾 72) */
export const DRAFT_NATIVE_USAGE: Readonly<Record<string, readonly [NativeUsage, string]>> = {
  // 사전 등재어
  별: ["rare", "외자 순우리말 이름은 드묾"],
  솔: ["rare", "외자. 한솔·해솔처럼 다른 글자와 붙여 씀"],
  봄: ["rare", "외자"],
  빛: ["rare", "외자"],
  결: ["rare", "외자. 한결로 많이 씀"],
  온: ["rare", "외자"],
  참: ["rare", "외자"],
  샘: ["rare", "외자"],
  꿈: ["rare", "외자"],
  하늘: ["frequent", "대표적인 순우리말 이름, 남녀 모두 꾸준히 씀"],
  슬기: ["sometimes", "1980~90년대에 흔했고 요즘 출생은 줄어듦"],
  보람: ["sometimes", "1980~90년대에 흔했고 요즘 출생은 줄어듦"],
  누리: ["sometimes", "이름으로 알려져 있으나 흔하지 않음"],
  마루: ["rare", "사람 이름보다 반려동물 이름으로 많이 떠오름"],
  바다: ["sometimes", "이름으로 쓰이나 흔하지 않음"],
  구름: ["rare", "이름 사례 드묾"],
  바람: ["rare", "이름 사례 드묾"],
  여울: ["rare", "이름 사례 드묾"],
  아람: ["sometimes", "여자아이 이름으로 가끔 씀"],
  믿음: ["rare", "이름 사례 드묾"],
  샛별: ["rare", "예스러운 느낌, 요즘 이름으로 드묾"],
  새봄: ["sometimes", "이름으로 가끔 씀 (2026-10-22 사용자 확인)"],
  가을: ["sometimes", "최근 여자아이 이름으로 늘어남"],
  여름: ["sometimes", "최근 이름으로 늘어남"],
  이레: ["sometimes", "이름으로 가끔 씀"],
  이랑: ["rare", "이름 사례 드묾"],
  나라: ["sometimes", "여자 이름으로 가끔 씀"],
  보름: ["rare", "이름 사례 드묾"],
  새벽: ["rare", "이름 사례 드묾"],
  아침: ["rare", "이름 사례 드묾"],
  햇살: ["rare", "이름 사례 드묾"],
  겨레: ["rare", "예스러운 느낌, 이름 사례 드묾"],
  한길: ["rare", "이름 사례 드묾"],
  나래: ["sometimes", "여자 이름으로 가끔 씀"],
  이슬: ["sometimes", "1980~90년대에 흔했고 요즘은 줄어듦"],
  단비: ["sometimes", "여자 이름으로 가끔 씀"],
  노을: ["rare", "이름 사례 드묾"],
  윤슬: ["sometimes", "2010년대 이후 늘어난 이름"],
  다래: ["rare", "이름 사례 드묾"],
  보라: ["sometimes", "여자 이름으로 가끔 씀"],
  나비: ["rare", "사람 이름보다 반려동물 이름으로 많이 떠오름"],
  하나: ["frequent", "흔한 여자 이름"],
  송이: ["sometimes", "여자 이름으로 가끔 씀"],
  사랑: ["sometimes", "이름으로 가끔 씀"],
  기쁨: ["rare", "이름 사례 드묾"],
  버들: ["rare", "이름 사례 드묾"],
  별빛: ["rare", "이름 사례 드묾"],
  달빛: ["rare", "이름 사례 드묾"],
  소리: ["sometimes", "여자 이름으로 가끔 씀"],
  하늘빛: ["rare", "세 글자, 이름 사례 드묾"],
  하늬: ["sometimes", "여자 이름으로 가끔 씀"],
  산들: ["rare", "이름 사례 드묾"],
  가득: ["rare", "이름 사례 드묾"],
  고요: ["rare", "이름 사례 드묾"],
  고니: ["rare", "이름 사례 드묾"],
  꽃길: ["rare", "이름 사례 드묾"],
  숨결: ["rare", "이름 사례 드묾"],
  물결: ["rare", "이름 사례 드묾"],
  새날: ["rare", "이름 사례 드묾"],
  나무: ["rare", "이름 사례 드묾"],
  벼리: ["sometimes", "순우리말 이름으로 가끔 씀"],
  한마음: ["rare", "세 글자, 이름 사례 드묾"],
  한뜻: ["rare", "이름 사례 드묾"],
  바위: ["rare", "이름 사례 드묾"],
  범: ["rare", "외자"],
  구슬: ["rare", "이름 사례 드묾"],
  꿈결: ["rare", "이름 사례 드묾"],
  꽃송이: ["rare", "세 글자, 이름 사례 드묾"],
  // 이름용 조어
  나눔: ["rare", "이름 사례 드묾"],
  초롱: ["sometimes", "1980~90년대 여자 이름으로 가끔"],
  온누리: ["rare", "세 글자, 이름 사례 드묾"],
  한아름: ["sometimes", "여자 이름으로 가끔 씀"],
  아름: ["frequent", "1980~2000년대 흔한 여자 이름"],
  다솜: ["sometimes", "여자 이름으로 가끔 씀"],
  가람: ["sometimes", "이름으로 가끔 씀"],
  미르: ["rare", "이름 사례 드묾"],
  한결: ["frequent", "요즘 많이 쓰는 남자 이름"],
  새롬: ["sometimes", "여자 이름으로 가끔 씀"],
  소담: ["rare", "이름 사례 드묾"],
  보미: ["sometimes", "여자 이름으로 가끔 씀"],
  고운: ["sometimes", "여자 이름으로 가끔 씀"],
  빛나: ["sometimes", "여자 이름으로 가끔 씀"],
  우람: ["rare", "이름 사례 드묾"],
  힘찬: ["rare", "이름 사례 드묾"],
  한뫼: ["rare", "이름 사례 드묾"],
  찬솔: ["rare", "이름 사례 드묾"],
  새힘: ["rare", "이름 사례 드묾"],
  한빛: ["sometimes", "이름으로 가끔 씀"],
  한별: ["sometimes", "이름으로 가끔 씀"],
  한솔: ["frequent", "흔한 순우리말 이름, 남녀 모두 씀"],
  해솔: ["sometimes", "최근 이름으로 늘어남"],
  늘봄: ["rare", "이름 사례 드묾"],
  바름: ["rare", "이름 사례 드묾"],
  어진: ["sometimes", "이름으로 가끔 씀 (2026-10-22 사용자 확인)"],
  해든: ["rare", "이름 사례 드묾"],
  이루: ["rare", "이름 사례 드묾"],
  이룸: ["rare", "이름 사례 드묾"],
  푸름: ["rare", "이름 사례 드묾"],
  도담: ["sometimes", "최근 이름으로 늘어남"],
  한가람: ["rare", "세 글자, 이름 사례 드묾"],
  큰솔: ["rare", "이름 사례 드묾"],
  큰별: ["rare", "이름 사례 드묾"],
  굳센: ["rare", "이름 사례 드묾"],
  곧은: ["rare", "이름 사례 드묾"],
  너른: ["rare", "이름 사례 드묾"],
  한누리: ["rare", "세 글자, 이름 사례 드묾"],
  늘찬: ["rare", "이름 사례 드묾"],
  해찬: ["sometimes", "남자 이름으로 가끔 씀"],
  가꿈: ["rare", "이름으로 낯선 말"],
  바른: ["rare", "이름 사례 드묾"],
  // 널리 쓰이는 이름
  미리내: ["rare", "세 글자, 순우리말 이름으로 알려졌지만 실제 이름으로는 드묾 (2026-10-22 사용자 확인)"],
  라온: ["sometimes", "최근 이름으로 늘어남"],
  아라: ["sometimes", "여자 이름으로 가끔 씀"],
  다온: ["frequent", "요즘 많이 쓰는 순우리말 이름"],
  가온: ["sometimes", "최근 이름으로 늘어남"],
  해밀: ["sometimes", "최근 이름으로 늘어남"],
  하람: ["sometimes", "이름으로 가끔 씀"],
  나린: ["sometimes", "최근 여자 이름으로 늘어남"],
  로운: ["sometimes", "최근 남자 이름으로 늘어남"],
  아리: ["sometimes", "여자 이름으로 가끔 씀"],
  이든: ["sometimes", "최근 남자 이름으로 늘어남"],
  하랑: ["sometimes", "최근 이름으로 늘어남"],
  다올: ["sometimes", "최근 이름으로 늘어남"],
  초아: ["sometimes", "여자 이름으로 가끔 씀"],
};

export const DRAFT_NATIVE_USAGE_SOURCE: NativeUsageSource = {
  label: "임시 표 (2026-10-22)",
  // 표에 없는 이름은 드묾으로 본다 (목록에 이름을 더할 때 표에도 넣는다)
  usageOf: (name) => DRAFT_NATIVE_USAGE[name]?.[0] ?? "rare",
};

/** 정렬 점수 (0~100). 우리말 이름 점수에 쓰임 가점을 더해 100점으로 환산한다 */
export function nativeRankScore(total: number, usage: NativeUsage): number {
  return Math.round(((total + NATIVE_USAGE_BONUS[usage]) / (100 + MAX_USAGE_BONUS)) * 1000) / 10;
}
