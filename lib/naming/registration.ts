/**
 * 부모 성 함께 쓰기의 출생신고 등록 형태.
 * 성은 하나만 등록하고(민법 제781조), 다른 부모의 성은 이름 앞부분으로 들어간다 (예: 김박서윤 → 성 김, 이름 박서윤).
 * 이름은 성을 빼고 5자 이내여야 하며(MAX_GIVEN_NAME_LENGTH), 한자는 인명용 한자만 쓸 수 있다.
 */

export interface Registration {
  surname: string;
  surnameHanja: string;
  /** 법적 이름 (다른 부모 성 포함) */
  given: string;
  givenHanja: string;
}

/** "성 김(金) · 이름 박서윤(朴瑞允)" */
export function registrationLine(r: Registration): string {
  return `성 ${r.surname}(${r.surnameHanja}) · 이름 ${r.given}(${r.givenHanja})`;
}

/** 받침이 없거나 ㄹ 받침이면 "로", 그 밖의 받침이면 "으로" */
function ro(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "(으)로";
  const coda = code % 28;
  return coda === 0 || coda === 8 ? "로" : "으로";
}

/** 결과 화면·마이페이지·PDF에 쓰는 안내 문장 */
export function registrationText(r: Registration): string {
  return `출생신고 시에는 ${registrationLine(r)}${ro(r.given)} 등록됩니다.`;
}

/** 등록 안내에 붙이는 확인 문구. 법령 해석이 확정되지 않은 부분이 있어 함께 보여 준다 */
export const REGISTRATION_CAVEAT =
  "다른 부모의 성은 법적으로 이름의 일부입니다. 이름 등급은 새로 고르는 부분 기준으로 매겼고, 법적 이름 전체 기준 점수는 각 이름의 자세히 보기에 있습니다. " +
  "이름은 성을 빼고 5자 이내, 한자는 인명용 한자만 쓸 수 있습니다. 실제 수리 여부는 관할 시·구·읍·면사무소에서 확인해 주세요.";
