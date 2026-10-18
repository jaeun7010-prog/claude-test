/**
 * 우리말 이름 점수 (100점). 순우리말 이름은 한자가 없어 수리·자원오행을 볼 수 없으므로 소리와 뜻으로만 본다.
 * 용신 보완 35 · 발음오행 흐름 25 · 뜻 20 · 부르기 쉬움 20. S/A/B/C 등급은 쓰지 않는다 (한자 이름의 성명학 등급과 기준이 다르다).
 * 용신을 모르면(생일 없음) 용신 항목을 빼고 나머지 65점을 100점으로 환산한다.
 */
import { pronunciationWeights } from "../analyze";
import { evaluateFlow, pronunciationElement } from "../elements";
import type { NativeName } from "../native-names";
import { sajuCharScore } from "../score";
import { harmony } from "../trend";
import type { Element, Relation } from "../types";

export const NATIVE_SCORE_WEIGHTS = {
  yongsin: 35,
  flow: 25,
  meaning: 20,
  easy: 20,
} as const;

const MEANING_SCORE: Record<NativeName["meaningGrade"], number> = { good: 1, normal: 0.6 };

export const NO_BIRTH_NOTICE = "생일을 넣으면 사주 보완까지 반영돼요";

/**
 * 부르기 쉬움이 이 점수 미만이면 총점에서 HARD_TO_SAY_PENALTY를 더 뺀다 (2026-10-18 사용자 결정).
 * 부르기 쉬움은 총점의 20%라 박꽃길처럼 소리가 거친 이름도 용신·흐름이 좋으면 상위에 올랐다. 점수 틀(35/25/20/20)은 그대로 둔다.
 * 강한 놀림말 이름은 이미 맨 뒤로 가므로 빼지 않는다.
 */
export const HARD_TO_SAY_BELOW = 50;
export const HARD_TO_SAY_PENALTY = 10;
export const HARD_TO_SAY_LABEL = "성과 붙이면 발음이 조금 어려워요";

export const CATEGORY_LABEL: Record<NativeName["category"], string> = {
  dictionary: "사전에 있는 말",
  coined: "이름용으로 만든 말",
  popular: "널리 쓰이는 이름",
};

// ---------------------------------------------------------------------------
// 한글 음절 분해
// ---------------------------------------------------------------------------
const BASE = 0xac00;
const ONSETS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const CODAS = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

interface Syllable {
  onset: string;
  vowel: number;
  coda: string;
}

function split(ch: string): Syllable | null {
  const code = ch.charCodeAt(0) - BASE;
  if (code < 0 || code > 11171) return null;
  return { onset: ONSETS[Math.floor(code / 588)], vowel: Math.floor((code % 588) / 28), coda: CODAS[code % 28] };
}

/** 된소리를 예사소리로 (같은 첫소리 비교용) */
const PLAIN: Record<string, string> = { ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" };
const plain = (c: string) => PLAIN[c] ?? c;

/** 받침 유무에 따른 조사: 과/와, 으로/로 (ㄹ 받침은 로) */
const gwa = (w: string) => `'${w}'` + (split([...w].at(-1) ?? "")?.coda ? "과" : "와");
const euro = (w: string) => {
  const coda = split([...w].at(-1) ?? "")?.coda;
  return `'${w}'` + (coda && coda !== "ㄹ" ? "으로" : "로");
};

/** 받침의 대표음이 ㄱ·ㄷ·ㅂ인 받침 (뒤 소리를 된소리로 만들고 거세게 들린다) */
const HARD_CODA: Record<string, "ㄱ" | "ㄷ" | "ㅂ"> = {
  ㄱ: "ㄱ", ㄲ: "ㄱ", ㅋ: "ㄱ", ㄳ: "ㄱ", ㄺ: "ㄱ",
  ㄷ: "ㄷ", ㅅ: "ㄷ", ㅆ: "ㄷ", ㅈ: "ㄷ", ㅊ: "ㄷ", ㅌ: "ㄷ", ㅎ: "ㄷ",
  ㅂ: "ㅂ", ㅍ: "ㅂ", ㅄ: "ㅂ", ㄼ: "ㅂ", ㄿ: "ㅂ",
};
/** 같은 자리에서 나는 첫소리 (받침 대표음 → 첫소리) */
const SAME_PLACE: Record<"ㄱ" | "ㄷ" | "ㅂ", string> = { ㄱ: "ㄱㄲㅋ", ㄷ: "ㄷㄸㅌ", ㅂ: "ㅂㅃㅍ" };

const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// 부르기 쉬움 감점 (0~100점에서 뺀다)
// ---------------------------------------------------------------------------
export const EASE_PENALTY = {
  /** 받침 조화: (1 − harmony) × 이 값. 받침 없음 1 · ㄴㄹㅁㅇ 0.85 · 거센 받침 0.5 */
  harmony: 40,
  /** 성 끝 음절과 이름 첫 음절의 첫소리·모음이 같음 (박바위, 김기쁨, 이이슬) */
  sameSyllable: 25,
  /** 성 받침과 이름 첫소리가 같은 자리 소리라 된소리로 뭉침 (박가람 [박까람]) */
  samePlace: 20,
  /** 이름 첫소리가 바뀌어 들림: ㄹ 첫소리 (김라온 [김나온], 한라온 [할라온]), ㄹ 받침 + ㄴ (설나래 [설라래]) */
  onsetChange: 10,
  /** 성 받침이 이름 첫 모음으로 넘어감 (김아름 [기마름]). 흔한 일이라 작게 */
  liaison: 5,
  /** 성을 포함한 이름 전체에서 같은 첫소리가 3번 이상 (김가꿈) */
  repeatedOnset: 40,
  /** 거센 받침이 이어짐 (박햇살 [바캗쌀]) */
  hardCodaRun: 25,
  /** 성과 합쳤을 때 약한 놀림말. 강한 놀림말은 부르기 쉬움 0점 + 목록 맨 뒤 */
  teasingMild: 25,
} as const;

/**
 * 성과 합쳤을 때 앞부분이 놀림말이 되는 경우 (전체 이름이 이 말로 시작하면 감점).
 * 목록에서 이름을 빼지 않고 점수·순서로만 반영한다. 추가·삭제할 때는 사용자에게 표로 먼저 보여 주고 확인받는다.
 * - strong: 뜻이 나쁜 말 (이별, 범죄, 손해 등). 부르기 쉬움 0점, 목록 맨 뒤
 * - mild: 동물·사물·가벼운 놀림. 감점만
 * 2026-10-18 사용자 결정: 고아(고 + 아름·아라·아리·아람)는 흔한 이름이라 넣지 않는다. 김새(김새봄 등)·김빠(김바람)도 넣지 않는다.
 */
export const TEASING_WORDS: readonly { word: string; meaning: string; level: "strong" | "mild" }[] = [
  { word: "이별", meaning: "헤어짐", level: "strong" },
  { word: "차별", meaning: "차별", level: "strong" },
  { word: "공범", meaning: "범죄를 함께 저지른 사람", level: "strong" },
  { word: "주범", meaning: "범죄를 주도한 사람", level: "strong" },
  { word: "강도", meaning: "강도", level: "strong" },
  { word: "사기", meaning: "속임", level: "strong" },
  { word: "피바다", meaning: "피바다", level: "strong" },
  { word: "변기", meaning: "변기", level: "strong" },
  { word: "방구", meaning: "방귀", level: "strong" },
  { word: "손해", meaning: "손해", level: "strong" },
  { word: "피해", meaning: "피해", level: "strong" },
  { word: "공해", meaning: "공해", level: "strong" },
  { word: "방해", meaning: "방해", level: "mild" },
  { word: "오해", meaning: "오해", level: "mild" },
  { word: "위기", meaning: "위기", level: "mild" },
  { word: "한숨", meaning: "한숨", level: "mild" },
  { word: "고기", meaning: "고기", level: "mild" },
  { word: "모기", meaning: "모기", level: "mild" },
  { word: "맹구", meaning: "만화 속 바보 캐릭터", level: "mild" },
  { word: "문어", meaning: "문어", level: "mild" },
  { word: "장어", meaning: "장어", level: "mild" },
  { word: "홍어", meaning: "홍어", level: "mild" },
  { word: "연어", meaning: "연어", level: "mild" },
  { word: "상어", meaning: "상어", level: "mild" },
  { word: "전어", meaning: "전어", level: "mild" },
  { word: "하마", meaning: "하마", level: "mild" },
  { word: "엄마", meaning: "엄마", level: "mild" },
  { word: "도마", meaning: "도마", level: "mild" },
  { word: "여우", meaning: "여우", level: "mild" },
  { word: "염소", meaning: "염소", level: "mild" },
];

export interface EasePenalty {
  reason: string;
  points: number;
}

/** 성과 합쳤을 때 놀림말. label은 카드에 붙이는 문구 */
export interface Teasing {
  word: string;
  level: "strong" | "mild";
  label: string;
}

/** 부르기 쉬움 (0~100)과 감점 이유. surname은 발음상 이름 바로 앞에 오는 고정 부분 전체 (성, 복성, 성 + 부모 성) */
export function easeScore(
  surname: string,
  given: string
): { score: number; penalties: EasePenalty[]; teasing: Teasing | null } {
  const penalties: EasePenalty[] = [];
  const add = (reason: string, points: number) => penalties.push({ reason, points });
  const P = EASE_PENALTY;
  const givenChars = [...given];
  const full = surname + given;
  const fullSyl = [...full].map(split);

  const h = harmony(givenChars);
  if (h < 1) {
    const hasHard = givenChars.some((c) => HARD_CODA[split(c)?.coda ?? ""]);
    add(hasHard ? "이름에 거센 받침(ㄱ·ㄷ·ㅂ 소리)이 있음" : "이름에 받침(ㄴ·ㄹ·ㅁ·ㅇ)이 있음", round1((1 - h) * P.harmony));
  }

  const last = split([...surname].at(-1) ?? "");
  const first = split(givenChars[0] ?? "");
  if (last && first) {
    const hard = HARD_CODA[last.coda];
    if (last.onset === first.onset && last.vowel === first.vowel) {
      add(`성 ${gwa([...surname].at(-1)!)} 이름 첫 글자 '${givenChars[0]}'의 소리가 겹침`, P.sameSyllable);
    } else if (hard && SAME_PLACE[hard].includes(first.onset)) {
      add(`성 받침과 이름 첫소리가 부딪혀 된소리로 뭉침`, P.samePlace);
    }
    if (first.onset === "ㄹ" && last.coda !== "") {
      add(`성 받침 뒤에서 이름 첫소리 'ㄹ'이 달리 들림`, P.onsetChange);
    } else if (last.coda === "ㄹ" && first.onset === "ㄴ") {
      add(`성 받침 'ㄹ' 뒤에서 이름 첫소리 'ㄴ'이 'ㄹ'로 들림`, P.onsetChange);
    } else if (first.onset === "ㅇ" && last.coda !== "" && last.coda !== "ㅇ") {
      add(`성 받침이 이름 첫 글자로 넘어가 소리남`, P.liaison);
    }
  }

  const counts = new Map<string, number>();
  // ㅇ은 소리가 없는 첫소리라 세지 않는다
  for (const s of fullSyl) if (s && s.onset !== "ㅇ") counts.set(plain(s.onset), (counts.get(plain(s.onset)) ?? 0) + 1);
  // 성 받침이 이름 첫소리와 같은 자리 소리면 그 받침도 한 번으로 센다 (박가꿈 [박까꿈]: ㄱ·ㄲ·ㄲ, 2026-10-18 사용자 결정)
  if (last && first && HARD_CODA[last.coda] && SAME_PLACE[HARD_CODA[last.coda]].includes(first.onset)) {
    const k = plain(first.onset);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (Math.max(0, ...counts.values()) >= 3) add("같은 첫소리가 여러 번 반복됨", P.repeatedOnset);

  for (let i = 0; i + 1 < fullSyl.length; i++) {
    const a = fullSyl[i], b = fullSyl[i + 1];
    if (a && b && HARD_CODA[a.coda] && HARD_CODA[b.coda]) {
      add("거센 받침이 이어짐", P.hardCodaRun);
      break;
    }
  }

  const hit = TEASING_WORDS.find((t) => t.word.length > surname.length && full.startsWith(t.word));
  const teasing: Teasing | null = hit
    ? { word: hit.word, level: hit.level, label: `성과 붙이면 '${hit.word}'처럼 들릴 수 있어요` }
    : null;
  if (teasing) {
    const reason = `성과 합치면 ${euro(teasing.word)} 들릴 수 있음`;
    if (teasing.level === "strong") return { score: 0, penalties: [...penalties, { reason, points: 100 }], teasing };
    add(reason, P.teasingMild);
  }

  const total = penalties.reduce((s, p) => s + p.points, 0);
  return { score: Math.max(0, round1(100 - total)), penalties, teasing };
}

// ---------------------------------------------------------------------------
// 우리말 이름 점수
// ---------------------------------------------------------------------------
export interface NativeSaju {
  /** 용신 */
  needed: Element;
  /** 희신 */
  favorable: Element;
  /** 기신 */
  unfavorable: Element;
}

export interface NativeScoreInput {
  name: NativeName;
  /** 한글 성 (단성·복성) */
  surname: string;
  /**
   * 성 뒤에 붙는 고정 부분 (부모 성 함께 쓰기의 부모 성). 있으면 발음오행 흐름은 이 부분의 끝 글자부터 보고,
   * 부르기 쉬움도 이 부분과 새 이름 사이를 본다
   */
  prefix?: string;
  /** 사주 정보. 생일이 없으면 생략 */
  saju?: NativeSaju;
}

export interface NativeScoreItem {
  /** 0~100. 판단할 수 없으면 null (생일 없음의 용신 보완) */
  score: number | null;
  /** 항목별 한 줄 설명 */
  note: string;
}

export interface NativeScore {
  name: string;
  /** 우리말 이름 점수 (0~100) */
  total: number;
  items: {
    yongsin: NativeScoreItem;
    flow: { score: number; note: string; elements: Element[]; relations: Relation[] };
    meaning: NativeScoreItem;
    easy: { score: number; note: string; penalties: EasePenalty[] };
  };
  /** 성과 합쳤을 때 놀림말 (카드 표시용). 강한 놀림말이면 목록 맨 뒤로 보낸다 */
  teasing: Teasing | null;
  /** 부르기 쉬움이 HARD_TO_SAY_BELOW 미만이라 총점에서 더 뺀 점수 (0 또는 HARD_TO_SAY_PENALTY) */
  hardToSayPenalty: number;
  /** 카드에 붙이는 발음 안내 (HARD_TO_SAY_LABEL). 해당 없으면 null */
  hardToSay: string | null;
  /** 생일이 없어 용신 보완을 빼고 환산했을 때의 안내 */
  notice: string | null;
}

const ROLE_LABEL = (score: number) =>
  score === 1 ? "용신" : score === 0.6 ? "희신" : score === 0 ? "기신" : "중립";

export function scoreNativeName({ name, surname, prefix = "", saju }: NativeScoreInput): NativeScore {
  const given = [...name.name];
  const fixed = surname + prefix;

  // 용신 보완: 이름 글자마다 첫소리 발음오행이 용신·희신·중립·기신인가
  let yongsin: NativeScoreItem;
  if (saju) {
    const per = given.map((ch) => {
      const el = pronunciationElement(ch);
      const s = sajuCharScore(el, saju) ?? 0;
      return { ch, el, s };
    });
    const avg = per.reduce((a, p) => a + p.s, 0) / per.length;
    yongsin = {
      score: round1(avg * 100),
      note: per.map((p) => `${p.ch} ${p.el ?? "?"}(${ROLE_LABEL(p.s)})`).join(" · ") + ` — 용신 ${saju.needed}`,
    };
  } else {
    yongsin = { score: null, note: NO_BIRTH_NOTICE };
  }

  // 발음오행 흐름: 성(복성은 두 글자) → 이름. 부모 성이 있으면 부모 성 끝 글자부터
  const pronFixed = prefix ? [...prefix].slice(-1) : [...surname];
  const chars = [...pronFixed, ...given];
  const els = chars.map(pronunciationElement);
  const known = els.filter((e): e is Element => e !== null);
  const flowResult = evaluateFlow(
    known,
    known.length === els.length ? pronunciationWeights(pronFixed.length, given.length) : undefined
  );
  const flow = {
    score: flowResult.score,
    elements: flowResult.elements,
    relations: flowResult.relations,
    note: `${chars.map((c, i) => `${c}(${els[i] ?? "?"})`).join(" → ")}: ${flowResult.relations.join(" · ")}`,
  };

  const meaning: NativeScoreItem = {
    score: MEANING_SCORE[name.meaningGrade] * 100,
    note: `${CATEGORY_LABEL[name.category]} · 뜻 ${name.meaningGrade === "good" ? "좋음" : "보통"}`,
  };

  const ease = easeScore(fixed, name.name);
  const easy = {
    score: ease.score,
    penalties: ease.penalties,
    // 받침 하나 정도의 작은 감점(5점 미만)은 설명에 넣지 않는다
    note:
      ease.penalties.filter((p) => p.points >= 5).map((p) => p.reason).join(", ") || "걸리는 소리 없이 부르기 편해요",
  };

  const W = NATIVE_SCORE_WEIGHTS;
  const parts: [number | null, number][] = [
    [yongsin.score, W.yongsin],
    [flow.score, W.flow],
    [meaning.score, W.meaning],
    [easy.score, W.easy],
  ];
  const used = parts.filter((p): p is [number, number] => p[0] !== null);
  const weighted = used.reduce((s, [v, w]) => s + v * w, 0) / used.reduce((s, [, w]) => s + w, 0);
  const hard = easy.score < HARD_TO_SAY_BELOW && ease.teasing?.level !== "strong";
  const hardToSayPenalty = hard ? HARD_TO_SAY_PENALTY : 0;

  return {
    name: name.name,
    total: round1(Math.max(0, weighted - hardToSayPenalty)),
    items: { yongsin, flow, meaning, easy },
    teasing: ease.teasing,
    hardToSayPenalty,
    hardToSay: hard ? HARD_TO_SAY_LABEL : null,
    notice: saju ? null : NO_BIRTH_NOTICE,
  };
}

/**
 * 우리말 이름 점수 비교 (내림차순). 강한 놀림말이 생기는 이름은 점수와 관계없이 맨 뒤.
 * 같으면 용신 보완 → 발음오행 흐름. 희소성·가나다는 부르는 쪽에서 잇는다
 */
export function compareNativeScore(a: NativeScore, b: NativeScore): number {
  const strong = (s: NativeScore) => (s.teasing?.level === "strong" ? 1 : 0);
  return (
    strong(a) - strong(b) ||
    b.total - a.total ||
    (b.items.yongsin.score ?? -1) - (a.items.yongsin.score ?? -1) ||
    b.items.flow.score - a.items.flow.score
  );
}
