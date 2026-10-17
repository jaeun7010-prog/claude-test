import { evaluateFlow, pronunciationElement, strokeElement } from "./elements";
import {
  GYEOK_WEIGHTS,
  PRONUNCIATION_FLOW_WEIGHTS,
  SAJU_CHAR_SCORE,
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
 * 원/형/이/정 4격.
 * 원격=이름 획수 합, 형격=성+이름 첫 자, 이격=성+이름 끝 자, 정격=전체 합.
 * 외자 이름은 관례에 따라 원격·이격 계산에 1획을 보탭니다(천격 1).
 */
export function fourGyeok(
  surname: HanjaChar[],
  givenName: HanjaChar[]
): Record<FourGyeokKey, GyeokResult> {
  const s = sum(surname);
  const first = givenName[0].strokes;
  const last = givenName[givenName.length - 1].strokes;
  const single = givenName.length === 1;

  return {
    won: gyeok(single ? first + 1 : sum(givenName)),
    hyeong: gyeok(s + first),
    i: gyeok(s + (single ? 1 : last)),
    jeong: gyeok(s + sum(givenName)),
  };
}

function validate({ surname, givenName }: NamingInput) {
  if (surname.length < 1 || surname.length > 2)
    throw new RangeError("성은 1~2자여야 합니다.");
  if (givenName.length < 1 || givenName.length > 2)
    throw new RangeError("이름은 1~2자여야 합니다.");
  for (const c of [...surname, ...givenName]) {
    if (!Number.isInteger(c.strokes) || c.strokes < 1)
      throw new RangeError(`획수가 올바르지 않습니다: ${c.hanja}`);
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function analyzeName(input: NamingInput): NamingAnalysis {
  validate(input);
  const { surname, givenName, neededElement, favorableElement, unfavorableElement } = input;

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

  // 발음오행: 성의 첫 글자 + 이름 글자들의 초성
  const pronElements = [surname[0], ...givenName]
    .map((c) => pronunciationElement(c.eum))
    .filter((e): e is Element => e !== null);
  const pronunciation = evaluateFlow(pronElements, PRONUNCIATION_FLOW_WEIGHTS);

  // 자원오행: 오행을 아는 글자만으로 평가한다. 이름 글자 중 하나라도 오행을 알아야 의미가 있다.
  // needMatched: 용신 글자가 있으면 true, 이름 글자가 모두 확인됐는데 없으면 false, 판단 불가면 null
  let resource: NamingAnalysis["resource"] = null;
  const knownGiven = givenName.filter((c) => c.element);
  if (knownGiven.length > 0) {
    const chars = [surname[0], ...givenName].filter((c) => c.element);
    const flow = evaluateFlow(chars.map((c) => c.element as Element));
    let needMatched: boolean | null = null;
    if (neededElement) {
      if (knownGiven.some((c) => c.element === neededElement)) needMatched = true;
      else if (knownGiven.length === givenName.length) needMatched = false;
    }
    resource = { ...flow, needMatched };
  }

  // 사주 보완: 이름 글자마다 용신·희신·중립·기신을 따로 반영한다. 오행을 모르는 글자는 중립으로 본다
  let sajuScore: number | null = null;
  if (neededElement && knownGiven.length > 0) {
    const saju = { needed: neededElement, favorable: favorableElement, unfavorable: unfavorableElement };
    const per = givenName.map((c) => sajuCharScore(c.element, saju) ?? SAJU_CHAR_SCORE.neutral);
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
