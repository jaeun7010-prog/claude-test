import type { SupabaseClient } from "@supabase/supabase-js";

import { isReportSnapshot, type ReportSnapshot } from "@/lib/commerce/report-snapshot";
import type { CombinationItem } from "@/lib/naming/combination";
import { namingChildKey, namingChildQuery, namingConditionKey, toNamingQuery, type NamingParams } from "@/lib/naming/params";
import type { NativeName } from "@/lib/naming/native-names";
import type { NativeScore } from "@/lib/naming/native/score";
import { gradeOf } from "@/lib/naming/score";
import type { Element, Grade, NamingAnalysis } from "@/lib/naming/types";
import type { analyzeSaju } from "@/lib/saju";
import { DEFAULT_BIRTHPLACE_ID } from "@/lib/saju/birthplaces";
import { selfPickHref, SELF_SOURCE_PARAM, SELF_SOURCE_VALUE } from "./self-href";

/**
 * 마이페이지에 저장한 작명(user_naming_history) 읽기.
 * 저장한 값을 그대로 보여 주고 다시 계산하지 않는다. 저장 형식이 시기마다 달라 빠진 값은 null 로 둔다.
 *  - 처음 형식: analysis(성명학 분석 + saju 요약), filters(입력 조건)
 *  - 2026-10-18부터: analysis.snapshot(리포트 스냅숏과 같은 형식: 한자 훈·뜻, 사주 전체 분석), filters.qs(입력 조건 원문)
 *  - 순우리말 이름 (2026-10-22~): given_name_hanja 와 total_score 는 비우고(null), filters.nameKind = "native",
 *    분석은 analysis.native(우리말 이름 점수). 성명학 점수·등급·4격·스냅숏은 없다. 사주 요약(analysis.saju)은 한자 이름과 같다
 *  - 셀프 작명(직접 짓기, 2026-10-25~): 한자 이름과 같은 형식에 filters.source = "self", filters.selfGiven(새로 고르는 부분의 한글).
 *    source 가 없으면 추천받기로 저장한 이름이다
 */

/** 마이페이지 목록·상세·비교에서 읽는 컬럼 */
export const SAVED_COLUMNS =
  "id, surname, surname_hanja, given_name, given_name_hanja, total_score, is_favorite, created_at, birth_datetime, gender, analysis, filters";

export interface SavedRow {
  id: string;
  surname: string;
  surname_hanja: string | null;
  given_name: string;
  given_name_hanja: string | null;
  total_score: number | string | null;
  is_favorite: boolean;
  created_at: string;
  birth_datetime: string | null;
  gender: string | null;
  analysis: unknown;
  filters: unknown;
}

/** 저장할 때 analysis.saju 에 넣는 사주 요약 (처음 형식부터 있음) */
export interface SavedSajuSummary {
  pillars: { year: string; month: string; day: string; hour: string | null };
  strength: string;
  yongsin: Element;
  huisin: Element;
  gisin: Element;
  method: string;
  geokguk: { name: string; status: string; applied: boolean } | null;
  birthDate: string;
}

/** 저장할 때 analysis.native 에 넣는 순우리말 이름 분석 */
export interface SavedNative {
  name: Pick<NativeName, "name" | "category" | "meaning" | "meaningGrade">;
  /** 법적 이름 (부모 성 + 이름, 성 제외) */
  legalName: string;
  score: NativeScore;
  globalScore: number;
}

export type SavedNameKind = "hanja" | "native";
/** 추천받기 / 직접 짓기(셀프 작명) */
export type SavedSource = "recommend" | "self";

interface SavedFilters {
  qs?: string;
  nameKind?: SavedNameKind;
  source?: SavedSource;
  selfGiven?: string;
  length?: NamingParams["length"];
  dolrimja?: NamingParams["dolrimja"];
  parentSurname?: NamingParams["parentSurname"];
  globalFriendly?: boolean;
  neutral?: boolean;
  rarity?: NamingParams["rarity"];
  lateNight?: "next-day" | "same-day";
  birthplace?: { id: string; timeZone: string; longitude: number };
}

export interface SavedNaming {
  id: string;
  /** 한자 이름 / 순우리말 이름 (nameKind 가 없는 예전 저장분은 한자) */
  kind: SavedNameKind;
  /** 순우리말 이름 분석. 한자 이름이면 null */
  native: SavedNative | null;
  /** 직접 짓기로 저장했으면 self (예전 저장분은 recommend) */
  source: SavedSource;
  /** 직접 짓기: 새로 고르는 부분의 한글 (부모 성 글자 제외). 추천받기면 null */
  selfGiven: string | null;
  createdAt: string;
  isFavorite: boolean;
  surname: string;
  surnameHanja: string;
  /** 법적 이름 (부모 성 함께 쓰기면 그 성 글자 포함) */
  given: string;
  givenHanja: string;
  parentSurname: NamingParams["parentSurname"];
  /** 저장된 성명학 점수 (등급·순위 기준) */
  totalScore: number | null;
  /** 저장된 등급. 등급을 저장하지 않던 때의 값은 저장 점수로 지금 기준 등급을 매긴다 (gradeFromScore) */
  grade: Grade | null;
  gradeFromScore: boolean;
  /** 성명학 분석 (4격·오행·항목별 점수) */
  analysis: NamingAnalysis | null;
  /** 부모 성 함께 쓰기: 법적 이름 전체 기준 (참고) */
  legal: NamingAnalysis | null;
  combination: CombinationItem[] | null;
  saju: SavedSajuSummary | null;
  /** 2026-10-18 이후 저장분만: 한자 훈·뜻과 사주 전체 분석 */
  snapshot: ReportSnapshot | null;
  /** 결과 화면 쿼리스트링 (rarity 포함). 입력 조건을 되살릴 수 없으면 null */
  qs: string | null;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function asNative(v: unknown): SavedNative | null {
  return isObject(v) && isObject(v.name) && isObject(v.score) && typeof v.score.total === "number"
    ? (v as unknown as SavedNative)
    : null;
}

function asAnalysis(v: unknown): NamingAnalysis | null {
  return isObject(v) && isObject(v.breakdown) && isObject(v.fourGyeok) && typeof v.totalScore === "number"
    ? (v as unknown as NamingAnalysis)
    : null;
}

/** UTC 시각을 출생지 시간대의 날짜·시각으로 */
function localParts(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** filters.qs 가 없는 예전 저장분: 컬럼과 filters 로 입력 조건을 되살린다 */
function rebuildQs(row: SavedRow, f: SavedFilters, saju: SavedSajuSummary | null): string | null {
  const q = new URLSearchParams();
  q.set("surname", row.surname);
  q.set("sh", row.surname_hanja ?? "");
  if (f.parentSurname) {
    q.set("ps", f.parentSurname.hangul);
    q.set("psh", f.parentSurname.hanja);
  }
  const place = f.birthplace;
  // 출생지가 없는 예전 저장분은 서울로 계산했다 (CLAUDE.md "출생 시각 보정")
  q.set("place", place?.id ?? DEFAULT_BIRTHPLACE_ID);
  if (place?.id === "etc") {
    q.set("tz", place.timeZone);
    q.set("lon", String(place.longitude));
  }
  if (row.birth_datetime) {
    const { date, time } = localParts(row.birth_datetime, place?.timeZone ?? "Asia/Seoul");
    q.set("date", date);
    q.set("time", time);
  } else if (saju?.birthDate) {
    q.set("date", saju.birthDate);
  } else {
    return null;
  }
  if (f.lateNight) q.set("late", f.lateNight);
  if (row.gender) q.set("gender", row.gender);
  if (f.length) q.set("len", f.length);
  if (f.dolrimja) {
    q.set("dol", f.dolrimja.syllable);
    q.set("dolpos", String(f.dolrimja.position));
  }
  if (f.globalFriendly) q.set("glob", "1");
  if (f.neutral) q.set("neutral", "1");
  if (f.rarity) q.set("rarity", f.rarity);
  return q.toString();
}

/** 저장 조건을 검증해 정규화된 쿼리스트링으로 (읽을 수 없으면 null) */
function normalizeQs(qs: string | null): string | null {
  if (!qs) return null;
  if (!namingConditionKey(qs)) return null;
  const rarity = new URLSearchParams(qs).get("rarity");
  const base = namingConditionKey(qs)!;
  return rarity === "rare" || rarity === "common" ? `${base}&rarity=${rarity}` : base;
}

export function readSaved(row: SavedRow): SavedNaming {
  const a = isObject(row.analysis) ? row.analysis : {};
  const f = (isObject(row.filters) ? row.filters : {}) as SavedFilters;
  const analysis = asAnalysis(a);
  const saju = isObject(a.saju) && isObject(a.saju.pillars) ? (a.saju as unknown as SavedSajuSummary) : null;
  const totalScore = row.total_score == null ? null : Number(row.total_score);
  const savedGrade = analysis?.grade ?? null;
  const qs = normalizeQs(typeof f.qs === "string" ? f.qs : rebuildQs(row, f, saju));
  const kind: SavedNameKind = f.nameKind === "native" ? "native" : "hanja";

  return {
    id: row.id,
    kind,
    native: kind === "native" ? asNative(a.native) : null,
    source: f.source === "self" && typeof f.selfGiven === "string" ? "self" : "recommend",
    selfGiven: f.source === "self" && typeof f.selfGiven === "string" ? f.selfGiven : null,
    createdAt: row.created_at,
    isFavorite: row.is_favorite,
    surname: row.surname,
    surnameHanja: row.surname_hanja ?? "",
    given: row.given_name,
    givenHanja: row.given_name_hanja ?? "",
    parentSurname: f.parentSurname ?? null,
    totalScore,
    grade: savedGrade ?? (totalScore != null ? gradeOf(totalScore) : null),
    gradeFromScore: !savedGrade && totalScore != null,
    analysis,
    legal: asAnalysis(a.legal),
    combination: Array.isArray(a.combination) ? (a.combination as CombinationItem[]) : null,
    saju,
    snapshot: isReportSnapshot(a.snapshot) ? a.snapshot : null,
    qs,
  };
}

/** 저장 시 filters.qs 에 넣는 값 */
export const savedQueryOf = (p: NamingParams) => toNamingQuery(p);

/**
 * 저장한 이름에서 "같은 조건으로 다른 이름 보기"(직접 지은 이름은 "한자 다시 골라 보기")로 갈 때의 주소. 순우리말 이름은 순우리말 탭이 먼저 열리고,
 * 직접 짓기로 저장한 이름은 고르기 화면에 저장한 한자를 고른 채로 연다
 */
export function savedResultHref(
  s: Pick<SavedNaming, "qs" | "kind" | "source" | "selfGiven" | "givenHanja" | "parentSurname">
): string | null {
  if (!s.qs) return null;
  if (s.source === "self" && s.selfGiven) {
    const hj = [...s.givenHanja].slice([...(s.parentSurname?.hanja ?? "")].length).join("");
    return selfPickHref(s.qs, s.selfGiven, hj);
  }
  return `/naming/result?${s.qs}${s.kind === "native" ? "&tab=native" : ""}`;
}

/** 저장한 이름의 리포트·굿즈 주소 (직접 짓기로 저장했으면 주문할 때 셀프 작명 조합으로 확인하도록 from=self) */
export const savedGoodsHref = (s: Pick<SavedNaming, "qs" | "id" | "given" | "givenHanja" | "source">) =>
  s.qs
    ? `/goods?${s.qs}&gh=${encodeURIComponent(s.givenHanja)}&ge=${encodeURIComponent(s.given)}&hid=${s.id}` +
      (s.source === "self" ? `&${SELF_SOURCE_PARAM}=${SELF_SOURCE_VALUE}` : "")
    : null;

/** 저장할 때 analysis.saju 에 넣는 사주 요약 (한자·순우리말 공통) */
export function sajuSummaryOf(p: NamingParams, saju: ReturnType<typeof analyzeSaju>): SavedSajuSummary {
  const { pillars, yongsin } = saju;
  const { year, month, day } = p.birth;
  return {
    pillars: {
      year: pillars.year.hanja,
      month: pillars.month.hanja,
      day: pillars.day.hanja,
      hour: pillars.hour?.hanja ?? null,
    },
    strength: yongsin.strength,
    yongsin: yongsin.yongsin,
    huisin: yongsin.huisin,
    gisin: yongsin.gisin,
    method: yongsin.method,
    geokguk: yongsin.geokguk
      ? { name: yongsin.geokguk.name, status: yongsin.geokguk.status, applied: yongsin.geokguk.applied }
      : null,
    birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

/** 저장한 이름 찾기: (이름 종류, 법적 이름 한자(순우리말은 null), 법적 이름 한글) → 저장 id. 없으면 null */
export type SavedLookup = (kind: SavedNameKind, givenHanja: string | null, given: string) => string | null;

export const NO_SAVED: SavedLookup = () => null;

const savedKeyOf = (kind: SavedNameKind, givenHanja: string | null, given: string) =>
  `${kind}|${givenHanja ?? ""}|${given}`;

/**
 * 같은 아이(namingChildKey: 성·성씨 한자·생년월일·시각·출생지·성별)로 저장한 이름들. 결과 화면을 열 때 카드마다
 * "✓ 저장한 이름"을 보여 주고, 저장 버튼의 중복 확인에도 쓴다. 글자 수·돌림자 같은 검색 조건은 보지 않는다
 * (2026-10-25 사용자 결정, 리포트 결제 여부와 같은 기준). RLS 로 본인 저장분만 조회된다. 같은 이름이 여럿이면 최근 저장분.
 */
export async function loadSavedLookup(supabase: SupabaseClient, p: NamingParams): Promise<SavedLookup> {
  const { data, error } = await supabase
    .from("user_naming_history")
    .select(SAVED_COLUMNS)
    .eq("surname", p.surname)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[saved] 저장한 이름 조회 실패", error);
    return NO_SAVED;
  }
  const child = namingChildQuery(p);
  const ids = new Map<string, string>();
  // 예전 저장분은 filters.qs 가 없어 readSaved 가 입력 조건을 되살린다
  for (const s of (data ?? []).map((row) => readSaved(row as SavedRow))) {
    if (s.surnameHanja !== p.surnameHanja || !s.qs || namingChildKey(s.qs) !== child) continue;
    const key = savedKeyOf(s.kind, s.kind === "native" ? null : s.givenHanja, s.given);
    if (!ids.has(key)) ids.set(key, s.id);
  }
  return (kind, givenHanja, given) => ids.get(savedKeyOf(kind, givenHanja, given)) ?? null;
}

/**
 * 같은 아이·같은 이름으로 이미 저장한 이름의 id (없으면 null). 저장 버튼을 여러 번 눌러 같은 이름이
 * 여러 번 쌓이지 않게 한다 (결과 화면의 "✓ 저장한 이름"과 같은 기준).
 */
export async function findSavedDuplicate(
  supabase: SupabaseClient,
  p: NamingParams,
  name: { kind: SavedNameKind; given: string; givenHanja: string | null }
): Promise<string | null> {
  return (await loadSavedLookup(supabase, p))(name.kind, name.givenHanja, name.given);
}
