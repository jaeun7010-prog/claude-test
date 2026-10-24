import type { BirthInput } from "@/lib/saju";
import { CUSTOM_BIRTHPLACE_ID, resolveBirthplace, type Birthplace } from "@/lib/saju/birthplaces";
import { COMMON_SURNAMES, COMPOUND_SURNAMES } from "./surnames";

export interface NamingParams {
  surname: string; // 한글 성
  surnameHanja: string; // 한자 성 (글자 수는 surname과 동일)
  /**
   * 부모 성 함께 쓰기 (예: 김박서윤의 박). 법적 성은 surname 하나이고, 이 성은 이름 앞부분으로 등록된다.
   * URL `ps`(한글)·`psh`(한자). 없으면 null
   */
  parentSurname: { hangul: string; hanja: string } | null;
  /**
   * 주소의 성씨 한자(sh·psh)가 비어 있거나 형식이 맞지 않아 기본 한자(COMMON_SURNAMES)로 바꾼 성 (한글).
   * 결과 화면에 "기본 한자로 계산했어요"를 알린다. 주소로 다시 만들 때(toNamingQuery)는 바꾼 한자가 들어간다
   */
  defaultedSurnames: string[];
  birth: BirthInput;
  /** 출생지. 예전 링크처럼 place가 없으면 서울 */
  birthplace: Birthplace;
  hasTime: boolean;
  gender: "male" | "female" | "neutral";
  length: "1" | "2" | "any";
  dolrimja: { syllable: string; position: 1 | 2 } | null;
  /** 글로벌 발음 호환 점수 필터 사용 여부 */
  globalFriendly: boolean;
  /** 젠더 뉴트럴(성비가 한쪽으로 치우치지 않은) 이름만 */
  neutral: boolean;
  /**
   * 희소성 선호 (예전 입력 폼의 값). 폼에서는 빠졌고, 예전 링크로 들어오면 결과 화면의 첫 정렬로 이어받는다
   * (rare → 희귀한 이름순, common → 인기 이름순)
   */
  rarity: "any" | "rare" | "common";
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const HANGUL = /^[가-힣]+$/;
const HANJA = /^\p{Script=Han}+$/u;

export type ParseResult =
  | { ok: true; value: NamingParams }
  | { ok: false; error: string };

/**
 * 성(한글·한자) 검증. 2자는 복성 목록에 있을 때만 받는다.
 * 한자가 비어 있거나 형식이 맞지 않으면 그 성의 기본 한자(COMMON_SURNAMES)를 쓴다 (예전 폼은 鄭이 후보 60개 밖이라
 * 정씨가 丁으로 들어갔다. 2026-10-24 사용자 결정). 기본 한자가 없는 성은 오류
 */
function checkSurname(
  hangul: string,
  hanja: string,
  label: string
): { error: string } | { hanja: string; defaulted: boolean } {
  if (!HANGUL.test(hangul) || hangul.length > 2) return { error: `${label}을 한글 1~2자로 입력해 주세요.` };
  if (hangul.length === 2 && !COMPOUND_SURNAMES.includes(hangul))
    return {
      error: `지원하지 않는 ${label}입니다. 단성(1자) 또는 복성(남궁 등)을 입력해 주세요. 두 부모의 성을 함께 쓰려면 "부모 성 함께 쓰기"를 선택해 주세요.`,
    };
  if (HANJA.test(hanja) && [...hanja].length === hangul.length) return { hanja, defaulted: false };
  const fallback = COMMON_SURNAMES[hangul];
  return fallback ? { hanja: fallback, defaulted: true } : { error: `${label}의 한자를 선택해 주세요.` };
}

export function parseNamingParams(raw: Raw): ParseResult {
  const surname = one(raw.surname).trim();
  const checked = checkSurname(surname, one(raw.sh).trim(), "성");
  if ("error" in checked) return { ok: false, error: checked.error };
  const surnameHanja = checked.hanja;
  const defaultedSurnames = checked.defaulted ? [surname] : [];

  let parentSurname: NamingParams["parentSurname"] = null;
  const ps = one(raw.ps).trim();
  if (ps) {
    const parent = checkSurname(ps, one(raw.psh).trim(), "함께 쓸 부모 성");
    if ("error" in parent) return { ok: false, error: parent.error };
    if (ps === surname)
      return { ok: false, error: "함께 쓸 부모 성이 아이의 성과 같습니다. 다른 부모의 성을 입력해 주세요." };
    parentSurname = { hangul: ps, hanja: parent.hanja };
    if (parent.defaulted) defaultedSurnames.push(ps);
  }

  const date = one(raw.date);
  const dm = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dm) return { ok: false, error: "생년월일을 입력해 주세요." };
  const [year, month, day] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  )
    return { ok: false, error: "존재하지 않는 날짜입니다." };
  if (year < 1901 || year > 2099)
    return { ok: false, error: "1901~2099년 사이의 날짜만 지원합니다." };

  const time = one(raw.time);
  const tm = time.match(/^(\d{2}):(\d{2})$/);
  const hasTime = !!tm;
  const hour = tm ? Number(tm[1]) : undefined;
  const minute = tm ? Number(tm[2]) : undefined;
  if (tm && (hour! > 23 || minute! > 59))
    return { ok: false, error: "출생 시각이 올바르지 않습니다." };

  const lateNight = one(raw.late) === "same-day" ? "same-day" : "next-day";

  const birthplace = resolveBirthplace(one(raw.place), {
    timeZone: one(raw.tz),
    longitude: one(raw.lon),
  });
  if (!birthplace)
    return { ok: false, error: "출생지를 확인해 주세요. 기타 해외는 시간대와 경도를 모두 입력해야 합니다." };

  const g = one(raw.gender);
  const gender = g === "male" || g === "female" ? g : "neutral";

  const l = one(raw.len);
  const length = l === "1" || l === "2" ? l : "any";

  let dolrimja: NamingParams["dolrimja"] = null;
  const dol = one(raw.dol).trim();
  if (dol) {
    if (!HANGUL.test(dol) || dol.length !== 1)
      return { ok: false, error: "돌림자는 한글 한 글자로 입력해 주세요." };
    if (length === "1")
      return { ok: false, error: "외자 이름에는 돌림자를 적용할 수 없습니다." };
    dolrimja = { syllable: dol, position: one(raw.dolpos) === "1" ? 1 : 2 };
  }

  return {
    ok: true,
    value: {
      surname,
      surnameHanja,
      parentSurname,
      defaultedSurnames,
      birth: {
        year,
        month,
        day,
        hour,
        minute,
        lateNight,
        timeZone: birthplace.timeZone,
        longitude: birthplace.longitude,
      },
      birthplace,
      hasTime,
      gender,
      length,
      dolrimja,
      globalFriendly: one(raw.glob) === "1",
      neutral: one(raw.neutral) === "1",
      rarity: one(raw.rarity) === "rare" ? "rare" : one(raw.rarity) === "common" ? "common" : "any",
    },
  };
}

/**
 * NamingParams → 결과 화면 쿼리스트링 (parseNamingParams 의 역). 같은 조건이면 항상 같은 문자열이 나온다.
 * 저장된 작명을 "최신 기준으로 다시 분석"할 때와 리포트 결제 여부(같은 조건인지)를 비교할 때 쓴다.
 * withRarity=false 면 정렬에만 쓰는 rarity 를 뺀다 (분석 결과와 상관없음)
 */
export function toNamingQuery(p: NamingParams, withRarity = true): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const q = new URLSearchParams();
  q.set("surname", p.surname);
  q.set("sh", p.surnameHanja);
  if (p.parentSurname) {
    q.set("ps", p.parentSurname.hangul);
    q.set("psh", p.parentSurname.hanja);
  }
  q.set("date", `${p.birth.year}-${pad(p.birth.month)}-${pad(p.birth.day)}`);
  if (p.hasTime) q.set("time", `${pad(p.birth.hour!)}:${pad(p.birth.minute ?? 0)}`);
  if (p.birth.lateNight === "same-day") q.set("late", "same-day");
  q.set("place", p.birthplace.id);
  if (p.birthplace.id === CUSTOM_BIRTHPLACE_ID) {
    q.set("tz", p.birthplace.timeZone);
    q.set("lon", String(p.birthplace.longitude));
  }
  q.set("gender", p.gender);
  if (p.length !== "any") q.set("len", p.length);
  if (p.dolrimja) {
    q.set("dol", p.dolrimja.syllable);
    q.set("dolpos", String(p.dolrimja.position));
  }
  if (p.globalFriendly) q.set("glob", "1");
  if (p.neutral) q.set("neutral", "1");
  if (withRarity && p.rarity !== "any") q.set("rarity", p.rarity);
  return q.toString();
}

/** 쿼리스트링을 같은 조건끼리 비교할 수 있는 키로 바꾼다 (읽을 수 없으면 null) */
export function namingConditionKey(qs: string): string | null {
  const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(qs)));
  return parsed.ok ? toNamingQuery(parsed.value, false) : null;
}
