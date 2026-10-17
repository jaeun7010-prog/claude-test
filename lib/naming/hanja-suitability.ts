/**
 * 한자 뜻이 이름에 어울리는지 판정 (영문 뜻풀이 · 한글 훈 · 교육용 여부 기반).
 *
 *   제외     부정적·불분명한 뜻(영문 뜻풀이 또는 한글 훈), 또는 사물·도구·무기·신체·지명/성씨 전용·어조사 뜻인
 *            비교육용 글자 → 후보에서 뺀다
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

/**
 * 부정적인 한글 훈 (단어 단위로 비교). 화면·PDF에 사전 훈이 그대로 보이므로("旱 가물 한"), 영문 뜻풀이가 무난해도
 * 훈이 이런 단어면 제외한다. 뜻이 여럿인 단어(병·울·미칠·장사·창·쇠·해·죽·종·벌·피·패·아득할)는 오탐이 많아 넣지 않는다.
 */
const NEGATIVE_HUN = new Set(
  [
    // 가뭄
    "가물 메마를",
    // 늙음·쇠함
    "늙을 늙은이 시들 파리할 수척할 여윌 약할",
    // 질병·상처
    "앓을 아플 옴 학질 두드러기 설사 기침 저릴 꼽추 난쟁이 대머리 다칠 토할",
    // 죽음
    "죽을 죽일 주검 상복",
    // 슬픔·근심
    "슬플 슬퍼할 근심할 걱정할 시름 탄식할 한탄할 원망할 원통할 외로울 울부짖을 흐느낄 눈물",
    // 가난·굶주림
    "구걸할 주릴",
    // 어둠
    "어두울 흐릴",
    // 나쁜 성품·행동
    "간사할 교활할 거짓 속일 게으를 교만할 탐할 아첨할 어리석을 둔할 사나울 모질 독할 노할 성낼 분할 " +
      "미워할 겁낼 부끄러울 욕될 배반할 어길 꾸짖을 때릴 찌를 벨 싸울 싸움 다툴 해칠 흉악할 도둑 원수 가둘 하인",
    // 재앙·혼란
    "재앙 죄 허물 어지러울 미혹할 무너질 떨어질 버릴 귀신 도깨비 고달플 피곤할",
    // 불결
    "더러울 비린내 오줌",
  ]
    .join(" ")
    .split(" ")
);

/** 단어로는 못 잡는 부정적인 훈 구절 */
const NEGATIVE_HUN_PHRASES = ["당기는 병", "배 앓을", "귀 울", "장사 지낼"];

/** 부정적인 단어가 들어 있어도 뜻이 부정적이지 않은 훈 구절 */
const NEGATIVE_HUN_EXCEPTIONS = ["물방울 떨어질", "방울져 떨어질", "병 나을", "매미 허물", "벼 벨", "풀 벨", "싸움 이긴"];

/** 한글 훈이 부정적인 뜻인가 (가뭄·늙음·질병·죽음·슬픔·가난·어둠 등) */
export function hasNegativeHun(hun: string | null): boolean {
  if (!hun || NEGATIVE_HUN_EXCEPTIONS.some((p) => hun.includes(p))) return false;
  if (NEGATIVE_HUN_PHRASES.some((p) => hun.includes(p))) return true;
  return hun.split(/[\s,()]+/).some((w) => NEGATIVE_HUN.has(w));
}

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
  if (!hasAcceptableMeaning(c.meaning) || hasNegativeHun(c.hun)) return "exclude";
  if (isObjectLike(c.meaning, c.hun)) return c.isEdu ? "awkward" : "exclude";
  // 뜻풀이가 긍정적이어도 교육용이 아니면 이름에 잘 안 쓰는 글자가 많아(瑭·璐 등 옥 이름) 보통으로 본다
  if (hasPositiveMeaning(c.meaning)) return c.isEdu ? "good" : "normal";
  return c.isEdu ? "normal" : "obscure";
}
