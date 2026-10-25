/**
 * 셀프 작명(직접 짓기) 화면 사이를 오가는 주소. 브라우저에서도 쓰므로 엔진·params.ts를 가져오지 않는다.
 *  - 고르기 화면 `/naming/self?{조건}&given=서윤&hj=瑞_` (hj: 자리마다 한자, 안 고른 자리는 _)
 *  - 고른 조합 결과 화면 `/naming/self/result?{조건}&given=서윤&hj=瑞允`
 *  - 추천받기로 넘어갈 때 `/naming/result?…&sg=서윤&shj=瑞允` → 결과 화면 위 "직접 짓기로 돌아가기"
 *  - 리포트·굿즈 `/goods?…&from=self` → 주소의 조합이 셀프 작명 후보인지 확인 (isSelfSelectable)
 * `q`는 셀프 작명 입력 조건 (selfQueryOf)
 */

/** 추천받기 결과 화면에서 직접 짓기로 돌아갈 때 쓰는 이름·고른 한자 */
export const FROM_SELF_GIVEN = "sg";
export const FROM_SELF_HANJA = "shj";
/** 리포트·굿즈 주문이 셀프 작명 조합에서 왔다는 표시 (item_options.qs 에 남는다) */
export const SELF_SOURCE_PARAM = "from";
export const SELF_SOURCE_VALUE = "self";

const enc = encodeURIComponent;

/** 주소에서 읽은 hj를 자리 수에 맞게 다듬는다 (한자 한 글자 또는 _ 만, 길이가 다르면 빈 값) */
export function cleanSelfHanja(hj: string, length: number): string {
  const h = [...hj];
  if (h.length !== length) return "";
  return h.every((c) => c === "_" || /^\p{Script=Han}$/u.test(c)) ? hj : "";
}

export const selfPickHref = (q: string, given: string, hj = "") =>
  `/naming/self?${q}&given=${enc(given)}${hj && /[^_]/.test(hj) ? `&hj=${enc(hj)}` : ""}`;

export const selfResultHref = (q: string, given: string, hj: string) =>
  `/naming/self/result?${q}&given=${enc(given)}&hj=${enc(hj)}`;

/** 추천받기 주소에 직접 짓기로 돌아올 이름·한자를 붙인다 */
export const withFromSelf = (href: string, given: string, hj: string) =>
  `${href}&${FROM_SELF_GIVEN}=${enc(given)}${hj && /[^_]/.test(hj) ? `&${FROM_SELF_HANJA}=${enc(hj)}` : ""}`;

export const isSelfSource = (qs: string) => new URLSearchParams(qs).get(SELF_SOURCE_PARAM) === SELF_SOURCE_VALUE;
