import { hasNegativeHun } from "./hanja-suitability";
import { NAME_MEANING, NAME_MEANING_NOUN, NAME_MEANING_PAIR, NAME_MEANING_VERB, type NameMeaningEntry } from "./name-meaning-table";

/**
 * 이름 전체 뜻 한 줄 (무료). 예: 載(실을 재) + 運(운수 운) → 좋은 운을 가득 싣고 살아가길 바라는 뜻
 * 한자별 이름용 문구(name-meaning-table.ts)를 문장 틀에 넣어 만든다.
 *  ① 두 글자: {첫 글자 -고} {둘째 글자 -ㄴ} 사람으로 자라길 바라는 뜻
 *  ② 외자: {글자 -ㄴ} 사람으로 자라길 바라는 뜻
 *  ③④ 동작 글자 + 명사 글자 (순서 무관): {명사}을/를 {동작} 살아가길 바라는 뜻
 *  ⑤ 두 글자의 뜻 묶음이 같을 때 (2026-10-22 사용자 결정): "맑고 이슬처럼 맑은"처럼 겹치지 않게 합친다 (sameGroupPhrase)
 *     이슬처럼 맑은 + 연꽃처럼 맑은 → 이슬과 연꽃처럼 맑은 / 맑은 + 이슬처럼 맑은 → 이슬처럼 맑은
 *     자동으로 합치면 어색한 조합은 NAME_MEANING_PAIR에 문장을 직접 적는다 (景暖 → 볕처럼 따스한)
 * 문구가 없는 글자가 하나라도 있으면 문장을 만들지 않는다 (화면에는 훈음만 남는다).
 * 부모 성 함께 쓰기는 새로 고르는 글자만 넘긴다.
 */

interface MeaningChar {
  hanja: string;
  eum: string;
  /** 화면에 보이는 훈 (이름용 대표 풀이가 있으면 그것) */
  hun: string | null;
}

export interface NameMeaning {
  /** 예: 載(실을 재) + 運(운수 운) */
  chars: string;
  sentence: string;
}

const END = "사람으로 자라길 바라는 뜻";
const END_VERB = "살아가길 바라는 뜻";

const keyOf = (c: MeaningChar) => `${c.hanja}|${c.eum}`;

const hasBatchim = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};
const eul = (word: string) => (hasBatchim(word) ? "을" : "를");
const gwa = (word: string) => (hasBatchim(word) ? "과" : "와");

/** "이슬처럼 맑은" → { simile: "이슬", pred: "맑은" }. "~처럼"이 없으면 simile null */
function splitSimile(phrase: string): { simile: string | null; pred: string } {
  const i = phrase.indexOf("처럼 ");
  return i < 0 ? { simile: null, pred: phrase } : { simile: phrase.slice(0, i), pred: phrase.slice(i + 3) };
}

const lastWord = (s: string) => s.split(" ").pop()!;

/**
 * 뜻 묶음이 같은 두 글자의 "-ㄴ" 자리 문구 (첫 글자 a, 끝 글자 b).
 *  - 문구가 같음: 한 번만 (옥처럼 맑은)
 *  - 둘 다 비유, 비유의 끝 낱말이 같음(옥·해): 비유 하나에 두 서술 (옥처럼 빛나고 맑은 / 동녘 해처럼 힘찬)
 *  - 둘 다 비유: 비유를 합침 (이슬과 연꽃처럼 맑은 / 옥과 별처럼 찬란하고 빛나는)
 *  - 한쪽만 비유이고 다른 쪽이 같은 서술로 끝남: 비유를 앞에 붙임 (별처럼 환히 빛나는)
 *  - 서술의 끝 낱말이 같음: 더 구체적인(긴) 문구 하나 (마음이 맑은 / 찬란하게 빛나는)
 *  - 그 밖: 보통 틀 (밝고 불빛처럼 환한)
 */
function sameGroupPhrase(a: NameMeaningEntry, b: NameMeaningEntry): string {
  if (a.rel === b.rel) return b.rel;
  const ra = splitSimile(a.rel);
  const rb = splitSimile(b.rel);
  // 첫 글자 서술의 "-고" 꼴: and 문구에서 비유를 뗀다 (옥처럼 빛나고 → 빛나고)
  const andPred = ra.simile && a.and.startsWith(`${ra.simile}처럼 `) ? a.and.slice(ra.simile.length + 3) : a.and;
  if (ra.simile && rb.simile) {
    const pred = ra.pred === rb.pred ? rb.pred : `${andPred} ${rb.pred}`;
    if (lastWord(ra.simile) === lastWord(rb.simile)) {
      // 비유가 같은 낱말(옥·해)이면 수식어가 붙은 쪽(아름다운 옥, 동녘 해)을 쓴다
      const simile = ra.simile.length >= rb.simile.length ? ra.simile : rb.simile;
      return `${simile}처럼 ${pred}`;
    }
    return `${ra.simile}${gwa(ra.simile)} ${rb.simile}처럼 ${pred}`;
  }
  if (rb.simile && !ra.simile && a.rel.endsWith(rb.pred)) return `${rb.simile}처럼 ${a.rel}`;
  if (ra.simile && !rb.simile && b.rel.endsWith(ra.pred)) return `${ra.simile}처럼 ${b.rel}`;
  if (lastWord(ra.pred) === lastWord(rb.pred)) return a.rel.length > b.rel.length ? a.rel : b.rel;
  return `${a.and} ${b.rel}`;
}

function sentenceOf(chars: MeaningChar[]): string | null {
  const keys = chars.map(keyOf);
  if (keys.length === 2) {
    const [a, b] = keys;
    const verb = NAME_MEANING_VERB[a] ?? NAME_MEANING_VERB[b];
    const noun = NAME_MEANING_VERB[a] ? NAME_MEANING_NOUN[b] : NAME_MEANING_NOUN[a];
    if (verb && noun) return `${noun}${eul(noun)} ${verb} ${END_VERB}`;
    const pair = NAME_MEANING_PAIR[`${a}+${b}`] ?? NAME_MEANING_PAIR[`${b}+${a}`];
    if (pair) return `${pair} ${END}`;
  }
  const entries = keys.map((k) => NAME_MEANING[k]);
  if (entries.some((x) => !x)) return null;
  if (entries.length === 1) return `${entries[0].rel} ${END}`;
  if (entries.length === 2)
    return entries[0].group !== entries[1].group
      ? `${entries[0].and} ${entries[1].rel} ${END}`
      : `${sameGroupPhrase(entries[0], entries[1])} ${END}`;
  return null;
}

/** 훈음 줄: 載(실을 재) + 運(운수 운) */
export const meaningCharsLabel = (chars: MeaningChar[]): string =>
  chars.map((c) => (c.hun ? `${c.hanja}(${c.hun} ${c.eum})` : `${c.hanja}(${c.eum})`)).join(" + ");

export function nameMeaningOf(chars: MeaningChar[]): NameMeaning | null {
  if (chars.length === 0) return null;
  const sentence = sentenceOf(chars);
  // 마지막 안전장치: 부정적인 단어가 들어간 문장은 쓰지 않는다
  if (!sentence || hasNegativeHun(sentence)) return null;
  return { chars: meaningCharsLabel(chars), sentence };
}
