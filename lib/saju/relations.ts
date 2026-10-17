import type { Element } from "@/lib/naming/types";
import {
  BRANCHES,
  BRANCH_ELEMENT,
  ELEMENT_ORDER,
  HIDDEN_STEMS,
  STEMS,
  STEM_ELEMENT,
} from "./constants";
import type { FourPillars } from "./pillars";

// ---------------------------------------------------------------------------
// 원국의 합·충·형을 찾아 오행 세력에 반영한다.
//
// 글자마다 "가중치 × 오행 분포"를 두고, 관계에 따라 분포를 다른 오행으로 옮기거나(합화)
// 가중치를 줄인다(묶임·충·형). 지지 하나는 합 하나에만 들어간다 (방합 > 삼합 > 반합 > 육합).
// ---------------------------------------------------------------------------

/** 위치별 가중치. 월지(월령)를 가장 크게 본다 */
export const STEM_WEIGHT = { year: 1.0, month: 1.2, day: 1.0, hour: 1.0 } as const;
export const BRANCH_WEIGHT = { year: 1.0, month: 3.0, day: 1.5, hour: 1.2 } as const;

/** 관계별 세력 반영 비율. 값을 바꾸면 scripts/compare-relations.ts로 용신·등급 변화를 다시 확인한다 */
export const RELATION_FACTORS = {
  /** 반합: 생지·고지 분포 중 국 오행으로 옮기는 비율 */
  halfCombineShift: 0.5,
  /** 육합 합화 성립: 두 지지 분포 중 합화 오행으로 옮기는 비율 */
  sixCombineShift: 0.5,
  /** 육합 불성립(묶임): 두 지지 가중치 배율 */
  sixCombineBound: 0.8,
  /** 천간합 불성립(묶임): 두 천간 가중치 배율 */
  stemCombineBound: 0.5,
  /** 충: 붙어 있을 때 / 떨어져 있을 때 두 지지 가중치 배율 */
  clashAdjacent: 0.7,
  clashDistant: 0.85,
  /** 형: 해당 지지 가중치 배율 (지지당 한 번만). 삼형은 세 글자가 다 있을 때만 */
  punishment: 0.9,
} as const;

export type Position = "year" | "month" | "day" | "hour";
const POSITIONS: Position[] = ["year", "month", "day", "hour"];
export const POSITION_KO: Record<Position, string> = { year: "연", month: "월", day: "일", hour: "시" };
/** 쉬운 설명용 */
const POSITION_EASY: Record<Position, string> = {
  year: "태어난 해",
  month: "태어난 달",
  day: "태어난 날",
  hour: "태어난 시간",
};

export type RelationKind = "방합" | "삼합" | "반합" | "육합" | "천간합" | "충" | "형";

export interface SajuRelation {
  kind: RelationKind;
  /** 천간 관계인지 지지 관계인지 */
  layer: "천간" | "지지";
  positions: Position[];
  /** 관계를 이룬 글자 (예: 申子辰) */
  chars: string;
  /** 합의 결과 오행 */
  element?: Element;
  /**
   * 성립: 합화·국이 이루어져 오행이 바뀜 / 묶임: 합했지만 오행은 그대로이고 힘이 줄어듦
   * 감쇠: 충·형으로 힘이 줄어듦 / 표시만: 세력에 반영하지 않고 근거로만 남김 (일간합·쟁합 등)
   */
  status: "성립" | "묶임" | "감쇠" | "표시만";
  /** 용어를 쓴 근거 설명 */
  detail: string;
  /** 쉬운 말 설명 */
  easy: string;
}

export type ElementScores = Record<Element, number>;

interface Unit {
  layer: "천간" | "지지";
  pos: Position;
  /** 천간 또는 지지 index */
  char: number;
  weight: number;
  /** 오행 분포 (합 1) */
  dist: ElementScores;
  /** 합에 이미 들어갔는지 */
  combined: boolean;
  /** 삼합·방합으로 묶여 충을 받지 않는지 */
  locked: boolean;
  punished: boolean;
}

/** 오행 이름 뒤 조사 (목·금은 받침이 있다) */
const hasFinal = (e: Element) => e === "목" || e === "금";
const iga = (e: Element) => `${e}${hasFinal(e) ? "이" : "가"}`;
const euro = (e: Element) => `${e}${hasFinal(e) ? "으로" : "로"}`;

const zero = (): ElementScores => ({ 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 });

function shift(u: Unit, to: Element, fraction: number) {
  for (const e of ELEMENT_ORDER) u.dist[e] *= 1 - fraction;
  u.dist[to] += fraction;
}

const adjacent = (a: Position, b: Position) =>
  Math.abs(POSITIONS.indexOf(a) - POSITIONS.indexOf(b)) === 1;

const posKo = (ps: Position[]) => ps.map((p) => `${POSITION_KO[p]}지`).join("·");
const posKoStem = (ps: Position[]) => ps.map((p) => `${POSITION_KO[p]}간`).join("·");
/** 받침 유무에 따라 "와/과" */
const withWa = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return `${word}${code >= 0 && code % 28 !== 0 ? "과" : "와"}`;
};
const posEasy = (ps: Position[]) => {
  const names = ps.map((p) => POSITION_EASY[p]);
  if (names.length <= 2) return names.length === 1 ? names[0] : `${withWa(names[0])} ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, ${names.at(-1)}`;
};

// 지지 index: 子0 丑1 寅2 卯3 辰4 巳5 午6 未7 申8 酉9 戌10 亥11
/** 방합: [지지 3개, 오행] */
const DIRECTIONAL: [number[], Element][] = [
  [[2, 3, 4], "목"],
  [[5, 6, 7], "화"],
  [[8, 9, 10], "금"],
  [[11, 0, 1], "수"],
];
/** 삼합: [생지, 왕지, 고지], 오행 */
const TRINE: [number[], Element][] = [
  [[8, 0, 4], "수"],
  [[11, 3, 7], "목"],
  [[2, 6, 10], "화"],
  [[5, 9, 1], "금"],
];
/** 육합: [지지 2개, 합화 오행]. 午未는 합화 오행 학설이 갈려 묶임만 본다 */
const SIX: [number, number, Element | null][] = [
  [0, 1, "토"],
  [2, 11, "목"],
  [3, 10, "화"],
  [4, 9, "금"],
  [5, 8, "수"],
  [6, 7, null],
];
/** 천간합: 甲己土 乙庚金 丙辛水 丁壬木 戊癸火 (천간 index 차이가 5) */
const STEM_COMBINE_ELEMENT: Element[] = ["토", "금", "수", "목", "화"];
/** 충: 지지 index 차이가 6 */
/** 삼형(寅巳申·丑戌未)은 세 글자가 다 있어야, 상형(子卯)은 두 글자로 세력에 반영한다 */
const PUNISH_GROUPS: number[][] = [
  [2, 5, 8], // 寅巳申
  [1, 10, 7], // 丑戌未
  [0, 3], // 子卯
];
/** 자형: 같은 글자가 두 번 */
const SELF_PUNISH = new Set([4, 6, 9, 11]); // 辰午酉亥

export interface RelationAnalysis {
  /** 합·충·형 반영 전 오행 세력 */
  rawScores: ElementScores;
  /** 반영 후 오행 세력 (신강·신약과 용신 판단에 쓴다) */
  scores: ElementScores;
  relations: SajuRelation[];
}

function buildUnits(p: FourPillars): Unit[] {
  const units: Unit[] = [];
  for (const pos of POSITIONS) {
    const pillar = p[pos];
    if (!pillar) continue;
    const sd = zero();
    sd[STEM_ELEMENT[pillar.stem]] = 1;
    units.push({
      layer: "천간", pos, char: pillar.stem, weight: STEM_WEIGHT[pos], dist: sd,
      combined: false, locked: false, punished: false,
    });
    // 지장간 일수 비율로 분배
    const bd = zero();
    for (const [stem, days] of HIDDEN_STEMS[pillar.branch]) bd[STEM_ELEMENT[stem]] += days / 30;
    units.push({
      layer: "지지", pos, char: pillar.branch, weight: BRANCH_WEIGHT[pos], dist: bd,
      combined: false, locked: false, punished: false,
    });
  }
  return units;
}

function sumScores(units: Unit[]): ElementScores {
  const s = zero();
  for (const u of units) for (const e of ELEMENT_ORDER) s[e] += u.weight * u.dist[e];
  for (const e of ELEMENT_ORDER) s[e] = Math.round(s[e] * 100) / 100;
  return s;
}

/** 아직 합에 들어가지 않은 지지 중 해당 글자를 하나씩 고른다. 하나라도 없으면 null */
function pickBranches(branches: Unit[], chars: number[]): Unit[] | null {
  const picked: Unit[] = [];
  for (const c of chars) {
    const u = branches.find((b) => b.char === c && !b.combined && !picked.includes(b));
    if (!u) return null;
    picked.push(u);
  }
  return picked;
}

export function analyzeRelations(p: FourPillars): RelationAnalysis {
  const units = buildUnits(p);
  const rawScores = sumScores(units);
  const stems = units.filter((u) => u.layer === "천간");
  const branches = units.filter((u) => u.layer === "지지");
  const relations: SajuRelation[] = [];
  const monthElement = BRANCH_ELEMENT[p.month.branch];
  const F = RELATION_FACTORS;
  const order = (us: Unit[]) =>
    [...us].sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos));

  // --- 방합·삼합: 세 지지가 모두 있으면 셋 다 그 오행으로 본다 ---
  for (const [kind, table] of [["방합", DIRECTIONAL], ["삼합", TRINE]] as const) {
    for (const [chars, element] of table) {
      const picked = pickBranches(branches, chars);
      if (!picked) continue;
      const us = order(picked);
      for (const u of us) {
        shift(u, element, 1);
        u.combined = true;
        u.locked = true;
      }
      const ps = us.map((u) => u.pos);
      relations.push({
        kind, layer: "지지", positions: ps, element, status: "성립",
        chars: chars.map((c) => BRANCHES[c]).join(""),
        detail: `${chars.map((c) => BRANCHES[c]).join("")} ${kind}(${posKo(ps)}) → 세 지지를 ${euro(element)} 봄`,
        easy: `${posEasy(ps)}의 기운이 하나로 뭉쳐 ${element} 기운이 강해졌습니다.`,
      });
    }
  }

  // --- 반합: 왕지 + 생지 또는 고지가 붙어 있으면 생지·고지의 일부를 국 오행으로 ---
  for (const [[birth, peak, grave], element] of TRINE) {
    for (const other of [birth, grave]) {
      const pk = branches.find((b) => b.char === peak && !b.combined);
      if (!pk) continue;
      const ot = branches.find((b) => b.char === other && !b.combined && adjacent(b.pos, pk.pos));
      if (!ot) continue;
      shift(ot, element, F.halfCombineShift);
      pk.combined = ot.combined = true;
      const us = order([pk, ot]);
      const ps = us.map((u) => u.pos);
      const chars = us.map((u) => BRANCHES[u.char]).join("");
      relations.push({
        kind: "반합", layer: "지지", positions: ps, element, status: "성립", chars,
        detail: `${chars} 반합(${posKo(ps)}) → ${BRANCHES[other]}의 ${F.halfCombineShift * 100}%를 ${euro(element)} 봄`,
        easy: `${posEasy(ps)}의 기운이 어울려 ${element} 기운이 조금 강해졌습니다.`,
      });
    }
  }

  // --- 육합: 붙어 있는 두 지지. 합화 오행이 월령과 같고 천간에 드러나 있어야 합화 ---
  for (const [a, b, element] of SIX) {
    const ua = branches.find((u) => u.char === a && !u.combined);
    if (!ua) continue;
    const ub = branches.find((u) => u.char === b && !u.combined && adjacent(u.pos, ua.pos));
    if (!ub) continue;
    ua.combined = ub.combined = true;
    const us = order([ua, ub]);
    const ps = us.map((u) => u.pos);
    const chars = us.map((u) => BRANCHES[u.char]).join("");
    const transformed =
      element !== null && monthElement === element && stems.some((s) => STEM_ELEMENT[s.char] === element);
    if (transformed) {
      for (const u of us) shift(u, element!, F.sixCombineShift);
      relations.push({
        kind: "육합", layer: "지지", positions: ps, element: element!, status: "성립", chars,
        detail: `${chars} 육합(${posKo(ps)}) 합화 ${element} — 월령과 천간에 모두 ${element} 기운이 있음 → 두 지지의 ${F.sixCombineShift * 100}%를 ${euro(element)} 봄`,
        easy: `${posEasy(ps)}의 기운이 서로 끌어당겨 ${element} 기운으로 바뀌었습니다.`,
      });
    } else {
      for (const u of us) u.weight *= F.sixCombineBound;
      relations.push({
        kind: "육합", layer: "지지", positions: ps, element: element ?? undefined, status: "묶임", chars,
        detail: `${chars} 육합(${posKo(ps)}) — ${element ? `월령이 ${iga(element)} 아니거나 천간에 ${iga(element)} 없어` : "午未합은 합화 오행을 보지 않아"} 합화하지 않음 → 두 지지 힘 ×${F.sixCombineBound}`,
        easy: `${posEasy(ps)}의 기운이 서로 묶여 힘이 조금 줄었습니다.`,
      });
    }
  }

  // --- 천간합: 붙어 있는 두 천간. 합화 오행이 월령과 같아야 합화 ---
  const stemPairs: [Unit, Unit][] = [];
  for (let i = 0; i < stems.length - 1; i++) {
    const [x, y] = [stems[i], stems[i + 1]];
    if (adjacent(x.pos, y.pos) && Math.abs(x.char - y.char) === 5) stemPairs.push([x, y]);
  }
  for (const [x, y] of stemPairs) {
    const element = STEM_COMBINE_ELEMENT[Math.min(x.char, y.char)];
    const ps = [x.pos, y.pos];
    const chars = STEMS[x.char] + STEMS[y.char];
    const base = { kind: "천간합" as const, layer: "천간" as const, positions: ps, element, chars };
    // 쟁합: 한 천간에 양옆 두 천간이 합하려 함
    const contested = stemPairs.some(([a, b]) => (a !== x || b !== y) && [a, b].some((u) => u === x || u === y));
    if (contested) {
      relations.push({
        ...base, status: "표시만",
        detail: `${chars} 천간합(${posKoStem(ps)}) — 한 글자에 두 글자가 합하려는 쟁합이라 합이 이루어지지 않은 것으로 봄`,
        easy: `${posEasy(ps)}의 기운이 끌어당기지만 다른 기운과 다투어 그대로 둡니다.`,
      });
      continue;
    }
    if (x.pos === "day" || y.pos === "day") {
      relations.push({
        ...base, status: "표시만",
        detail: `${chars} 천간합(${posKoStem(ps)}) — 일간이 합하므로 일간 오행은 바꾸지 않음${monthElement === element ? ` (월령도 같은 ${element} 기운이라 화격 여부를 따로 살핌)` : ""}`,
        easy: `아이 자신을 나타내는 기운이 ${POSITION_EASY[x.pos === "day" ? y.pos : x.pos]}의 기운과 끌어당기지만, 본래 기운은 그대로 봅니다.`,
      });
      x.combined = y.combined = true;
      continue;
    }
    x.combined = y.combined = true;
    if (monthElement === element) {
      for (const u of [x, y]) shift(u, element, 1);
      relations.push({
        ...base, status: "성립",
        detail: `${chars} 천간합(${posKoStem(ps)}) 합화 ${element} — 월령이 ${element} → 두 천간을 ${euro(element)} 봄`,
        easy: `${posEasy(ps)}의 기운이 서로 끌어당겨 ${element} 기운으로 바뀌었습니다.`,
      });
    } else {
      for (const u of [x, y]) u.weight *= F.stemCombineBound;
      relations.push({
        ...base, status: "묶임",
        detail: `${chars} 천간합(${posKoStem(ps)}) — 월령이 ${iga(element)} 아니라 합화하지 않음 → 두 천간 힘 ×${F.stemCombineBound}`,
        easy: `${posEasy(ps)}의 기운이 서로 묶여 힘이 줄었습니다.`,
      });
    }
  }

  // --- 충: 지지 index 차이 6. 삼합·방합으로 뭉친 지지는 흔들리지 않는다 ---
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const [x, y] = [branches[i], branches[j]];
      if (Math.abs(x.char - y.char) !== 6) continue;
      const ps = [x.pos, y.pos];
      const chars = BRANCHES[x.char] + BRANCHES[y.char];
      if (x.locked || y.locked) {
        relations.push({
          kind: "충", layer: "지지", positions: ps, chars, status: "표시만",
          detail: `${chars} 충(${posKo(ps)}) — 삼합·방합으로 뭉친 지지가 있어 힘을 줄이지 않음`,
          easy: `${posEasy(ps)}의 기운이 부딪치지만, 한쪽이 단단히 뭉쳐 있어 영향이 적습니다.`,
        });
        continue;
      }
      const near = adjacent(x.pos, y.pos);
      const f = near ? F.clashAdjacent : F.clashDistant;
      x.weight *= f;
      y.weight *= f;
      relations.push({
        kind: "충", layer: "지지", positions: ps, chars, status: "감쇠",
        detail: `${chars} 충(${posKo(ps)}, ${near ? "붙어 있음" : "떨어져 있음"}) → 두 지지 힘 ×${f}`,
        easy: `${posEasy(ps)}의 기운이 서로 부딪쳐 둘 다 ${near ? "" : "조금 "}약해졌습니다.`,
      });
    }
  }

  // --- 형: 삼형·상형은 두 글자 이상, 자형은 같은 글자 두 번. 지지당 한 번만 줄인다 ---
  const punish = (us: Unit[], label: string, effective = true) => {
    const fresh = effective ? us.filter((u) => !u.punished) : [];
    for (const u of fresh) {
      u.weight *= F.punishment;
      u.punished = true;
    }
    const ordered = order(us);
    const ps = ordered.map((u) => u.pos);
    relations.push({
      kind: "형", layer: "지지", positions: ps, status: fresh.length ? "감쇠" : "표시만",
      chars: ordered.map((u) => BRANCHES[u.char]).join(""),
      detail: effective
        ? `${ordered.map((u) => BRANCHES[u.char]).join("")} ${label}(${posKo(ps)}) → 해당 지지 힘 ×${F.punishment}`
        : `${ordered.map((u) => BRANCHES[u.char]).join("")} ${label}(${posKo(ps)}) — 삼형의 세 글자가 다 있지 않아 힘은 줄이지 않음`,
      easy: effective
        ? `${posEasy(ps)}의 기운이 서로 긴장 관계라 조금 약해졌습니다.`
        : `${posEasy(ps)}의 기운이 약한 긴장 관계지만 영향은 거의 없습니다.`,
    });
  };
  for (const group of PUNISH_GROUPS) {
    const us = branches.filter((b) => group.includes(b.char));
    const distinct = new Set(us.map((u) => u.char)).size;
    if (distinct < 2) continue;
    // 寅巳申·丑戌未 삼형은 세 글자가 모두 있을 때만 세력에 반영한다. 子卯 상형은 두 글자로 성립
    if (group.length === 3) punish(us, distinct === 3 ? "삼형" : "삼형 일부", distinct === 3);
    else punish(us, "상형");
  }
  for (const c of SELF_PUNISH) {
    const us = branches.filter((b) => b.char === c);
    if (us.length >= 2) punish(us, "자형");
  }

  return { rawScores, scores: sumScores(units), relations };
}
