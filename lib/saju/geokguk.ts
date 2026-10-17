import type { Element } from "@/lib/naming/types";
import { BRANCHES, BRANCHES_KO, BRANCH_ELEMENT, HIDDEN_STEMS, STEMS, STEMS_KO, STEM_ELEMENT } from "./constants";
import type { FourPillars } from "./pillars";
import type { ElementScores, SajuRelation } from "./relations";
import { groupElements, TEN_GOD_GROUP, tenGod, type TenGod, type TenGodGroup } from "./ten-gods";

// ---------------------------------------------------------------------------
// 격국 (《자평진전》 기준)
//
// ① 월지 지장간 중 천간에 드러난(투출) 글자로 격을 정하고,
// ② 강약(억부가 정한 방향)에 맞춰 격별 순용·역용 규칙으로 상신(用神)을 고른다.
// ⑤ 외격(종격·화격)은 후보로 표시만 하고 용신은 바꾸지 않는다.
// ⑥ 강약 비율·억부 세력이 경계에 가까운 사주는 "경계 사주"로 표시한다.
// ---------------------------------------------------------------------------

export type GeokName =
  | "정관격" | "칠살격" | "정재격" | "편재격" | "정인격" | "편인격"
  | "식신격" | "상관격" | "건록격" | "월겁격" | "양인격";

/** 결과 화면용 쉬운 이름 */
export const GEOK_EASY: Record<GeokName, string> = {
  정관격: "바른 질서",
  칠살격: "도전과 단련",
  정재격: "성실한 결실",
  편재격: "활동적 재능",
  정인격: "배움과 보살핌",
  편인격: "독창성",
  식신격: "여유와 표현",
  상관격: "재치와 표현",
  건록격: "자립심",
  월겁격: "자립심",
  양인격: "강한 추진력",
};

const GEOK_OF: Record<TenGod, GeokName> = {
  정관: "정관격", 편관: "칠살격", 정재: "정재격", 편재: "편재격", 정인: "정인격",
  편인: "편인격", 식신: "식신격", 상관: "상관격", 비견: "건록격", 겁재: "월겁격",
};

/** 강약 경계값과 경계 사주 판단 폭 */
export const STRENGTH_BOUNDS = [0.28, 0.42, 0.55, 0.7] as const;
/** 2026-10-18: ±0.02 / 3%는 경계 사주가 37%라 ±0.01 / 1%로 좁힘 (약 18%) */
export const BORDER_MARGIN = { ratio: 0.01, pressureGap: 0.01 } as const;

/** 외격 후보 기준 (후보 비율을 보고 조정한다) */
export const OUTER_THRESHOLDS = { strongSelf: 0.8, strongOfficialMax: 0.05, weakSelf: 0.15 } as const;

export type Column = "신강" | "중화" | "신약";
type StrengthLike = "극신강" | "신강" | "중화" | "신약" | "극신약";

export interface OuterCandidate {
  kind: "종왕" | "종강" | "종아" | "종재" | "종살" | "화격";
  /** 외격으로 볼 경우의 용신 (참고용) */
  yongsin: Element;
  detail: string;
}

export interface Geokguk {
  name: GeokName;
  easy: string;
  /** 격을 정한 글자 (천간 index) */
  stem: number;
  /** 격을 정한 근거 */
  basis: string;
  /** 성격: 격이 온전함 / 파격: 격을 망가뜨리는 기운이 있고 구해 줄 기운이 없음 */
  status: "성격" | "파격";
  /** 파격 이유 */
  broken?: string;
  /** 격국으로 용신을 정했는지 (파격이거나 신약한 건록·양인격이면 false → 억부를 따름) */
  applied: boolean;
  /** 상신: 격국으로 고른 십성군과 오행. applied일 때만 */
  sangsin: { group: TenGodGroup; element: Element; reason: string; easyVerb: string } | null;
  /** 억부를 따른 이유 (applied가 false일 때) */
  fallback?: string;
  /** 경계 사주 근거. 비어 있으면 경계 사주 아님 */
  borderline: string[];
  outer: OuterCandidate | null;
}

const POS_KO = { year: "연간", month: "월간", hour: "시간" } as const;

/** 받침 유무에 따라 조사 선택 (예: josa("갑", "이", "가")) */
const josa = (ko: string, withFinal: string, without: string) => {
  const code = ko.charCodeAt(ko.length - 1) - 0xac00;
  return code >= 0 && code % 28 !== 0 ? withFinal : without;
};
const stemLabel = (s: number, w: string, wo: string) => `${STEMS[s]}(${STEMS_KO[s]})${josa(STEMS_KO[s], w, wo)}`;
const branchLabel = (b: number, w: string, wo: string) => `${BRANCHES[b]}(${BRANCHES_KO[b]})${josa(BRANCHES_KO[b], w, wo)}`;
/** 오행: 목·금만 받침이 있다 */
const elJosa = (e: Element, w: string, wo: string) => `${e}${e === "목" || e === "금" ? w : wo}`;
type StemPos = keyof typeof POS_KO;

interface Ctx {
  dmStem: number;
  dm: Element;
  elements: Record<TenGodGroup, Element>;
  groups: Record<TenGodGroup, number>;
  /** 일간을 뺀 천간 (연·월·시) */
  stems: { pos: StemPos; stem: number }[];
  /** 지지 정기 (일지 포함) */
  mainQi: number[];
}

/** 천간에 드러났는가 (일간 제외) */
const revealed = (c: Ctx, t: TenGod | TenGodGroup) =>
  c.stems.some(({ stem }) => matches(c, stem, t));

/** 천간과 지지 정기 모두에 없는가 */
const absent = (c: Ctx, t: TenGod | TenGodGroup) =>
  !revealed(c, t) && !c.mainQi.some((stem) => matches(c, stem, t));

function matches(c: Ctx, stem: number, t: TenGod | TenGodGroup) {
  const g = tenGod(c.dmStem, stem);
  return g === t || TEN_GOD_GROUP[g] === t;
}

/** 둘 중 세력이 더 약한 십성군 (동점이면 앞쪽) */
const weaker = (c: Ctx, a: TenGodGroup, b: TenGodGroup) => (c.groups[b] < c.groups[a] ? b : a);

// --- ① 격 정하기 ---
function determine(p: FourPillars, c: Ctx): { name: GeokName; stem: number; basis: string } {
  const mb = p.month.branch;
  const hidden = HIDDEN_STEMS[mb];
  const labels = hidden.length === 2 ? ["여기", "정기"] : ["여기", "중기", "정기"];

  let stem: number;
  let basis: string;
  if (BRANCH_ELEMENT[mb] === c.dm) {
    stem = hidden[hidden.length - 1][0];
    basis = `월지 ${branchLabel(mb, "이", "가")} 일간(${STEMS[c.dmStem]})과 같은 ${c.dm} 기운이라`;
  } else {
    let found: { idx: number; pos: StemPos } | null = null;
    // 월지가 일간과 다른 오행이면 지장간의 비겁(예: 寅 속 丙)이 드러나도 격으로 삼지 않는다
    for (let idx = hidden.length - 1; idx >= 0 && !found; idx--) {
      if (STEM_ELEMENT[hidden[idx][0]] === c.dm) continue;
      const hit = c.stems.find((s) => s.stem === hidden[idx][0]);
      if (hit) found = { idx, pos: hit.pos };
    }
    if (found) {
      stem = hidden[found.idx][0];
      basis = `월지 ${BRANCHES[mb]}의 지장간 중 ${labels[found.idx]} ${stemLabel(stem, "이", "가")} ${POS_KO[found.pos]}에 드러나`;
    } else {
      stem = hidden[hidden.length - 1][0];
      basis = `월지 ${BRANCHES[mb]}의 지장간이 천간에 드러나지 않아 정기 ${stemLabel(stem, "을", "를")} 기준으로`;
    }
  }

  const g = tenGod(c.dmStem, stem);
  let name = GEOK_OF[g];
  // 양간 일간의 겁재가 子午卯酉 월지에 있으면 양인격
  if (g === "겁재" && c.dmStem % 2 === 0 && [0, 6, 3, 9].includes(mb)) name = "양인격";
  return { name, stem, basis };
}

// --- 파격 조건 ---
function brokenReason(name: GeokName, c: Ctx): string | null {
  switch (name) {
    case "정관격":
      return revealed(c, "상관") && absent(c, "인성") ? "상관이 드러나 정관을 해치는데 막아 줄 인성이 없습니다" : null;
    case "정재격":
    case "편재격":
      return revealed(c, "비겁") && absent(c, "식상") && absent(c, "관성")
        ? "비겁이 드러나 재성을 빼앗는데 이어 줄 식상도, 막아 줄 관성도 없습니다"
        : null;
    case "정인격":
    case "편인격":
      return revealed(c, "재성") && absent(c, "관성") ? "재성이 인성을 극하는데 이어 줄 관성이 없습니다" : null;
    case "식신격":
      return revealed(c, "편인") && absent(c, "재성") ? "편인이 드러나 식신을 막는데 제어할 재성이 없습니다" : null;
    case "칠살격":
      return absent(c, "식신") && absent(c, "인성") ? "칠살을 제어할 식신도, 화하게 할 인성도 없습니다" : null;
    case "상관격":
      return revealed(c, "정관") && absent(c, "인성") && absent(c, "재성")
        ? "정관이 드러나 상관과 부딪치는데 풀어 줄 인성도 재성도 없습니다"
        : null;
    case "양인격":
      return absent(c, "관성") ? "양인을 제어할 관살이 없습니다" : null;
    case "건록격":
    case "월겁격":
      return absent(c, "관성") && absent(c, "재성") && absent(c, "식상")
        ? "힘을 쓸 관성·재성·식상이 모두 없습니다"
        : null;
  }
}

type Pick = { group: TenGodGroup; reason: string; easyVerb: string };
const SUPPORT = "이를 받쳐 주는";
const CONTROL = "이를 다스려 주는";
const BALANCE = "넘치는 힘을 풀어 주는";

// --- ② 격별 규칙 (순용·역용). null이면 격국으로 정하지 않음 ---
function pickSangsin(name: GeokName, col: Column, c: Ctx): Pick | null {
  switch (name) {
    case "정관격":
      if (col === "신약") return { group: "인성", reason: "관의 힘을 일간에게 이어 줍니다(관인상생)", easyVerb: SUPPORT };
      return { group: "재성", reason: "정관을 생해 줍니다(재생관)", easyVerb: SUPPORT };
    case "정재격":
    case "편재격":
      if (col === "신약") return { group: "비겁", reason: "일간이 재성을 감당하도록 돕습니다", easyVerb: SUPPORT };
      if (col === "중화") return { group: "식상", reason: "재성을 생해 줍니다(식상생재)", easyVerb: SUPPORT };
      return weaker(c, "식상", "관성") === "식상"
        ? { group: "식상", reason: "재성을 생해 줍니다(식상생재, 식상·관성 중 약한 쪽)", easyVerb: SUPPORT }
        : { group: "관성", reason: "재성의 힘을 관으로 이어 줍니다(재생관, 식상·관성 중 약한 쪽)", easyVerb: SUPPORT };
    case "정인격":
    case "편인격":
      // 신약: 인성을 용신으로 (관성은 인성을 생하는 희신이 된다). 결정 1번 "약하면 돕는다"에 맞춤
      if (col === "신약") return { group: "인성", reason: "약한 일간을 돕고, 관성이 희신으로 인성을 생합니다(관인상생)", easyVerb: SUPPORT };
      if (col === "중화") return { group: "관성", reason: "인성을 생해 줍니다(관인상생)", easyVerb: SUPPORT };
      return weaker(c, "재성", "식상") === "재성"
        ? { group: "재성", reason: "넘치는 인성을 덜어 냅니다(재성·식상 중 약한 쪽)", easyVerb: BALANCE }
        : { group: "식상", reason: "넘치는 힘을 밖으로 풀어 냅니다(재성·식상 중 약한 쪽)", easyVerb: BALANCE };
    case "식신격":
      if (col === "신약") return { group: "인성", reason: "약한 일간을 돕습니다", easyVerb: SUPPORT };
      return { group: "재성", reason: "식신의 힘을 결실로 이어 줍니다(식신생재)", easyVerb: SUPPORT };
    case "칠살격":
      if (col === "신약") return { group: "인성", reason: "칠살의 힘을 일간 쪽으로 돌립니다(살인상생)", easyVerb: CONTROL };
      return { group: "식상", reason: "칠살을 제어합니다(식신제살)", easyVerb: CONTROL };
    case "상관격":
      if (col === "신강") return { group: "재성", reason: "상관의 힘을 결실로 이어 줍니다(상관생재)", easyVerb: BALANCE };
      return { group: "인성", reason: "상관을 다스립니다(상관패인)", easyVerb: CONTROL };
    case "양인격":
      if (col === "신약") return null;
      return { group: "관성", reason: "강한 양인을 제어합니다", easyVerb: CONTROL };
    case "건록격":
    case "월겁격": {
      if (col === "신약") return null;
      const g = (["관성", "재성", "식상"] as const).find((x) => !absent(c, x))!;
      return { group: g, reason: "일간의 넘치는 힘을 씁니다(관성 > 재성 > 식상 중 있는 것)", easyVerb: BALANCE };
    }
  }
}

// --- ⑥ 경계 사주 ---
function borderlineReasons(selfRatio: number, strength: StrengthLike, c: Ctx, total: number): string[] {
  const out: string[] = [];
  for (const b of STRENGTH_BOUNDS) {
    if (Math.abs(selfRatio - b) <= BORDER_MARGIN.ratio + 1e-9) {
      out.push(`강약 비율(${selfRatio.toFixed(3)})이 경계값 ${b}에 가깝습니다(±${BORDER_MARGIN.ratio} 이내)`);
    }
  }
  const pct = (g: TenGodGroup) => `${g} ${Math.round((c.groups[g] / total) * 100)}%`;
  if (strength === "신약" || strength === "극신약") {
    const [a, b] = (["식상", "재성", "관성"] as const).slice().sort((x, y) => c.groups[y] - c.groups[x]);
    if ((c.groups[a] - c.groups[b]) / total <= BORDER_MARGIN.pressureGap) {
      out.push(`억부로 볼 때 가장 큰 압박 세력(${pct(a)})과 다음 세력(${pct(b)})의 차이가 ${BORDER_MARGIN.pressureGap * 100}% 이내입니다`);
    }
  } else if (strength === "신강" || strength === "극신강") {
    const [a, b] = (["식상", "관성", "재성"] as const).slice().sort((x, y) => c.groups[x] - c.groups[y]);
    if ((c.groups[b] - c.groups[a]) / total <= BORDER_MARGIN.pressureGap) {
      out.push(`억부로 볼 때 가장 약한 설기 세력(${pct(a)})과 다음 세력(${pct(b)})의 차이가 ${BORDER_MARGIN.pressureGap * 100}% 이내입니다`);
    }
  }
  return out;
}

// --- ⑤ 외격 후보 ---
function outerCandidate(p: FourPillars, c: Ctx, selfRatio: number, total: number, relations: SajuRelation[]): OuterCandidate | null {
  const T = OUTER_THRESHOLDS;
  const branches = [p.year, p.month, p.day, p.hour].filter((x) => x !== null).map((x) => x!.branch);
  const noRoot = branches.every((b) =>
    HIDDEN_STEMS[b].every(([s]) => !["비겁", "인성"].includes(TEN_GOD_GROUP[tenGod(c.dmStem, s)]))
  );
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  if (selfRatio >= T.strongSelf && c.groups.관성 / total <= T.strongOfficialMax) {
    const kind = c.groups.비겁 >= c.groups.인성 ? "종왕" : "종강";
    const g = kind === "종왕" ? "비겁" : "인성";
    return {
      kind, yongsin: c.elements[g],
      detail: `일간을 돕는 힘이 ${pct(selfRatio)}, 관성이 ${pct(c.groups.관성 / total)}라 ${kind}격으로 볼 수 있습니다. 이 경우 ${g}(${c.elements[g]})을 용신으로 봅니다.`,
    };
  }
  if (selfRatio <= T.weakSelf && noRoot) {
    const g = (["식상", "재성", "관성"] as const).reduce((best, x) => (c.groups[x] > c.groups[best] ? x : best));
    const kind = ({ 식상: "종아", 재성: "종재", 관성: "종살" } as const)[g];
    return {
      kind, yongsin: c.elements[g],
      detail: `일간을 돕는 힘이 ${pct(selfRatio)}이고 지지에 일간의 뿌리가 없어 가장 강한 ${g}을 따르는 ${kind}격으로 볼 수 있습니다. 이 경우 ${g}(${c.elements[g]})을 용신으로 봅니다.`,
    };
  }
  const dayCombine = relations.find((r) => r.dayMaster);
  if (dayCombine?.element && dayCombine.element === BRANCH_ELEMENT[p.month.branch] && noRoot) {
    const e = dayCombine.element;
    return {
      kind: "화격", yongsin: e,
      detail: `일간이 ${dayCombine.chars} 합을 하고 합화 오행 ${elJosa(e, "이", "가")} 월령과 같으며 일간의 뿌리가 없어 화격으로 볼 수 있습니다. 이 경우 ${elJosa(e, "을", "를")} 용신으로 봅니다.`,
    };
  }
  return null;
}

export function analyzeGeokguk(input: {
  pillars: FourPillars;
  scores: ElementScores;
  groups: Record<TenGodGroup, number>;
  selfRatio: number;
  strength: StrengthLike;
  relations: SajuRelation[];
}): Geokguk {
  const { pillars: p, scores, groups, selfRatio, strength, relations } = input;
  const dmStem = p.day.stem;
  const dm = STEM_ELEMENT[dmStem];
  const stems: Ctx["stems"] = [{ pos: "year", stem: p.year.stem }, { pos: "month", stem: p.month.stem }];
  if (p.hour) stems.push({ pos: "hour", stem: p.hour.stem });
  const mainQi = [p.year, p.month, p.day, p.hour]
    .filter((x) => x !== null)
    .map((x) => HIDDEN_STEMS[x!.branch].at(-1)![0]);
  const c: Ctx = { dmStem, dm, elements: groupElements(dm), groups, stems, mainQi };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  const { name, stem, basis } = determine(p, c);
  const broken = brokenReason(name, c);
  const col: Column =
    strength === "극신강" || strength === "신강" ? "신강" : strength === "중화" ? "중화" : "신약";
  const pick = broken ? null : pickSangsin(name, col, c);

  return {
    name,
    easy: GEOK_EASY[name],
    stem,
    basis,
    status: broken ? "파격" : "성격",
    broken: broken ?? undefined,
    applied: pick !== null,
    sangsin: pick ? { ...pick, element: c.elements[pick.group] } : null,
    fallback: broken
      ? "격이 온전하지 않아 강약 기준을 따랐습니다."
      : pick
        ? undefined
        : `일간이 강한 것을 전제로 하는 격인데 이 사주는 ${strength}하여 강약 기준을 따랐습니다.`,
    borderline: borderlineReasons(selfRatio, strength, c, total),
    outer: outerCandidate(p, c, selfRatio, total, relations),
  };
}
