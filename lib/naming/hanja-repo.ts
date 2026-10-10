import type { SupabaseClient } from "@supabase/supabase-js";

import type { Element } from "./types";
import type { NameHanja } from "./recommend";

interface Row {
  hanja: string;
  eum: string;
  meaning: string | null;
  stroke_count: number;
  element: Element | null;
  is_edu: boolean;
}

const COLUMNS = "hanja, eum, meaning, stroke_count, element, is_edu";
const PAGE = 1000; // Supabase API 기본 최대 행 수

const toChar = (r: Row): NameHanja => ({
  hanja: r.hanja,
  eum: r.eum,
  strokes: r.stroke_count,
  element: r.element,
  meaning: r.meaning,
  edu: r.is_edu,
});

/** 성씨 한자: 한자와 음이 모두 일치하는 행 */
export async function fetchSurname(
  supabase: SupabaseClient,
  hanja: string[],
  eum: string[]
): Promise<NameHanja[] | null> {
  const { data, error } = await supabase
    .from("hanja_dict")
    .select(COLUMNS)
    .in("hanja", hanja)
    .in("eum", eum);
  if (error) throw new Error(`한자 사전 조회 실패: ${error.message}`);
  const rows = (data ?? []) as Row[];
  const out: NameHanja[] = [];
  for (let i = 0; i < hanja.length; i++) {
    const row = rows.find((r) => r.hanja === hanja[i] && r.eum === eum[i]);
    if (!row) return null;
    out.push(toChar(row));
  }
  return out;
}

/** 특정 음의 이름용 한자 (불용한자 제외) */
export async function fetchByEum(
  supabase: SupabaseClient,
  eum: string,
  includeRare: boolean
): Promise<NameHanja[]> {
  let q = supabase
    .from("hanja_dict")
    .select(COLUMNS)
    .eq("eum", eum)
    .eq("is_name_hanja", true)
    .eq("is_forbidden", false);
  if (!includeRare) q = q.eq("is_edu", true);
  const { data, error } = await q.range(0, PAGE - 1);
  if (error) throw new Error(`한자 사전 조회 실패: ${error.message}`);
  return ((data ?? []) as Row[]).map(toChar);
}

/** 추천 후보 풀: 불용한자를 뺀 이름용 한자. 자원오행을 모르는 글자(element null)도 포함한다. */
export async function fetchPool(
  supabase: SupabaseClient,
  includeRare: boolean
): Promise<NameHanja[]> {
  const out: NameHanja[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("hanja_dict")
      .select(COLUMNS)
      .eq("is_name_hanja", true)
      .eq("is_forbidden", false)
      .order("id", { ascending: true });
    if (!includeRare) q = q.eq("is_edu", true);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(`한자 사전 조회 실패: ${error.message}`);
    const rows = (data ?? []) as Row[];
    out.push(...rows.map(toChar));
    if (rows.length < PAGE) break;
  }
  return out;
}
