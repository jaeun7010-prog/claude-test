/**
 * 부모 성 함께 쓰기의 조합 진단.
 * 이름 등급은 새로 고르는 부분 기준(analyzeWithPrefix)이라, 성 + 부모 성처럼 어떤 이름을 골라도 똑같이 들어가는
 * 고정된 부분의 약점은 여기서 따로 쉬운 말로 알린다. 법적 이름 전체 기준 점수는 각 이름의 자세히 보기·PDF에 있다.
 */
import { pronunciationElement, relation } from "./elements";
import { surnameElementChar } from "./analyze";
import { isLuckySuri, reduceSuri } from "./suri81";
import type { Element, HanjaChar, Relation } from "./types";

const ELEMENT_HANJA: Record<Element, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

export interface CombinationItem {
  /** weak: 약점 / good: 괜찮은 점 */
  tone: "weak" | "good";
  text: string;
}

const RELATION_EASY: Record<Relation, string> = {
  생: "앞 글자가 뒤 글자를 살려 주는 관계(상생)",
  비화: "같은 기운이 이어지는 관계(비화)",
  설: "기운이 거꾸로 흐르는 관계(설기)",
  극: "서로 부딪치는 관계(상극)",
};

const strokesText = (chars: HanjaChar[]) => chars.map((c) => `${c.hanja} ${c.strokes}획`).join(" + ");

/**
 * 고정된 부분(성 + 부모 성)의 진단. 순서: 수리(형격) → 발음오행 → 자원오행 → 사주.
 * `saju`는 용신·기신 (사주 보완과 같은 기준)
 */
export function diagnoseCombination(
  surname: HanjaChar[],
  prefix: HanjaChar[],
  saju: { yongsin: Element; gisin: Element }
): CombinationItem[] {
  const items: CombinationItem[] = [];
  const surnameText = surname.map((c) => c.eum).join("");
  const prefixText = prefix.map((c) => c.eum).join("");

  // 1. 법적 이름의 형격 = 성 + 이름 첫 글자(부모 성 첫 글자). 어떤 이름을 골라도 같다
  const hyeongRaw = surname.reduce((n, c) => n + c.strokes, 0) + prefix[0].strokes;
  const hyeong = reduceSuri(hyeongRaw);
  const hyeongChars = strokesText([...surname, prefix[0]]);
  items.push(
    isLuckySuri(hyeong)
      ? { tone: "good", text: `법적 이름의 형격(청년운)은 ${hyeongChars} = ${hyeong}수로 길수입니다.` }
      : {
          tone: "weak",
          text: `법적 이름의 형격(청년운)은 ${hyeongChars} = ${hyeong}수로, 수리에서 흉수로 봅니다. 뒤에 어떤 글자를 골라도 바뀌지 않습니다.`,
        }
  );

  // 2. 발음오행: 성 끝 글자 → 부모 성 글자들
  const chain = [surname[surname.length - 1], ...prefix];
  for (let i = 0; i < chain.length - 1; i++) {
    const a = pronunciationElement(chain[i].eum);
    const b = pronunciationElement(chain[i + 1].eum);
    if (!a || !b) continue;
    const r = relation(a, b);
    const where = `‘${chain[i].eum}’(${ELEMENT_HANJA[a]}) → ‘${chain[i + 1].eum}’(${ELEMENT_HANJA[b]})`;
    items.push(
      r === "생" || r === "비화"
        ? { tone: "good", text: `부를 때 ${where} 사이의 소리 오행은 ${RELATION_EASY[r]}입니다.` }
        : {
            tone: "weak",
            text: `부를 때 ${where} 사이의 소리 오행은 ${RELATION_EASY[r]}입니다. 발음 흐름이 조금 약해집니다.`,
          }
    );
  }

  // 3. 자원오행: 성씨 오행 글자 → 부모 성 첫 글자 (둘 다 오행을 알 때만)
  const s = surnameElementChar(surname);
  const p = prefix.find((c) => c.element);
  if (s?.element && p?.element) {
    const r = relation(s.element, p.element);
    if (r === "극" || r === "설")
      items.push({
        tone: "weak",
        text: `성 ${s.hanja}(${s.element}) → ${p.hanja}(${p.element}) 사이의 한자 오행은 ${RELATION_EASY[r]}입니다.`,
      });
  }

  // 4. 사주: 부모 성 글자의 한자 오행이 기신·용신인가
  for (const c of prefix) {
    if (!c.element) continue;
    if (c.element === saju.gisin)
      items.push({
        tone: "weak",
        text: `${c.hanja}: 한자 오행 ${ELEMENT_HANJA[c.element]}(${c.element}) — 이 사주에서 피하면 좋은 기운(기신)입니다.`,
      });
    else if (c.element === saju.yongsin)
      items.push({
        tone: "good",
        text: `${c.hanja}: 한자 오행 ${ELEMENT_HANJA[c.element]}(${c.element}) — 이 사주에 필요한 기운(용신)이라 도움이 됩니다.`,
      });
  }

  if (!items.some((x) => x.tone === "weak"))
    items.push({ tone: "good", text: `${surnameText}${prefixText} 조합에서 눈에 띄는 약점은 없습니다.` });
  return items;
}

/** 조합 진단 끝에 붙이는 안내 */
export const COMBINATION_GUIDE =
  "함께 쓰기를 원하시면 이 점을 참고하세요. 이름 등급은 새로 고르는 부분이 얼마나 잘 맞는지로 매겼고, " +
  "법적 이름 전체 기준의 4격과 점수는 각 이름의 ‘자세히 보기’와 PDF 리포트에 참고로 담았습니다.";

/** 웹 화면용 조합 진단 안내. 결제 전에는 법적 기준 상세가 잠겨 있어 "자세히 보기" 대신 리포트로 안내한다 */
export const combinationGuide = (locked: boolean) =>
  locked
    ? "함께 쓰기를 원하시면 이 점을 참고하세요. 이름 등급은 새로 고르는 부분이 얼마나 잘 맞는지로 매겼고, " +
      "법적 이름 전체 기준의 4격과 점수는 프리미엄 리포트에서 확인할 수 있습니다."
    : COMBINATION_GUIDE;
