import {
  evaluateFlow,
  evaluateResourceFlow,
  pronunciationElement,
  strokeElement,
} from "./elements";
import {
  GYEOK_WEIGHTS,
  PRONUNCIATION_FLOW_WEIGHTS,
  PRONUNCIATION_CLASH_SCORE,
  SAJU_CHAR_SCORE,
  SAJU_WITH_YONGSIN,
  SCORE_WEIGHTS,
  SURI_PARTS,
  gradeOf,
  sajuCharScore,
} from "./score";
import { isLuckySuri, reduceSuri } from "./suri81";
import type {
  Element,
  FourGyeokKey,
  GyeokResult,
  HanjaChar,
  NamingAnalysis,
  NamingInput,
  PrefixedAnalysis,
  ScoreBreakdown,
} from "./types";

const sum = (chars: HanjaChar[]) => chars.reduce((s, c) => s + c.strokes, 0);

function gyeok(raw: number): GyeokResult {
  const suri = reduceSuri(raw);
  return {
    raw,
    suri,
    lucky: isLuckySuri(suri),
    element: strokeElement(suri),
  };
}

/**
 * 원/형/이/정 4격. 성 획수는 성 글자 획수의 합이다 (복성도 두 글자를 더한다).
 * 원격=이름 획수 합, 형격=성+이름 첫 자, 이격=성+이름 첫 자를 뺀 나머지, 정격=전체 합.
 * 2자 이름의 이격은 성+이름 끝 자와 같고, 3자 이상(부모 성 함께 쓰기)은 둘째 글자부터 모두 더한다.
 * 외자 이름은 관례에 따라 원격·이격 계산에 1획을 보탭니다(천격 1).
 */
export function fourGyeok(
  surname: HanjaChar[],
  givenName: HanjaChar[]
): Record<FourGyeokKey, GyeokResult> {
  const s = sum(surname);
  const first = givenName[0].strokes;
  const single = givenName.length === 1;

  return {
    won: gyeok(single ? first + 1 : sum(givenName)),
    hyeong: gyeok(s + first),
    i: gyeok(s + (single ? 1 : sum(givenName.slice(1)))),
    jeong: gyeok(s + sum(givenName)),
  };
}

/**
 * 자원오행 흐름·통관에서 성씨 오행으로 볼 글자: 성 끝 글자(이름과 붙는 글자) → 첫 글자 순으로 오행을 아는 글자.
 * 둘 다 모르면 null (성을 빼고 이름 글자만으로 흐름을 본다)
 */
export function surnameElementChar(surname: HanjaChar[]): HanjaChar | null {
  return [...surname].reverse().find((c) => c.element) ?? null;
}

/**
 * 발음오행 관계 가중치 (PRONUNCIATION_FLOW_WEIGHTS): 성 → 이름 첫 글자 관계에 junction,
 * 이름 안의 관계들에 given을 나눠 주고, 복성 두 글자 사이 관계에는 surname을 준다.
 */
export function pronunciationWeights(surnameLen: number, givenLen: number): number[] {
  const w = PRONUNCIATION_FLOW_WEIGHTS;
  return [
    ...Array<number>(surnameLen - 1).fill(w.surname),
    w.junction,
    ...Array<number>(givenLen - 1).fill(w.given / (givenLen - 1)),
  ];
}

/** 출생신고 이름 글자 수 상한 (성 제외). 가족관계등록 실무 기준 */
export const MAX_GIVEN_NAME_LENGTH = 5;

function validate({ surname, givenName, pronunciationFromSurnameEnd }: NamingInput) {
  // 부모 성 함께 쓰기의 부분 점수는 성(1~2자) + 부모 성(1~2자)을 성 쪽에 둔다
  const maxSurname = pronunciationFromSurnameEnd ? 4 : 2;
  if (surname.length < 1 || surname.length > maxSurname)
    throw new RangeError(`성은 1~${maxSurname}자여야 합니다.`);
  if (givenName.length < 1 || givenName.length > MAX_GIVEN_NAME_LENGTH)
    throw new RangeError(`이름은 1~${MAX_GIVEN_NAME_LENGTH}자여야 합니다.`);
  for (const c of [...surname, ...givenName]) {
    if (!Number.isInteger(c.strokes) || c.strokes < 1)
      throw new RangeError(`획수가 올바르지 않습니다: ${c.hanja}`);
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function analyzeName(input: NamingInput): NamingAnalysis {
  validate(input);
  const { givenName, neededElement, favorableElement, unfavorableElement } = input;
  const { surname } = input;
  // 발음오행에서 볼 성 글자 (부분 점수면 성 끝 글자만)
  const pronSurname = input.pronunciationFromSurnameEnd ? surname.slice(-1) : surname;

  const gyeoks = fourGyeok(surname, givenName);
  const luck =
    (Object.keys(gyeoks) as FourGyeokKey[]).reduce(
      (s, k) => s + (gyeoks[k].lucky ? GYEOK_WEIGHTS[k] : 0),
      0
    ) * 100;
  const suriFlow = evaluateFlow([gyeoks.won.element, gyeoks.hyeong.element, gyeoks.i.element]).score;
  // 획수 홀수=양, 짝수=음. 성·이름 글자가 모두 같은 쪽이면 음양이 치우친 것으로 본다
  const parity = new Set([...surname, ...givenName].map((c) => c.strokes % 2));
  const yinYang = parity.size === 2 ? 100 : 0;
  const suriScore =
    luck * SURI_PARTS.luck + suriFlow * SURI_PARTS.flow + yinYang * SURI_PARTS.yinYang;

  // 발음오행: 성 글자(복성은 두 글자 모두) + 이름 글자들의 초성. 한글 음절이 아닌 음이 있으면 관계별 가중치 없이 본다
  const pronChars = [...pronSurname, ...givenName].map((c) => pronunciationElement(c.eum));
  const pronElements = pronChars.filter((e): e is Element => e !== null);
  const pronunciation = evaluateFlow(
    pronElements,
    pronElements.length === pronChars.length
      ? pronunciationWeights(pronSurname.length, givenName.length)
      : undefined
  );
  // 점수는 상극 수로 정한다 (PRONUNCIATION_CLASH_SCORE). 흐름 모양(elements·relations)은 그대로 둔다
  const nameRelations =
    pronElements.length === pronChars.length ? pronunciation.relations.slice(pronSurname.length - 1) : pronunciation.relations;
  const clashes = nameRelations.filter((r) => r === "극").length;
  pronunciation.score = PRONUNCIATION_CLASH_SCORE[Math.min(clashes, PRONUNCIATION_CLASH_SCORE.length - 1)];

  // 자원오행: 오행을 아는 글자만으로 평가한다. 이름 글자 중 하나라도 오행을 알아야 의미가 있다.
  // 성씨 오행은 surnameElementChar(성 끝 글자 → 첫 글자)로 정한다.
  // needMatched: 용신 글자가 있으면 true, 이름 글자가 모두 확인됐는데 없으면 false, 판단 불가면 null
  let resource: NamingAnalysis["resource"] = null;
  const knownGiven = givenName.filter((c) => c.element);
  if (knownGiven.length > 0) {
    const surnameChar = surnameElementChar(surname);
    const chars = [...(surnameChar ? [surnameChar] : []), ...knownGiven];
    const flow = evaluateResourceFlow(
      chars.map((c) => c.element as Element),
      !!surnameChar && !!givenName[0].element,
      neededElement,
      surnameChar?.surnameConfidence === "낮음"
    );
    let needMatched: boolean | null = null;
    if (neededElement) {
      if (knownGiven.some((c) => c.element === neededElement)) needMatched = true;
      else if (knownGiven.length === givenName.length) needMatched = false;
    }
    resource = { ...flow, needMatched };
  }

  // 사주 보완: 이름 글자마다 용신·희신·중립·기신을 따로 반영한다. 오행을 모르는 글자는 중립으로 본다.
  // 이름 글자가 모두 오행을 모르면(셀프 작명에서만 생긴다. 추천은 용신 글자가 필수) 모두 중립으로 본다 (2026-10-24 사용자 결정)
  let sajuScore: number | null = null;
  if (neededElement) {
    const saju = { needed: neededElement, favorable: favorableElement, unfavorable: unfavorableElement };
    let per = givenName.map((c) => sajuCharScore(c.element, saju) ?? SAJU_CHAR_SCORE.neutral);
    // 통관 글자(이름 첫 글자)는 희신만큼 본다
    if (resource?.arrangement === "통관") per[0] = Math.max(per[0], SAJU_CHAR_SCORE.tonggwan);
    // 용신 글자가 있으면 나머지 글자는 기신만 피하면 되므로 희신·중립 감점을 줄인다 (SAJU_WITH_YONGSIN)
    if (per.includes(SAJU_CHAR_SCORE.yongsin))
      per = per.map((v) =>
        v === SAJU_CHAR_SCORE.yongsin
          ? v
          : v >= SAJU_CHAR_SCORE.huisin
            ? SAJU_WITH_YONGSIN.huisin
            : v >= SAJU_CHAR_SCORE.neutral
              ? SAJU_WITH_YONGSIN.neutral
              : v
      );
    sajuScore = round1((per.reduce((a, b) => a + b, 0) / per.length) * 100);
  }

  const breakdown: ScoreBreakdown = {
    saju: sajuScore,
    suri: round1(suriScore),
    pronunciation: pronunciation.score,
    resource: resource ? resource.score : null,
  };

  const parts: [number | null, number][] = [
    [breakdown.saju, SCORE_WEIGHTS.saju],
    [breakdown.suri, SCORE_WEIGHTS.suri],
    [breakdown.pronunciation, SCORE_WEIGHTS.pronunciation],
    [breakdown.resource, SCORE_WEIGHTS.resource],
  ];
  let sum = 0;
  let weights = 0;
  for (const [score, w] of parts) {
    if (score === null) continue;
    sum += score * w;
    weights += w;
  }
  const totalScore = round1(sum / weights);

  return {
    fourGyeok: gyeoks,
    pronunciation,
    resource,
    breakdown,
    totalScore,
    grade: gradeOf(totalScore),
  };
}

/**
 * 부모 성 함께 쓰기 (예: 김박서윤 = 성 金 + 이름 朴瑞允).
 * - analysis (새로 고르는 부분 기준): 부모 성을 성 쪽에 붙여 복성처럼 보고(4격은 성 합산) 새 글자(瑞允)를 평가한다.
 *   발음오행은 부모 성 끝 글자부터(박→서→윤), 자원오행 성씨 오행은 surnameElementChar(부모 성 끝 글자 → … → 성 첫 글자),
 *   사주 보완은 새 글자만 본다. 고정된 부분(김→박 관계, 성 + 부모 성 형격 등)은 조합 진단(combination.ts)에서 따로 알린다.
 * - legal (법적 이름 전체 기준): 성 金, 이름 朴瑞允으로 계산한 점수. 참고용
 */
export function analyzeWithPrefix(input: NamingInput & { prefix: HanjaChar[] }): PrefixedAnalysis {
  const { prefix, surname, givenName, ...rest } = input;
  return {
    analysis: analyzeName({
      ...rest,
      surname: [...surname, ...prefix],
      givenName,
      pronunciationFromSurnameEnd: true,
    }),
    legal: analyzeName({ ...rest, surname, givenName: [...prefix, ...givenName] }),
  };
}
