import type { SupabaseClient } from "@supabase/supabase-js";

import type { Element } from "./types";
import { classifyHanja } from "./hanja-suitability";
import { filledHunOf, nameHunOf } from "./name-hanja-allowlist";
import type { NameHanja } from "./recommend";
import { surnameKey } from "./surname-hanja";

interface Row {
  hanja: string;
  eum: string;
  meaning: string | null;
  stroke_count: number;
  element: Element | null;
  /** 한글 훈 (예: 金 → 쇠). hun 컬럼이 아직 없으면 undefined */
  hun?: string | null;
  /** 한문 교육용 기초 한자 여부. is_edu 컬럼이 아직 없으면 undefined */
  is_edu?: boolean;
}

const BASE_COLUMNS = "hanja, eum, meaning, stroke_count, element";
const COLUMNS = `${BASE_COLUMNS}, hun, is_edu`;

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

/**
 * hun·is_edu 컬럼과 함께 조회하고, 아직 마이그레이션되지 않은 DB(컬럼 없음, 42703)면 두 컬럼 없이 다시 조회한다.
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
  // 허용 목록의 이름용 대표 풀이가 있으면 사전 훈 대신 보여 준다 (판정에는 사전 훈을 쓰고, 사전 훈이 없으면 채운 훈을 쓴다)
  hun: nameHunOf(r.hanja, r.eum) ?? r.hun ?? null,
  suitability: classifyHanja({
    hanja: r.hanja,
    eum: r.eum,
    meaning: r.meaning,
    hun: filledHunOf(r.hanja, r.eum, r.hun),
    isEdu: r.is_edu ?? false,
  }),
});

/** 성씨 한자: 한자와 음이 모두 일치하는 행 */
export async function fetchSurname(
  supabase: SupabaseClient,
  hanja: string[],
  eum: string[]
): Promise<NameHanja[] | null> {
  const rows = await select((cols) => supabase.from("hanja_dict").select(cols).in("hanja", hanja));
  const out: NameHanja[] = [];
  for (let i = 0; i < hanja.length; i++) {
    // 두음법칙 성씨는 사전에 한 소리만 있을 수 있어(劉 유·류 등) 같은 묶음의 읽기도 받는다. 소리는 입력한 대로 쓴다
    const same = rows.filter((r) => r.hanja === hanja[i]);
    const row = same.find((r) => r.eum === eum[i]) ?? same.find((r) => surnameKey(r.eum) === surnameKey(eum[i]));
    if (!row) return null;
    out.push({ ...toChar(row), eum: eum[i] });
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
 * 추천 후보 풀: 대법원 인명용 한자 전체에서 불용한자와, 뜻 등급이 "제외"인 글자(hanja-suitability.ts)를 뺀 것.
 * 자원오행을 모르는 글자(element null)도 포함한다. 나머지 등급은 순위 점수(ranking.ts)에 반영된다.
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
    out.push(...rows.map(toChar).filter((c) => c.suitability !== "exclude"));
    if (rows.length < PAGE) break;
  }
  return out;
}
