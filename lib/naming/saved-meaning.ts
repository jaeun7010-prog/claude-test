import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchSurname } from "./hanja-repo";
import { nameMeaningOf, type NameMeaning } from "./name-meaning";
import type { SavedNaming } from "./saved";

/**
 * 저장한 이름의 이름 뜻 한 줄 (무료).
 * 저장 스냅숏(version 4~)에 있으면 그 문장, 없는 예전 저장분은 지금 문구 표로 만든다 (2026-10-18 사용자 결정).
 * 훈은 사전에서 다시 읽는다 (이름용 대표 풀이 포함). 부모 성 함께 쓰기는 새로 고르는 글자만 본다.
 */
export async function savedNameMeaning(supabase: SupabaseClient, s: SavedNaming): Promise<NameMeaning | null> {
  if (s.snapshot?.texts.nameMeaning !== undefined) return s.snapshot.texts.nameMeaning;
  const skip = s.parentSurname ? [...s.parentSurname.hanja].length : 0;
  const hanja = [...s.givenHanja].slice(skip);
  const eum = [...s.given].slice(skip);
  if (hanja.length === 0 || hanja.length !== eum.length) return null;
  try {
    const chars = await fetchSurname(supabase, hanja, eum);
    return chars ? nameMeaningOf(chars) : null;
  } catch (e) {
    console.error("[saved-meaning] 한자 조회 실패", e);
    return null;
  }
}
