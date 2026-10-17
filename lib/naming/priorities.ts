/**
 * "우리 집 우선순위": 사용자가 고른 가점을 기본 순위 점수(ranking.ts)에 더한 맞춤 점수.
 * 화면 순서와 카드 표시에만 쓰고, 등급·리포트·저장에는 성명학 점수만 쓴다.
 *
 *   맞춤 점수 = (기본 순위 점수 + Σ 단계 점수 × 항목 점수) ÷ (100 + Σ 단계 점수) × 100
 *
 * 두 항목이 모두 "보통"(0점)이면 맞춤 점수 = 기본 순위 점수. 가점 비율은 이 파일의 상수만 바꾸면 된다.
 * 브라우저에서도 쓰므로 서버 전용 모듈을 가져오지 않는다.
 */

export type PriorityLevel = "normal" | "important" | "very";
export type PriorityKey = "rare" | "global";
export type SortKey = "custom" | "rare" | "popular";

export interface Priorities {
  rare: PriorityLevel;
  global: PriorityLevel;
  sort: SortKey;
}

export const DEFAULT_PRIORITIES: Priorities = {
  rare: "normal",
  global: "normal",
  sort: "custom",
};

/** 단계별 최대 가점 */
export const LEVEL_POINTS: Record<PriorityLevel, number> = {
  normal: 0,
  important: 5,
  very: 10,
};

export const LEVEL_LABEL: Record<PriorityLevel, string> = {
  normal: "보통",
  important: "중요",
  very: "매우 중요",
};

export const PRIORITY_LABEL: Record<PriorityKey, string> = {
  rare: "희귀한 이름",
  global: "글로벌 발음 친화",
};

export const SORT_LABEL: Record<SortKey, string> = {
  custom: "맞춤 점수순",
  rare: "희귀한 이름순",
  popular: "인기 이름순",
};

// ---- 희귀한 이름: 2008년 이후 누적 출생신고 건수 기준 ----
// 구간은 적재된 연도 수에 따라 달라지므로, 실제 대법원 데이터를 넣은 뒤 다시 조정한다.

export type RarityStage = "매우 희귀" | "희귀" | "보통" | "흔함";

/** 누적 건수가 이 값 미만이면 해당 단계 (상위 목록에 한 번도 없으면 "매우 희귀") */
export const RARITY_MAX_BIRTHS = {
  희귀: 500,
  보통: 5000,
} as const;

export const RARITY_STAGE_SCORE: Record<RarityStage, number> = {
  "매우 희귀": 1,
  희귀: 0.7,
  보통: 0.3,
  흔함: 0,
};

// ---- 글로벌 발음 친화: global-pronunciation.ts 점수(0~100) ----

/** 이 점수 이하는 가점 0, 100점까지 비례 */
export const GLOBAL_SCORE_FLOOR = 50;
/** "글로벌 발음 우수" 배지 기준 */
export const GLOBAL_BADGE_MIN = 85;

/** 맞춤 점수 계산에 필요한 이름(대표 한자 조합) 하나의 값 */
export interface NameMetrics {
  /** 기본 순위 점수 (0~100) */
  baseScore: number;
  /** 글로벌 발음 점수 (0~100) */
  globalScore: number;
  /** 누적 출생신고 건수. 통계가 적재되지 않았으면 null */
  births: number | null;
  /** 상위 목록에 한 번이라도 올랐는가. 통계가 없으면 null */
  everListed: boolean | null;
}

export function rarityStage(m: Pick<NameMetrics, "births" | "everListed">): RarityStage | null {
  if (m.births === null || m.everListed === null) return null;
  if (!m.everListed) return "매우 희귀";
  if (m.births < RARITY_MAX_BIRTHS.희귀) return "희귀";
  if (m.births < RARITY_MAX_BIRTHS.보통) return "보통";
  return "흔함";
}

/** 항목별 점수 (0~1) */
export function itemScores(m: NameMetrics): Record<PriorityKey, number> {
  const stage = rarityStage(m);
  const g = (m.globalScore - GLOBAL_SCORE_FLOOR) / (100 - GLOBAL_SCORE_FLOOR);
  return {
    rare: stage ? RARITY_STAGE_SCORE[stage] : 0,
    global: Math.min(1, Math.max(0, g)),
  };
}

/** 맞춤 점수 (0~100, 소수 첫째 자리). `rareAvailable`이 false면 희귀 항목은 계산에서 뺀다 */
export function customScore(m: NameMetrics, p: Priorities, rareAvailable = true): number {
  const items = itemScores(m);
  let bonus = 0;
  let max = 0;
  for (const key of ["rare", "global"] as const) {
    if (key === "rare" && !rareAvailable) continue;
    const pts = LEVEL_POINTS[p[key]];
    bonus += pts * items[key];
    max += pts;
  }
  return Math.round(((m.baseScore + bonus) / (100 + max)) * 1000) / 10;
}

/**
 * 우선순위로 정렬해 상위 limit개를 돌려준다 (입력 순서는 기본 순위 점수 순이라고 가정).
 * 맞춤 점수순이 기본이고, 희귀/인기 이름순은 누적 건수로 먼저 비교한 뒤 맞춤 점수로 가른다.
 */
export function rankByPriorities<T extends { metrics: NameMetrics }>(
  items: readonly T[],
  p: Priorities,
  rareAvailable: boolean,
  limit: number
): { item: T; score: number }[] {
  const scored = items.map((item, index) => ({
    item,
    index,
    score: customScore(item.metrics, p, rareAvailable),
  }));
  const births = (x: (typeof scored)[number]) => x.item.metrics.births ?? 0;
  const sign = !rareAvailable ? 0 : p.sort === "rare" ? 1 : p.sort === "popular" ? -1 : 0;
  scored.sort(
    (a, b) =>
      sign * (births(a) - births(b)) ||
      b.score - a.score ||
      b.item.metrics.baseScore - a.item.metrics.baseScore ||
      a.index - b.index
  );
  return scored.slice(0, limit).map(({ item, score }) => ({ item, score }));
}

export type NameBadge = RarityStage | "글로벌 발음 우수";

/**
 * 카드에 붙일 작은 배지. 사용자가 "중요" 이상으로 고른 항목만 보여 준다
 * (상위 후보는 대부분 기준을 넘어서, 항상 보여 주면 구분이 되지 않는다).
 * 희귀 단계는 "매우 희귀"·"희귀"만 배지로 쓴다.
 */
export function badgesOf(m: NameMetrics, p: Priorities, rareAvailable: boolean): NameBadge[] {
  const out: NameBadge[] = [];
  if (rareAvailable && p.rare !== "normal") {
    const stage = rarityStage(m);
    if (stage === "매우 희귀" || stage === "희귀") out.push(stage);
  }
  if (p.global !== "normal" && m.globalScore >= GLOBAL_BADGE_MIN) out.push("글로벌 발음 우수");
  return out;
}

const LEVELS: readonly PriorityLevel[] = ["normal", "important", "very"];
const SORTS: readonly SortKey[] = ["custom", "rare", "popular"];

/** 저장된 값이나 요청 본문을 검증해 Priorities로. 잘못된 칸은 기본값 */
export function parsePriorities(raw: unknown): Priorities {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const level = (v: unknown) => (LEVELS.includes(v as PriorityLevel) ? (v as PriorityLevel) : "normal");
  return {
    rare: level(o.rare),
    global: level(o.global),
    sort: SORTS.includes(o.sort as SortKey) ? (o.sort as SortKey) : "custom",
  };
}
