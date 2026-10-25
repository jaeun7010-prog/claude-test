import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_GIVEN_NAME_LENGTH } from "@/lib/naming/analyze";
import { fetchSurname } from "@/lib/naming/hanja-repo";
import { meaningCharsLabel, nameMeaningOf } from "@/lib/naming/name-meaning";
import { NATIVE_NAMES } from "@/lib/naming/native-names";
import { defaultSurnameHanja, isSurnameHanja } from "@/lib/naming/surname-hanja";
import { COMPOUND_SURNAMES } from "@/lib/naming/surnames";

import { blessingText, isBlessingIndex } from "./blessings";
import { NATIVE_CARD_MEANING } from "./native-card-meaning";

/**
 * 공유용 이름 카드 (/s/[id], 2026-10-25 사용자 결정).
 * 이름과 뜻만 담는다. 생년월일·시각·출생지·성별·사주·점수는 받지도, 저장하지도 않는다.
 * 브라우저가 넘기는 것은 이름·한자·축원 번호뿐이고, 서버가 인명용 한자(순우리말이면 목록에 있는 이름)인지 확인한 뒤
 * 뜻·축원 문장을 만들어 name_shares에 넣는다. 같은 내용이면 같은 주소를 돌려준다.
 * 표는 정책이 없어 service_role(createAdminClient)로만 읽고 쓴다.
 */

/** 공유 페이지에서 축원을 고를 수 있게 붙이는 주소 표시 (카드를 만든 사람에게만) */
export const SHARE_EDIT_PARAM = "edit";

export type ShareKind = "hanja" | "native";

export interface ShareInput {
  kind: ShareKind;
  /** 성 (한글) */
  surname: string;
  /** 성 (한자). 순우리말이면 무시 */
  surnameHanja?: string | null;
  /** 법적 이름 (한글, 부모 성 함께 쓰기면 부모 성 포함: 박서윤) */
  given: string;
  /** 법적 이름 (한자). 순우리말이면 무시 */
  givenHanja?: string | null;
  /** 이름 앞의 부모 성 글자 수 (0: 없음) */
  prefixLength: number;
  blessingIndex: number;
}

export interface NameShare {
  id: string;
  kind: ShareKind;
  surname: string;
  surnameHanja: string | null;
  given: string;
  givenHanja: string | null;
  prefixLength: number;
  /** 카드 뜻 한 줄 */
  meaning: string;
  /** 한자 훈음 줄 (순우리말이면 null) */
  meaningChars: string | null;
  /** 공유 페이지에만 보이는 원래 뜻 전체 */
  meaningNote: string | null;
  blessingIndex: number;
  blessing: string;
}

type Content = Omit<NameShare, "id">;
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const HANGUL = /^[가-힣]+$/;
const HANJA = /^[一-鿿豈-﫿]+$/;
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** 성 소리: 단성 1자 또는 지원하는 복성, 성씨 표에 있는 소리 */
const isSurnameSound = (s: string) =>
  HANGUL.test(s) && (s.length === 1 || COMPOUND_SURNAMES.includes(s)) && defaultSurnameHanja(s) !== null;

/** 이름 앞 부모 성 길이 확인 (성 소리와 다르고, 새로 고르는 부분이 1자 이상) */
function checkPrefix(surname: string, given: string, prefixLength: number): Result<{ prefix: string; rest: string }> {
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 2) return fail("부모 성을 확인할 수 없어요.");
  const prefix = given.slice(0, prefixLength);
  const rest = given.slice(prefixLength);
  if (prefixLength > 0 && (!isSurnameSound(prefix) || prefix === surname)) return fail("부모 성을 확인할 수 없어요.");
  if (rest.length < 1) return fail("이름을 확인할 수 없어요.");
  return { ok: true, value: { prefix, rest } };
}

/** 인명용 한자이고 불용한자가 아닌지, 읽기가 이름 소리와 같은지 */
async function areNameHanja(supabase: SupabaseClient, hanja: string[], eum: string[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("hanja_dict")
    .select("hanja, eum")
    .in("hanja", hanja)
    .eq("is_name_hanja", true)
    .eq("is_forbidden", false);
  if (error) throw new Error(`한자 사전 조회 실패: ${error.message}`);
  const rows = (data ?? []) as { hanja: string; eum: string }[];
  return hanja.every((h, i) => rows.some((r) => r.hanja === h && r.eum === eum[i]));
}

async function hanjaContent(supabase: SupabaseClient, input: ShareInput, callName: string): Promise<Result<Content>> {
  const { surname, given, prefixLength, blessingIndex } = input;
  const surnameHanja = (input.surnameHanja ?? "").trim();
  const givenHanja = (input.givenHanja ?? "").trim();
  if (!HANJA.test(surnameHanja) || !isSurnameHanja(surname, surnameHanja)) return fail("성씨 한자를 확인할 수 없어요.");
  const hanja = [...givenHanja];
  if (!HANJA.test(givenHanja) || hanja.length !== given.length) return fail("이름 한자를 확인할 수 없어요.");

  const prefixHanja = hanja.slice(0, prefixLength).join("");
  if (prefixLength > 0 && !isSurnameHanja(given.slice(0, prefixLength), prefixHanja))
    return fail("부모 성 한자를 확인할 수 없어요.");
  const newHanja = hanja.slice(prefixLength);
  const newEum = [...given.slice(prefixLength)];
  if (!(await areNameHanja(supabase, newHanja, newEum))) return fail("인명용 한자가 아닌 글자가 있어요.");

  // 뜻은 새로 고르는 글자만 본다 (결과 카드의 이름 뜻 한 줄과 같다)
  const chars = await fetchSurname(supabase, newHanja, newEum);
  if (!chars) return fail("이름 한자를 확인할 수 없어요.");
  const meaning = nameMeaningOf(chars);
  const label = meaningCharsLabel(chars);
  return {
    ok: true,
    value: {
      kind: "hanja",
      surname,
      surnameHanja,
      given,
      givenHanja,
      prefixLength,
      // 문장이 없는 이름은 훈음 줄을 뜻 자리에 쓴다
      meaning: meaning?.sentence ?? label,
      meaningChars: label,
      meaningNote: null,
      blessingIndex,
      blessing: blessingText(callName, blessingIndex),
    },
  };
}

function nativeContent(input: ShareInput, rest: string, callName: string): Result<Content> {
  const entry = NATIVE_NAMES.find((n) => n.name === rest);
  if (!entry) return fail("순우리말 이름 목록에 없는 이름이에요.");
  const short = NATIVE_CARD_MEANING[entry.name];
  return {
    ok: true,
    value: {
      kind: "native",
      surname: input.surname,
      surnameHanja: null,
      given: input.given,
      givenHanja: null,
      prefixLength: input.prefixLength,
      meaning: short ?? entry.meaning,
      meaningChars: null,
      // 카드에 줄인 뜻을 썼으면 원래 뜻 전체(근거 안내 포함)를 공유 페이지에 남긴다
      meaningNote: short ? entry.meaning : null,
      blessingIndex: input.blessingIndex,
      blessing: blessingText(callName, input.blessingIndex),
    },
  };
}

/** 입력을 확인하고 카드 내용을 만든다 (저장하지 않음) */
export async function buildShareContent(supabase: SupabaseClient, raw: ShareInput): Promise<Result<Content>> {
  const input = { ...raw, surname: raw.surname.trim(), given: raw.given.trim() };
  if (input.kind !== "hanja" && input.kind !== "native") return fail("이름 종류를 확인할 수 없어요.");
  if (!isSurnameSound(input.surname)) return fail("성을 확인할 수 없어요.");
  if (!HANGUL.test(input.given) || input.given.length > MAX_GIVEN_NAME_LENGTH) return fail("이름을 확인할 수 없어요.");
  if (!isBlessingIndex(input.blessingIndex)) return fail("축원 문장을 확인할 수 없어요.");
  const parts = checkPrefix(input.surname, input.given, input.prefixLength);
  if (!parts.ok) return parts;
  // 부르는 이름은 새로 고르는 부분 (김박서윤 → 서윤아)
  const callName = parts.value.rest;
  return input.kind === "hanja"
    ? hanjaContent(supabase, input, callName)
    : nativeContent(input, parts.value.rest, callName);
}

const contentKey = (c: Content) =>
  [c.kind, c.surname, c.surnameHanja ?? "", c.given, c.givenHanja ?? "", c.prefixLength, c.blessingIndex].join("|");

const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // 헷갈리는 0·O·1·l·I 뺌
const ID_LENGTH = 8;
export const isShareId = (id: string) => id.length === ID_LENGTH && [...id].every((c) => ID_CHARS.includes(c));

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes, (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}

interface Row {
  id: string;
  kind: ShareKind;
  surname: string;
  surname_hanja: string | null;
  given_name: string;
  given_name_hanja: string | null;
  prefix_length: number;
  meaning: string;
  meaning_chars: string | null;
  meaning_note: string | null;
  blessing_index: number;
  blessing: string;
}

const fromRow = (r: Row): NameShare => ({
  id: r.id,
  kind: r.kind,
  surname: r.surname,
  surnameHanja: r.surname_hanja,
  given: r.given_name,
  givenHanja: r.given_name_hanja,
  prefixLength: r.prefix_length,
  meaning: r.meaning,
  meaningChars: r.meaning_chars,
  meaningNote: r.meaning_note,
  blessingIndex: r.blessing_index,
  blessing: r.blessing,
});

/**
 * 카드를 만들고 주소 id를 돌려준다. 같은 내용(종류·이름·한자·축원)이 있으면 그 id.
 * supabase: 한자 사전 조회용(일반 서버 클라이언트), admin: name_shares 읽기·쓰기(service_role)
 */
export async function createNameShare(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  input: ShareInput
): Promise<Result<string>> {
  const built = await buildShareContent(supabase, input);
  if (!built.ok) return built;
  const c = built.value;
  const key = contentKey(c);

  const existing = await admin.from("name_shares").select("id").eq("content_key", key).maybeSingle();
  if (existing.error) throw new Error(`공유 카드 조회 실패: ${existing.error.message}`);
  if (existing.data) return { ok: true, value: (existing.data as { id: string }).id };

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newId();
    const { error } = await admin.from("name_shares").insert({
      id,
      content_key: key,
      kind: c.kind,
      surname: c.surname,
      surname_hanja: c.surnameHanja,
      given_name: c.given,
      given_name_hanja: c.givenHanja,
      prefix_length: c.prefixLength,
      meaning: c.meaning,
      meaning_chars: c.meaningChars,
      meaning_note: c.meaningNote,
      blessing_index: c.blessingIndex,
      blessing: c.blessing,
    });
    if (!error) return { ok: true, value: id };
    if (error.code !== "23505") throw new Error(`공유 카드 저장 실패: ${error.message}`);
    // 같은 내용을 동시에 만들었으면 그 id, 아니면 id가 겹친 것이라 다시 만든다
    const again = await admin.from("name_shares").select("id").eq("content_key", key).maybeSingle();
    if (again.data) return { ok: true, value: (again.data as { id: string }).id };
  }
  throw new Error("공유 카드 주소를 만들지 못했습니다.");
}

export async function loadNameShare(admin: SupabaseClient, id: string): Promise<NameShare | null> {
  if (!isShareId(id)) return null;
  const { data, error } = await admin.from("name_shares").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`공유 카드 조회 실패: ${error.message}`);
  return data ? fromRow(data as Row) : null;
}

/** 카드 이름 줄: 金霞潾 / 김하린 */
export const shareFullName = (s: NameShare) => `${s.surname}${s.given}`;
export const shareFullHanja = (s: NameShare) => (s.givenHanja ? `${s.surnameHanja ?? ""}${s.givenHanja}` : null);
