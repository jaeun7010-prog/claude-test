import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LockedPreview } from "@/components/naming/locked-preview";
import { GeokgukNote } from "@/components/naming/geokguk-note";
import { RelationsNote } from "@/components/naming/relations-note";
import { TimeCorrectionNote } from "@/components/naming/time-correction-note";
import type { NamingParams } from "@/lib/naming/params";
import { BRANCHES_KO, STEMS_KO, type analyzeSaju, type Pillar } from "@/lib/saju";

/** 사주 원국 카드 (추천 결과 화면). 셀프 작명 결과 화면에서도 함께 쓴다 */

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

function PillarCell({ label, pillar }: { label: string; pillar: Pillar | null }) {
  return (
    <div className="rounded-md bg-secondary p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      {pillar ? (
        <>
          <p className="font-serif text-2xl font-bold">{pillar.hanja}</p>
          <p className="text-xs text-muted-foreground">
            {STEMS_KO[pillar.stem]}
            {BRANCHES_KO[pillar.branch]}
          </p>
        </>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">미상</p>
      )}
    </div>
  );
}

/**
 * 네 기둥·출생 시각 보정·합충·격국·용신. `detailed`(같은 조건 리포트 결제)면 오행 비율·근거·용신을 고른 이유까지 그린다
 */
export function SajuCard({
  saju,
  p,
  detailed,
}: {
  saju: ReturnType<typeof analyzeSaju>;
  p: NamingParams;
  detailed: boolean;
}) {
  const { pillars, yongsin } = saju;
  const total = Object.values(yongsin.scores).reduce((a, b) => a + b, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>사주 원국</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-4 gap-3">
          <PillarCell label="시주" pillar={pillars.hour} />
          <PillarCell label="일주" pillar={pillars.day} />
          <PillarCell label="월주" pillar={pillars.month} />
          <PillarCell label="연주" pillar={pillars.year} />
        </div>

        <TimeCorrectionNote
          correction={saju.timeCorrection}
          birthplace={p.birthplace}
          input={p.hasTime ? { hour: p.birth.hour!, minute: p.birth.minute ?? 0 } : null}
          hourPillar={pillars.hour}
          dayPillar={pillars.day}
        />

        {detailed && (
          <div className="space-y-2">
            {(["목", "화", "토", "금", "수"] as const).map((e) => (
              <div key={e} className="flex items-center gap-3 text-sm">
                <span className="w-8 font-serif">
                  {ELEMENT_HANJA[e]}
                  {e}
                </span>
                <div className="h-2 flex-1 rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.round((yongsin.scores[e] / total) * 100)}%` }}
                  />
                </div>
                <span className="w-10 text-right text-muted-foreground">
                  {Math.round((yongsin.scores[e] / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}

        <RelationsNote
          relations={yongsin.relations}
          rawScores={yongsin.rawScores}
          scores={yongsin.scores}
          detailed={detailed}
        />
        <GeokgukNote yongsin={yongsin} detailed={detailed} />

        <div className="rounded-md border p-4 text-sm">
          <p>
            일간 <b>{ELEMENT_HANJA[yongsin.dayMaster.element]}{yongsin.dayMaster.element}</b> ·{" "}
            <b>{yongsin.strength}</b> · 용신 <b>{ELEMENT_HANJA[yongsin.yongsin]}{yongsin.yongsin}</b>{" "}
            <span className="text-muted-foreground">({yongsin.method}용신)</span>
          </p>
          <p className="mt-1 text-muted-foreground">
            희신 {yongsin.huisin} · 피하면 좋은 기운 {yongsin.gisin}
          </p>
          {detailed && <p className="mt-2 text-muted-foreground">{yongsin.reason}</p>}
        </div>
        {!detailed && (
          <LockedPreview
            what="오행 비율 · 기운 관계와 격국의 근거 · 용신을 고른 이유"
            href="#names"
            label="이름을 고르고 프리미엄 리포트로 보기"
          />
        )}
        <p className="text-xs text-muted-foreground">
          사주의 강약, 계절 균형, 합충, 격국을 기준으로 아이에게 필요한 기운을 찾았습니다. 학파에 따라 해석이 다를 수
          있습니다.
        </p>
      </CardContent>
    </Card>
  );
}
