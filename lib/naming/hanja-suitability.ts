/**
 * 한자 뜻이 이름에 어울리는지 판정 (영문 뜻풀이 · 한글 훈 · 교육용 여부 기반).
 *
 *   제외     부정적·불분명한 뜻, 또는 사물·도구·무기·신체·지명/성씨 전용·어조사 뜻인 비교육용 글자 → 후보에서 뺀다
 *   어색     사물 등의 뜻이지만 교육용인 글자 → 후보에 남기고 순위에서 크게 감점
 *   애매     교육용도 아니고 뜻이 긍정적이지도 않은 글자 → 감점
 *   보통     교육용 글자, 또는 뜻이 긍정적인 비교육용 글자
 *   좋음     뜻이 긍정적인 교육용 글자, 또는 자주 쓰는 이름 한자 허용 목록(name-hanja-allowlist.ts)
 */
import { hasAcceptableMeaning, hasPositiveMeaning } from "./hanja-meaning";
import { isAllowedNameHanja } from "./name-hanja-allowlist";

export type Suitability = "exclude" | "awkward" | "obscure" | "normal" | "good";

export const SUITABILITY_LABEL: Record<Suitability, string> = {
  exclude: "제외",
  awkward: "어색",
  obscure: "애매",
  normal: "보통",
  good: "좋음",
};

/**
 * 이름 뜻으로 어색한 영문 뜻풀이. 뒤쪽 뜻까지 보면 江("large river; ... surname")처럼 좋은 글자가 걸리므로
 * 첫 번째 뜻(첫 ; 또는 , 앞)에만 적용한다.
 */
const OBJECT_GLOSS =
  /\b(pestle|mortar|millstone|sieve|basket|bucket|ladle|spoon|chopsticks|bowl|cup|pot|kettle|cauldron|tripod|jar|urn|vessel|utensil|dish|plate|tray|lid|stopper|bottle|pitcher|axe|hatchet|adze|chisel|saw|drill|hammer|mallet|hoe|plow|plough|rake|shovel|spade|sickle|scythe|tool|implement|awl|gimlet|needle|nail|rivet|peg|hook|clasp|buckle|knife|sword|dagger|spear|lance|halberd|arrow|crossbow|armor|armour|helmet|shield|weapon|cart|wheel|axle|saddle|bridle|stirrup|halter|harness|rope|cord|net|trap|snare|cage|hinge|bolt|latch|stove|oven|kiln|furnace|brick|rafter|plank|bed|mat|cushion|pillow|curtain|broom|comb|bone|skull|liver|lung|kidney|stomach|intestine|bowels|belly|abdomen|gall|bladder|womb|navel|armpit|buttock|thigh|heel|tooth|teeth|tongue|throat|chin|cheek|jaw|nostril|eyelid|beard|whisker|skin|flesh|fat|sweat|saliva|phlegm|pus|boil|ulcer|tumor|wart|scar|itch|ammonium|sulfur|sulphur|arsenic|chemical|acid|alkali|surname|ancient family name|place name|used in place names|name of a|transliteration|phonetic|onomatopoeia|sound of|particle|interjection|measure word|classifier|box|chest|trunk|case|puppet|eggplant|mustard)\b/i;

/**
 * 이름 뜻으로 어색한 한글 훈 (단어 단위로 비교). 못(연못/쇠못)·신(신발/귀신)·창(창문/무기)처럼
 * 뜻이 여러 가지인 한 글자 단어는 오탐이 많아 넣지 않는다.
 */
const OBJECT_HUN = new Set(
  (
    "방아 투구 갑옷 그릇 솥 가마솥 시루 수레 바퀴 수레바퀴 굴대 도끼 칼 화살 낫 호미 쟁기 가래 삽 " +
    "광주리 바구니 소쿠리 항아리 단지 동이 술병 접시 국자 숟가락 젓가락 상자 궤 베개 휘장 장막 버선 " +
    "노끈 그물 덫 올가미 바늘 송곳 망치 톱 뼈 쓸개 창자 밥통 배꼽 겨드랑이 볼기 넓적다리 이빨 목구멍 " +
    "수염 살갗 땀 고름 종기 부스럼 사마귀 흉터 성씨 제기 고무래 서까래 기와가마 빗 발바닥 발자국"
  ).split(" ")
);

/** 지명·인명 전용 글자와 어조사 */
const NAME_OR_PARTICLE_HUN = /(땅|물|강|산|나라|고을|사람)\s?이름|어조사/;

const firstSense = (meaning: string | null) => (meaning ?? "").split(/[;,]/, 1)[0];

/** 사물·도구·지명 등 이름 뜻으로 어색한 글자인가 */
export function isObjectLike(meaning: string | null, hun: string | null): boolean {
  if (OBJECT_GLOSS.test(firstSense(meaning))) return true;
  if (!hun) return false;
  if (NAME_OR_PARTICLE_HUN.test(hun)) return true;
  return hun.split(/[\s,()]+|의\s/).some((w) => OBJECT_HUN.has(w));
}

export function classifyHanja(c: {
  hanja: string;
  eum: string;
  meaning: string | null;
  hun: string | null;
  isEdu: boolean;
}): Suitability {
  if (isAllowedNameHanja(c.hanja, c.eum)) return "good";
  if (!hasAcceptableMeaning(c.meaning)) return "exclude";
  if (isObjectLike(c.meaning, c.hun)) return c.isEdu ? "awkward" : "exclude";
  // 뜻풀이가 긍정적이어도 교육용이 아니면 이름에 잘 안 쓰는 글자가 많아(瑭·璐 등 옥 이름) 보통으로 본다
  if (hasPositiveMeaning(c.meaning)) return c.isEdu ? "good" : "normal";
  return c.isEdu ? "normal" : "obscure";
}
