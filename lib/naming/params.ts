import type { BirthInput } from "@/lib/saju";
import { resolveBirthplace, type Birthplace } from "@/lib/saju/birthplaces";
import { COMPOUND_SURNAMES } from "./surnames";

export interface NamingParams {
  surname: string; // 한글 성
  surnameHanja: string; // 한자 성 (글자 수는 surname과 동일)
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

export function parseNamingParams(raw: Raw): ParseResult {
  const surname = one(raw.surname).trim();
  const surnameHanja = one(raw.sh).trim();
  if (!HANGUL.test(surname) || surname.length > 2)
    return { ok: false, error: "성을 한글 1~2자로 입력해 주세요." };
  const expectedLen = surname.length === 2 && COMPOUND_SURNAMES.includes(surname) ? 2 : 1;
  if (surname.length !== expectedLen)
    return { ok: false, error: "지원하지 않는 성입니다. 단성(1자) 또는 복성(남궁 등)을 입력해 주세요." };
  if (!HANJA.test(surnameHanja) || [...surnameHanja].length !== expectedLen)
    return { ok: false, error: "성의 한자를 선택해 주세요." };

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
