import { evaluateFlow, pronunciationElement, strokeElement } from "./elements";
import { isLuckySuri, reduceSuri } from "./suri81";
import type {
  Element,
  FourGyeokKey,
  GyeokResult,
  HanjaChar,
  NamingAnalysis,
  NamingInput,
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

// 가중치: 수리 40 + 발음오행 30 + 자원오행 30. 자원오행 정보가 없으면 70점 만점 기준으로 환산
const W_SURI = 40;
const W_PRON = 30;
const W_RES = 30;

export function analyzeName(input: NamingInput): NamingAnalysis {
  validate(input);
  const { surname, givenName, neededElement } = input;

  const gyeoks = fourGyeok(surname, givenName);
  const luckyCount = Object.values(gyeoks).filter((g) => g.lucky).length;
  const suriScore = (luckyCount / 4) * 100;

  // 발음오행: 성의 첫 글자 + 이름 글자들의 초성
  const pronElements = [surname[0], ...givenName]
    .map((c) => pronunciationElement(c.eum))
    .filter((e): e is Element => e !== null);
  const pronunciation = evaluateFlow(pronElements);

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

  let resScore = resource?.score ?? 0;
  if (resource?.needMatched === true) resScore = Math.min(100, resScore + 30);
  if (resource?.needMatched === false) resScore = Math.max(0, resScore - 20);

  const weights = W_SURI + W_PRON + (resource ? W_RES : 0);
  const total =
    (suriScore * W_SURI +
      pronunciation.score * W_PRON +
      (resource ? resScore * W_RES : 0)) /
    weights;

  return {
    fourGyeok: gyeoks,
    pronunciation,
    resource,
    totalScore: Math.round(total * 10) / 10,
  };
}
