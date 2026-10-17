import type { YongsinResult } from "@/lib/saju";

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

export const OUTER_NOTICE =
  "한쪽 기운이 매우 강해 학파에 따라 필요한 기운을 반대로 보기도 합니다. 여기서는 일반적인 강약 판단을 따랐습니다.";

/** 격국 쉬운 설명 한 문장 (결과 화면·PDF 공용) */
export function geokgukEasy(yongsin: YongsinResult): string | null {
  const g = yongsin.geokguk;
  if (!g) return null;
  const core = g.name.replace(/격$/, "");
  if (!g.applied || !g.sangsin) {
    return `태어난 달을 기준으로 보면 '${g.easy}(${core})'형 사주지만, ${
      g.status === "파격" ? "격을 이루는 기운이 온전하지 않아" : "아이 자신의 기운이 약해"
    } 기운의 강약을 기준으로 필요한 기운을 찾았습니다.`;
  }
  const e = g.sangsin.element;
  let text = `태어난 달을 기준으로 보면 '${g.easy}(${core})'형 사주로, ${g.sangsin.easyVerb} ${ELEMENT_HANJA[e]}(${e}) 기운이 필요합니다.`;
  if (yongsin.method === "조후" && yongsin.yongsin !== e) {
    text += ` 다만 계절의 균형을 위해 ${ELEMENT_HANJA[yongsin.yongsin]}(${yongsin.yongsin}) 기운을 먼저 채웁니다.`;
  }
  return text;
}

/** 격국 안내. 쉬운 설명을 먼저 보여 주고 격 이름·근거·상신은 자세히 보기로 */
export function GeokgukNote({
  yongsin,
  detailed = true,
}: {
  yongsin: YongsinResult;
  /** false면 쉬운 설명만 그린다 (격 이름·근거·상신은 프리미엄 리포트 결제 후) */
  detailed?: boolean;
}) {
  const g = yongsin.geokguk;
  if (!g) return null;
  const border = g.borderline.length > 0;

  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">태어난 달로 본 사주의 틀(격국)</p>
      <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
        <li>{geokgukEasy(yongsin)}</li>
        {g.outer && <li>{OUTER_NOTICE}</li>}
      </ul>
      {detailed && (
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">자세히 보기</summary>
        <ul className="mt-2 space-y-1">
          <li>
            <span className="text-foreground">격</span> · {g.name} — {g.basis} {g.name}으로 봅니다.
          </li>
          <li>
            <span className="text-foreground">상신</span> ·{" "}
            {g.sangsin
              ? `${g.sangsin.group}(${g.sangsin.element}) — ${g.sangsin.reason}`
              : `없음 — ${g.fallback}`}
          </li>
          <li>
            <span className="text-foreground">성격·파격</span> · {g.status}
            {g.broken && ` — ${g.broken}`}
          </li>
          <li>
            <span className="text-foreground">경계 사주</span> ·{" "}
            {border
              ? `${g.borderline.join(" / ")} — 기운의 강약이 경계에 가까워 ${
                  g.applied ? "태어난 달을 기준으로 한 판단(격국)을 따랐습니다." : "해석이 갈릴 수 있습니다."
                }`
              : "아님"}
          </li>
          <li>
            <span className="text-foreground">외격 후보</span> · {g.outer ? `${g.outer.kind} — ${g.outer.detail}` : "없음"}
          </li>
        </ul>
        <p className="mt-2">
          《자평진전》 기준으로 태어난 달(월지) 속 기운 중 천간에 드러난 글자로 격을 정하고, 기운의 강약에 맞춰 격을
          받쳐 주거나 다스리는 기운(상신)을 용신으로 씁니다. 격이 온전하지 않으면(파격) 강약 기준을 따르고, 한겨울·한여름에
          화·수 기운이 크게 부족하면 계절 균형(조후)을 마지막에 우선합니다.
        </p>
      </details>
      )}
    </div>
  );
}
