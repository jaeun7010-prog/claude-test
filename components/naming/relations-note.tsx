import type { ElementScores, SajuRelation } from "@/lib/saju";

const ELEMENTS = ["목", "화", "토", "금", "수"] as const;

const percent = (s: ElementScores) => {
  const total = ELEMENTS.reduce((a, e) => a + s[e], 0);
  return Object.fromEntries(ELEMENTS.map((e) => [e, total > 0 ? Math.round((s[e] / total) * 100) : 0]));
};

/** 원국의 합·충·형 안내. 쉬운 설명을 먼저 보여 주고 용어와 근거는 자세히 보기로 */
export function RelationsNote({
  relations,
  rawScores,
  scores,
  detailed = true,
}: {
  relations: SajuRelation[];
  rawScores: ElementScores;
  scores: ElementScores;
  /** false면 쉬운 설명만 그린다 (용어·근거·비율은 프리미엄 리포트 결제 후) */
  detailed?: boolean;
}) {
  if (relations.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        기운끼리 서로 끌어당기거나 부딪치는 관계(합·충·형)가 없어, 타고난 기운을 그대로 보았습니다.
      </p>
    );
  }

  // 세력에 반영된 관계를 먼저, 같은 문장은 한 번만
  const effective = relations.filter((r) => r.status !== "표시만");
  const easy = [...new Set([...effective, ...relations.filter((r) => r.status === "표시만")].map((r) => r.easy))];
  const before = percent(rawScores);
  const after = percent(scores);

  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">기운 사이의 관계</p>
      <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
        {easy.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {detailed && (
      <details className="text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer leading-[44px]">자세히 보기</summary>
        <ul className="mt-2 space-y-1">
          {relations.map((r, i) => (
            <li key={i}>
              <span className="text-foreground">{r.kind}</span> · {r.detail}
              {r.status === "표시만" && " (세력에는 반영하지 않음)"}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          오행 비율 (합·충·형 반영 전 → 후):{" "}
          {ELEMENTS.map((e) => `${e} ${before[e]}→${after[e]}%`).join(" · ")}
        </p>
        <p className="mt-1">
          합은 붙어 있는 글자끼리만 보고(삼합·방합은 세 글자가 모두 있을 때), 합화는 합의 오행이 태어난 달의
          오행(월령)과 같을 때만 인정합니다. 충은 붙어 있으면 ×0.7, 떨어져 있으면 ×0.85, 형은 ×0.9로 힘을
          줄입니다.
        </p>
      </details>
      )}
    </div>
  );
}
