/**
 * 셀프 작명: 부모가 정한 한글 이름(1~2자, 부모 성 함께 쓰기면 새로 고르는 부분)의 한자 후보와 조합 점수표를 만든다.
 * 정렬·[최고]/[추천]·안내 문장은 self-rank.ts (브라우저에서도 쓴다).
 *
 * 추천(service.ts의 runNaming)과 다른 점: 소리는 부모가 정했으므로 소리 목록·요즘 어감 하한·용신 글자 필수·4격 길수 하한·
 * 같은 첫소리 제한을 쓰지 않는다. 모든 조합을 계산해 점수로만 알려 준다.
 * 같은 점: 성씨 자원오행 표(prepare), 성명학 점수(analyzeName / analyzeWithPrefix), 기본 순위 점수, 뜻 등급 "제외" 숨김,
 * 성별 글자 처리(applyGender), 부모 성 끝 음절과 같은 첫 음절 금지.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { analyzeSaju } from "@/lib/saju";
import { analyzeName, analyzeWithPrefix } from "./analyze";
import { applyGender } from "./gender-hanja";
import { fetchByEum } from "./hanja-repo";
import type { NamingParams } from "./params";
import { baseRankScore, meaningScore } from "./ranking";
import type { NameHanja } from "./recommend";
import type { SelfChar, SelfScore, SelfSlot, SelfTable } from "./self-rank";
import { prepare } from "./service";
import { trendScore } from "./trend";
import type { Element, NamingAnalysis } from "./types";

const HANGUL = /^[가-힣]+$/;
/** 셀프 작명 이름 글자 수 (부모 성 글자 제외). 3자 이름은 이번 범위에서 뺐다 (2026-10-24 사용자 결정) */
export const SELF_MAX_LENGTH = 2;

/** 입력한 한글 이름 검사. 문제 없으면 null */
export function checkSelfName(given: string, prefixHangul = ""): string | null {
  if (!HANGUL.test(given) || given.length < 1 || given.length > SELF_MAX_LENGTH)
    return `이름을 한글 1~${SELF_MAX_LENGTH}자로 입력해 주세요.`;
  if (prefixHangul && prefixHangul.endsWith(given[0]))
    return `이름 첫 글자가 함께 쓰는 성 '${prefixHangul}'과 같은 소리라 쓸 수 없어요.`;
  return null;
}

/** 한 자리의 후보 한자: 제외 등급은 숨기고, 성별 글자는 아이 성별에 맞게 (같은 한자가 두 번 나오면 하나만) */
export function selfSlotOf(eum: string, rows: NameHanja[], gender: NamingParams["gender"]): { slot: SelfSlot; chars: NameHanja[] } {
  const seen = new Set<string>();
  const unique = rows.filter((c) => !seen.has(c.hanja) && seen.add(c.hanja));
  const allowed = unique.filter((c) => c.suitability !== "exclude");
  const gendered = applyGender(allowed, gender);
  const chars = [...gendered].sort((a, b) => a.hanja.localeCompare(b.hanja));
  return {
    chars,
    slot: {
      eum,
      chars: chars.map((c) => ({
        hanja: c.hanja,
        eum: c.eum,
        hun: c.hun,
        suitability: c.suitability as SelfChar["suitability"],
      })),
      hiddenMeaning: unique.length - allowed.length,
      hiddenGender: allowed.length - gendered.length,
    },
  };
}

const GYEOK_KEYS = ["won", "hyeong", "i", "jeong"] as const;

export interface SelfTableInput {
  surname: NameHanja[];
  prefix: NameHanja[];
  saju: { yongsin: Element; huisin?: Element; gisin?: Element };
  /** 자리별 후보 (selfSlotOf의 chars) */
  slotChars: NameHanja[][];
  slots: SelfSlot[];
}

/** 모든 조합의 무료 점수표 */
export function buildSelfTable({ surname, prefix, saju, slotChars, slots }: SelfTableInput): SelfTable {
  const sajuArgs = { neededElement: saju.yongsin, favorableElement: saju.huisin, unfavorableElement: saju.gisin };
  const syllables = slots.map((s) => s.eum);
  // 요즘 어감·소리 가점은 한글 이름에만 달려 같은 소리 안에서는 모두 같다. 부모가 정한 소리라 예스러운 음절도 허용한다
  const trend = Math.max(0, trendScore(syllables.join(""), new Set(syllables)));

  const scoreOf = (chosen: NameHanja[]): SelfScore => {
    let analysis: NamingAnalysis;
    let legal: NamingAnalysis | undefined;
    if (prefix.length > 0) ({ analysis, legal } = analyzeWithPrefix({ surname, prefix, givenName: chosen, ...sajuArgs }));
    else analysis = analyzeName({ surname, givenName: chosen, ...sajuArgs });
    return {
      totalScore: analysis.totalScore,
      grade: analysis.grade,
      breakdown: analysis.breakdown,
      gyeok: GYEOK_KEYS.map((k) => ({ suri: analysis.fourGyeok[k].suri, lucky: analysis.fourGyeok[k].lucky })),
      baseScore: baseRankScore(analysis.totalScore, meaningScore(chosen), trend),
      ...(legal ? { legal: { totalScore: legal.totalScore, grade: legal.grade } } : {}),
    };
  };

  const scores: (SelfScore | null)[] = [];
  if (slotChars.length === 1) {
    for (const a of slotChars[0]) scores.push(scoreOf([a]));
  } else {
    for (const a of slotChars[0]) for (const b of slotChars[1]) scores.push(a.hanja === b.hanja ? null : scoreOf([a, b]));
  }
  // 발음오행은 소리로 정해져 모든 조합에 같다
  const first = scores.find((s): s is SelfScore => !!s);
  return { slots, scores, pronunciation: { score: first?.breakdown.pronunciation ?? 0 } };
}

export type SelfNamingResult =
  | {
      ok: true;
      saju: ReturnType<typeof analyzeSaju>;
      surname: NameHanja[];
      prefix: NameHanja[];
      table: SelfTable;
    }
  | { ok: false; error: string };

/** 셀프 작명 점수표 (서버). `given`은 새로 고르는 부분의 한글 (부모 성 글자 제외) */
export async function runSelfNaming(supabase: SupabaseClient, p: NamingParams, given: string): Promise<SelfNamingResult> {
  const nameError = checkSelfName(given, p.parentSurname?.hangul);
  if (nameError) return { ok: false, error: nameError };
  try {
    const base = await prepare(supabase, p);
    if (!base) return { ok: false, error: "성씨 한자를 사전에서 찾을 수 없습니다." };
    const syllables = [...given];
    const fetched = await Promise.all(syllables.map((eum) => fetchByEum(supabase, eum)));
    const built = syllables.map((eum, i) => selfSlotOf(eum, fetched[i], p.gender));
    const empty = built.find((b) => b.chars.length === 0);
    if (empty) return { ok: false, error: `'${empty.slot.eum}'에 쓸 수 있는 이름용 한자가 없어요.` };
    const table = buildSelfTable({
      surname: base.surname,
      prefix: base.prefix,
      saju: base.saju.yongsin,
      slotChars: built.map((b) => b.chars),
      slots: built.map((b) => b.slot),
    });
    return { ok: true, saju: base.saju, surname: base.surname, prefix: base.prefix, table };
  } catch (e) {
    console.error("[naming] 셀프 작명 실패", e);
    return { ok: false, error: "한자 사전을 불러오지 못했습니다." };
  }
}

/**
 * 고른 한자가 셀프 작명 후보에 있는지 (저장·결과 화면에서 주소로 들어온 조합을 확인할 때).
 * `givenHanja`·`given`은 새로 고르는 부분만
 */
export function isSelfSelectable(table: SelfTable, givenHanja: string, given: string): boolean {
  const h = [...givenHanja];
  const e = [...given];
  if (h.length !== table.slots.length || e.length !== table.slots.length) return false;
  return table.slots.every((s, i) => s.eum === e[i] && s.chars.some((c) => c.hanja === h[i]));
}
