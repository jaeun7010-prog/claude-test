import { hasNegativeHun } from "./hanja-suitability";
import { NAME_MEANING, NAME_MEANING_NOUN, NAME_MEANING_VERB } from "./name-meaning-table";

/**
 * 이름 전체 뜻 한 줄 (무료). 예: 載(실을 재) + 運(운수 운) → 좋은 운을 가득 싣고 살아가길 바라는 뜻
 * 한자별 이름용 문구(name-meaning-table.ts)를 문장 틀에 넣어 만든다.
 *  ① 두 글자: {첫 글자 -고} {둘째 글자 -ㄴ} 사람으로 자라길 바라는 뜻
 *  ② 외자: {글자 -ㄴ} 사람으로 자라길 바라는 뜻
 *  ③④ 동작 글자 + 명사 글자 (순서 무관): {명사}을/를 {동작} 살아가길 바라는 뜻
 * 문구가 없는 글자가 하나라도 있거나, 두 글자의 뜻 묶음이 같으면 문장을 만들지 않는다 (화면에는 훈음만 남는다).
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

const eul = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "을" : "를";
};

function sentenceOf(chars: MeaningChar[]): string | null {
  const keys = chars.map(keyOf);
  if (keys.length === 2) {
    const [a, b] = keys;
    const verb = NAME_MEANING_VERB[a] ?? NAME_MEANING_VERB[b];
    const noun = NAME_MEANING_VERB[a] ? NAME_MEANING_NOUN[b] : NAME_MEANING_NOUN[a];
    if (verb && noun) return `${noun}${eul(noun)} ${verb} ${END_VERB}`;
  }
  const entries = keys.map((k) => NAME_MEANING[k]);
  if (entries.some((x) => !x)) return null;
  if (entries.length === 1) return `${entries[0].rel} ${END}`;
  if (entries.length === 2 && entries[0].group !== entries[1].group)
    return `${entries[0].and} ${entries[1].rel} ${END}`;
  return null;
}

export function nameMeaningOf(chars: MeaningChar[]): NameMeaning | null {
  if (chars.length === 0) return null;
  const sentence = sentenceOf(chars);
  // 마지막 안전장치: 부정적인 단어가 들어간 문장은 쓰지 않는다
  if (!sentence || hasNegativeHun(sentence)) return null;
  return {
    chars: chars.map((c) => (c.hun ? `${c.hanja}(${c.hun} ${c.eum})` : `${c.hanja}(${c.eum})`)).join(" + "),
    sentence,
  };
}
