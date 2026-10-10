import type { SupabaseClient } from "@supabase/supabase-js";

import type { Element } from "./types";
import { hasAcceptableMeaning } from "./hanja-meaning";
import type { NameHanja } from "./recommend";

interface Row {
  hanja: string;
  eum: string;
  meaning: string | null;
  stroke_count: number;
  element: Element | null;
  /** 한글 훈 (예: 金 → 쇠). hun 컬럼이 아직 없으면 undefined */
  hun?: string | null;
}

const BASE_COLUMNS = "hanja, eum, meaning, stroke_count, element";
const COLUMNS = `${BASE_COLUMNS}, hun`;

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

/**
 * hun 컬럼과 함께 조회하고, 아직 마이그레이션되지 않은 DB(컬럼 없음, 42703)면 훈 없이 다시 조회한다.
 * 배포 순서와 상관없이 엔진이 멈추지 않도록 하기 위한 안전장치.
 */
async function select(run: (columns: string) => PromiseLike<QueryResult>): Promise<Row[]> {
  let res = await run(COLUMNS);
  if (res.error?.code === "42703") res = await run(BASE_COLUMNS);
  if (res.error) throw new Error(`한자 사전 조회 실패: ${res.error.message}`);
  return (res.data ?? []) as Row[];
}
const PAGE = 1000; // Supabase API 기본 최대 행 수

const toChar = (r: Row): NameHanja => ({
  hanja: r.hanja,
  eum: r.eum,
  strokes: r.stroke_count,
  element: r.element,
  meaning: r.meaning,
  hun: r.hun ?? null,
});

/** 성씨 한자: 한자와 음이 모두 일치하는 행 */
export async function fetchSurname(
  supabase: SupabaseClient,
  hanja: string[],
  eum: string[]
): Promise<NameHanja[] | null> {
  const rows = await select((cols) =>
    supabase.from("hanja_dict").select(cols).in("hanja", hanja).in("eum", eum)
  );
  const out: NameHanja[] = [];
  for (let i = 0; i < hanja.length; i++) {
    const row = rows.find((r) => r.hanja === hanja[i] && r.eum === eum[i]);
    if (!row) return null;
    out.push(toChar(row));
  }
  return out;
}

/** 특정 음의 이름용 한자 (불용한자 제외) — 돌림자 후보 */
export async function fetchByEum(supabase: SupabaseClient, eum: string): Promise<NameHanja[]> {
  const rows = await select((cols) =>
    supabase
      .from("hanja_dict")
      .select(cols)
      .eq("eum", eum)
      .eq("is_name_hanja", true)
      .eq("is_forbidden", false)
      .range(0, PAGE - 1)
  );
  return rows.map(toChar);
}

/**
 * 추천 후보 풀: 대법원 인명용 한자 전체에서 불용한자와, 뜻이 부정적이거나 불분명한 글자를 뺀 것.
 * 자원오행을 모르는 글자(element null)도 포함하며, 교육용 여부는 구분하지 않는다.
 */
export async function fetchPool(supabase: SupabaseClient): Promise<NameHanja[]> {
  const out: NameHanja[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = await select((cols) =>
      supabase
        .from("hanja_dict")
        .select(cols)
        .eq("is_name_hanja", true)
        .eq("is_forbidden", false)
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1)
    );
    out.push(...rows.map(toChar).filter((c) => hasAcceptableMeaning(c.meaning)));
    if (rows.length < PAGE) break;
  }
  return out;
}
