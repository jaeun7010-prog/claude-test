/**
 * 순우리말 이름 후보 (3단계 입력 조건). 한자 이름(`../service.ts`의 runNaming)과 같은 NamingParams·사주 결과를 받는다.
 * - 성별: 남자아이 = 남 + 무관, 여자아이 = 여 + 무관, 성별 무관 = 무관만
 * - 글자 수: `length.ts` (외자는 "외자"를 골랐을 때만, 상관없음은 2~3자)
 * - 부모 성 함께 쓰기: 새로 고르는 부분 기준으로 점수를 매기고, 부모 성 + 이름이 5자를 넘거나
 *   이름 첫 음절이 부모 성 끝 음절과 같으면 뺀다
 * - 돌림자는 적용하지 않고 안내만 한다. 글로벌 발음·젠더 뉴트럴은 한자 쪽과 같은 기준
 * 이름 통계·글로벌 발음은 법적 이름(부모 성 + 이름) 기준이다.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { analyzeSaju } from "@/lib/saju";
import { loadNameSummaries, type NameStatSummary } from "@/lib/stats/name-stats";
import { MAX_GIVEN_NAME_LENGTH } from "../analyze";
import { globalPronunciationScore } from "../global-pronunciation";
import { NATIVE_NAMES, type NativeName } from "../native-names";
import type { NamingParams } from "../params";
import type { NameMetrics } from "../priorities";
import { nativeLengthAllowed, NATIVE_SINGLE_SHORTAGE_NOTICE, type NativeLength } from "./length";
import { compareNativeScore, scoreNativeName, type NativeSaju, type NativeScore } from "./score";

/** 글로벌 발음 친화 조건의 하한 (한자 쪽 runNaming의 minGlobalScore와 같다) */
export const NATIVE_MIN_GLOBAL_SCORE = 70;
/** 서버에서 넘기는 후보 수와 화면 수 (한자 쪽 CANDIDATE_LIMIT / DISPLAY_LIMIT와 같다) */
export const NATIVE_CANDIDATE_LIMIT = 60;
export const NATIVE_DISPLAY_LIMIT = 30;

export const NATIVE_DOLRIMJA_NOTICE = "돌림자는 한자 이름에만 적용됩니다";
export const NATIVE_NEUTRAL_NO_STATS_NOTICE =
  "출생 통계 데이터가 아직 적재되지 않아 젠더 뉴트럴 조건은 적용되지 않았습니다.";
export const NATIVE_NEUTRAL_EMPTY_NOTICE = "젠더 뉴트럴 조건을 만족하는 순우리말 이름이 없습니다. 조건을 완화해 보세요.";

export interface NativeCandidate {
  name: NativeName;
  /** 법적 이름 (부모 성 + 이름, 성 제외) */
  legalName: string;
  score: NativeScore;
  globalScore: number;
  /** 우선순위 맞춤 점수용 (`priorities.ts`). baseScore는 우리말 이름 점수 */
  metrics: NameMetrics;
}

/** 걸러진 이름 수 (검증·안내용) */
export interface NativeFilterCounts {
  gender: number;
  length: number;
  tooLong: number;
  repeatsPrefix: number;
  global: number;
  neutral: number;
}

export interface NativeNamingResult {
  candidates: NativeCandidate[];
  /** 화면에 보여 줄 안내 (돌림자, 외자 부족, 젠더 뉴트럴 통계 없음 등) */
  notices: string[];
  excluded: NativeFilterCounts;
}

const LENGTH_MODE: Record<NamingParams["length"], NativeLength> = { "1": "single", "2": "double", any: "any" };

const sajuOf = (saju: ReturnType<typeof analyzeSaju> | null): NativeSaju | undefined =>
  saju ? { needed: saju.yongsin.yongsin, favorable: saju.yongsin.huisin, unfavorable: saju.yongsin.gisin } : undefined;

/**
 * 조건에 맞는 순우리말 이름 후보 (통계는 미리 불러 넘긴다). saju가 null이면 생일 없음으로 점수를 매긴다.
 * `names`는 검증용으로 바꿔 넣을 수 있다.
 */
export function buildNativeCandidates(
  p: NamingParams,
  saju: ReturnType<typeof analyzeSaju> | null,
  stats: Map<string, NameStatSummary> | null,
  names: readonly NativeName[] = NATIVE_NAMES
): NativeNamingResult {
  const excluded: NativeFilterCounts = { gender: 0, length: 0, tooLong: 0, repeatsPrefix: 0, global: 0, neutral: 0 };
  const notices: string[] = [];
  const prefix = p.parentSurname?.hangul ?? "";
  const mode = LENGTH_MODE[p.length];
  const s = sajuOf(saju);

  let list: NativeCandidate[] = [];
  for (const name of names) {
    const len = [...name.name].length;
    if (p.gender === "neutral" ? name.gender !== "neutral" : name.gender !== p.gender && name.gender !== "neutral") {
      excluded.gender++;
      continue;
    }
    if (prefix && [...prefix].length + len > MAX_GIVEN_NAME_LENGTH) {
      excluded.tooLong++;
      continue;
    }
    if (!nativeLengthAllowed(len, mode)) {
      excluded.length++;
      continue;
    }
    // 김박박○처럼 부모 성 끝 음절과 같은 음절로 시작하면 뺀다 (한자 쪽 recommend.ts와 같은 규칙)
    if (prefix && prefix.endsWith([...name.name][0])) {
      excluded.repeatsPrefix++;
      continue;
    }
    const legalName = prefix + name.name;
    const globalScore = globalPronunciationScore(legalName);
    if (p.globalFriendly && globalScore < NATIVE_MIN_GLOBAL_SCORE) {
      excluded.global++;
      continue;
    }
    const score = scoreNativeName({ name, surname: p.surname, prefix, saju: s });
    const st = stats?.get(legalName);
    list.push({
      name,
      legalName,
      score,
      globalScore,
      metrics: {
        baseScore: score.total,
        globalScore,
        births: stats ? (st ? st.cumulative.male + st.cumulative.female : 0) : null,
        everListed: stats ? (st?.everListed ?? false) : null,
      },
    });
  }

  if (p.neutral) {
    if (!stats) {
      notices.push(NATIVE_NEUTRAL_NO_STATS_NOTICE);
    } else {
      const before = list.length;
      // 통계에 한 번도 오르지 않은 이름은 성비를 알 수 없어 제외한다 (한자 쪽과 같다)
      list = list.filter((c) => stats.get(c.legalName)?.neutral);
      excluded.neutral = before - list.length;
      if (list.length === 0) notices.push(NATIVE_NEUTRAL_EMPTY_NOTICE);
    }
  }

  // 정렬: 강한 놀림말 맨 뒤 → 총점 → 용신 보완 → 발음오행 흐름 → 희소성(누적 건수 적은 순) → 가나다
  list.sort(
    (a, b) =>
      compareNativeScore(a.score, b.score) ||
      (a.metrics.births ?? 0) - (b.metrics.births ?? 0) ||
      a.name.name.localeCompare(b.name.name, "ko")
  );

  if (p.dolrimja) notices.push(NATIVE_DOLRIMJA_NOTICE);
  if (mode === "single" && list.length < NATIVE_DISPLAY_LIMIT) notices.push(NATIVE_SINGLE_SHORTAGE_NOTICE);

  return { candidates: list.slice(0, NATIVE_CANDIDATE_LIMIT), notices, excluded };
}

/** 통계를 불러와 순우리말 이름 후보를 만든다. 사주는 한자 쪽 runNaming 결과를 그대로 넘긴다 */
export async function runNativeNaming(
  supabase: SupabaseClient,
  p: NamingParams,
  saju: ReturnType<typeof analyzeSaju> | null
): Promise<NativeNamingResult> {
  const prefix = p.parentSurname?.hangul ?? "";
  let stats: Map<string, NameStatSummary> | null = null;
  try {
    const loaded = await loadNameSummaries(
      supabase,
      NATIVE_NAMES.map((n) => prefix + n.name)
    );
    stats = loaded?.summaries ?? null;
  } catch (e) {
    console.error("[naming] 순우리말 통계 조회 실패", e);
  }
  return buildNativeCandidates(p, saju, stats);
}
