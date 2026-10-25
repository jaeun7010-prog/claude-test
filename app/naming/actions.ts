"use server";

import { redirect } from "next/navigation";

import { analyzeSaju } from "@/lib/saju";
import { civilToUtcMs } from "@/lib/saju/calendar";
import { NATIVE_NAMES } from "@/lib/naming/native-names";
import { buildNativeCandidates } from "@/lib/naming/native/service";
import { parseNamingParams, type NamingParams } from "@/lib/naming/params";
import { analyzeChosen } from "@/lib/naming/service";
import { loadSelfChoice, selfQueryOf } from "@/lib/naming/self";
import { selfPickHref, selfResultHref } from "@/lib/naming/self-href";
import { buildReportSnapshot } from "@/lib/commerce/report-snapshot";
import { findSavedDuplicate, sajuSummaryOf, savedQueryOf, type SavedNameKind, type SavedNative } from "@/lib/naming/saved";
import { createClient } from "@/lib/supabase/server";
import { SAVED_HANJA_PARAM, SAVED_NATIVE_PARAM, savedBackHref } from "@/components/naming/saved-status";

/** 출생 시각이 있으면 출생지 시간대 기준 UTC 시각 */
function birthDatetimeOf(p: NamingParams): string | null {
  const { year, month, day, hour, minute } = p.birth;
  return hour !== undefined
    ? new Date(civilToUtcMs({ year, month, day, hour, minute: minute ?? 0 }, p.birthplace.timeZone)).toISOString()
    : null;
}

/** filters 컬럼 (한자·순우리말 공통) */
function filtersOf(p: NamingParams, nameKind: SavedNameKind) {
  return {
    // 입력 조건 원문 (같은 조건으로 다른 이름 보기·리포트 주문용)
    qs: savedQueryOf(p),
    // 한자 이름 / 순우리말 이름 (lib/naming/saved.ts)
    nameKind,
    length: p.length,
    dolrimja: p.dolrimja,
    // 부모 성 함께 쓰기: given_name 에는 이 성을 포함한 법적 이름이 들어간다
    parentSurname: p.parentSurname,
    globalFriendly: p.globalFriendly,
    neutral: p.neutral,
    rarity: p.rarity,
    lateNight: p.birth.lateNight,
    birthplace: {
      id: p.birthplace.id,
      timeZone: p.birthplace.timeZone,
      longitude: p.birthplace.longitude,
    },
  };
}

type Chosen = NonNullable<Awaited<ReturnType<typeof analyzeChosen>>>;

/** 한자 이름 저장 행 (추천받기·직접 짓기 공통) */
function hanjaRowOf(p: NamingParams, r: Chosen, givenEum: string, givenHanja: string) {
  return {
    surname: p.surname,
    surname_hanja: p.surnameHanja,
    birth_datetime: birthDatetimeOf(p),
    gender: p.gender,
    given_name: givenEum,
    given_name_hanja: givenHanja,
    total_score: r.analysis.totalScore,
    // 부모 성 함께 쓰기: total_score 와 기본 분석은 새로 고르는 부분 기준, 법적 이름 전체 기준은 legal 에 참고로 둔다
    analysis: {
      ...r.analysis,
      ...(r.legalAnalysis ? { legal: r.legalAnalysis, combination: r.combination } : {}),
      saju: sajuSummaryOf(p, r.saju),
      // 2026-10-18부터: 저장 당시 분석 전체(한자 훈·뜻, 사주 상세)를 리포트 스냅숏 형식으로 함께 둔다 (lib/naming/saved.ts)
      snapshot: buildReportSnapshot(p, r),
    },
    filters: filtersOf(p, "hanja"),
  };
}

/**
 * 추천 결과 중 하나를 마이페이지(작명 이력)에 저장. 점수는 서버에서 다시 계산한다.
 * 저장한 뒤(이미 저장한 이름이어도) 결과 화면의 그 카드로 돌아와 "마이페이지에 저장했어요"를 보여 준다 (직접 짓기와 같음)
 */
export async function saveName(formData: FormData) {
  const qs = String(formData.get("qs") ?? "");
  const givenHanja = String(formData.get("gh") ?? "");
  const givenEum = String(formData.get("ge") ?? "");
  const back = `/naming/result?${qs}`;
  const mark = `&${SAVED_HANJA_PARAM}=${encodeURIComponent(givenHanja)}`;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/naming/result?${qs}`)}`);

  const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(qs)));
  if (!parsed.ok) redirect("/naming");
  const p = parsed.value;

  const r = await analyzeChosen(supabase, p, givenHanja, givenEum);
  if (!r) redirect(`/naming/result?${qs}`);

  // 같은 이름·같은 조건은 한 번만 저장한다
  const dup = await findSavedDuplicate(supabase, p, { kind: "hanja", given: givenEum, givenHanja });
  if (dup) redirect(savedBackHref(back, dup, true, mark));

  const { data, error } = await supabase
    .from("user_naming_history")
    .insert({ user_id: user.id, ...hanjaRowOf(p, r, givenEum, givenHanja) })
    .select("id")
    .single();
  if (error || !data) redirect(`${back}&saveError=1`);

  redirect(savedBackHref(back, data.id, false, mark));
}

/**
 * 셀프 작명(직접 짓기)으로 고른 조합을 마이페이지에 저장. 주소의 조합이 셀프 작명 후보인지(isSelfSelectable) 확인하고
 * 점수는 서버에서 다시 계산한다. 저장한 뒤(이미 저장한 이름이어도) 고른 조합 결과 화면으로 돌아온다.
 * filters.source = "self", filters.selfGiven(새로 고르는 부분)을 남겨 마이페이지의 "한자 다시 골라 보기"가 고르기 화면으로 간다
 */
export async function saveSelfName(formData: FormData) {
  const qs = String(formData.get("qs") ?? "");
  const given = String(formData.get("given") ?? "");
  const hj = String(formData.get("hj") ?? "");

  const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(qs)));
  if (!parsed.ok) redirect("/naming/self");
  const p = parsed.value;
  const selfQ = selfQueryOf(p);
  const back = selfResultHref(selfQ, given, hj);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);

  const choice = await loadSelfChoice(supabase, p, given, hj);
  if (!choice.ok) redirect(selfPickHref(selfQ, given));
  const prefix = p.parentSurname ?? { hangul: "", hanja: "" };
  const givenEum = prefix.hangul + given;
  const givenHanja = prefix.hanja + hj;

  const dup = await findSavedDuplicate(supabase, p, { kind: "hanja", given: givenEum, givenHanja });
  if (dup) redirect(savedBackHref(back, dup, true));

  const row = hanjaRowOf(p, choice.chosen, givenEum, givenHanja);
  const { data, error } = await supabase
    .from("user_naming_history")
    .insert({ user_id: user.id, ...row, filters: { ...row.filters, source: "self", selfGiven: given } })
    .select("id")
    .single();
  if (error || !data) redirect(`${back}&saveError=1`);

  redirect(savedBackHref(back, data.id, false));
}

/**
 * 순우리말 이름을 마이페이지에 저장. 점수는 서버에서 다시 계산한다.
 * given_name_hanja·total_score 는 비우고(성명학 점수가 아니다), 우리말 이름 점수는 analysis.native 에 둔다.
 * 저장한 뒤 결과 화면(순우리말 탭)의 그 카드로 돌아온다.
 */
export async function saveNativeName(formData: FormData) {
  const qs = String(formData.get("qs") ?? "");
  const nameText = String(formData.get("nn") ?? "");
  const resultHref = `/naming/result?${qs}`;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(resultHref)}`);

  const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(qs)));
  if (!parsed.ok) redirect("/naming");
  const p = parsed.value;

  // 목록에 있는 이름이고 지금 입력 조건(성별·글자 수·부모 성 등)을 통과해야 저장한다
  const name = NATIVE_NAMES.find((n) => n.name === nameText);
  const saju = analyzeSaju(p.birth);
  const c = name ? buildNativeCandidates(p, saju, null, [name]).candidates[0] : undefined;
  if (!c) redirect(resultHref);

  const dup = await findSavedDuplicate(supabase, p, { kind: "native", given: c.legalName, givenHanja: null });
  const mark = `&${SAVED_NATIVE_PARAM}=${encodeURIComponent(c.legalName)}`;
  if (dup) redirect(savedBackHref(resultHref, dup, true, mark));

  const native: SavedNative = {
    name: { name: c.name.name, category: c.name.category, meaning: c.name.meaning, meaningGrade: c.name.meaningGrade },
    legalName: c.legalName,
    score: c.score,
    globalScore: c.globalScore,
  };
  const { data, error } = await supabase.from("user_naming_history").insert({
    user_id: user.id,
    surname: p.surname,
    surname_hanja: p.surnameHanja,
    birth_datetime: birthDatetimeOf(p),
    gender: p.gender,
    // 부모 성 함께 쓰기면 부모 성을 포함한 법적 이름
    given_name: c.legalName,
    given_name_hanja: null,
    total_score: null,
    analysis: { native, saju: sajuSummaryOf(p, saju) },
    filters: filtersOf(p, "native"),
  }).select("id").single();
  if (error || !data) redirect(`${resultHref}&saveError=1`);

  redirect(savedBackHref(resultHref, data.id, false, mark));
}
