import Link from "next/link";

import { COMBINATION_GUIDE, type CombinationItem } from "@/lib/naming/combination";

/** 부모 성 함께 쓰기의 조합 진단 (고정된 부분의 약점을 쉬운 말로) */
export function CombinationNote({
  items,
  label,
  lockedHref = null,
}: {
  items: CombinationItem[];
  /** 예: 김 + 박 */
  label: string;
  /** 결제 전이면 리포트로 가는 링크. "괜찮은 점"은 그리지 않는다 (약점은 무료) */
  lockedHref?: string | null;
}) {
  const weak = items.filter((x) => x.tone === "weak");
  const good = items.filter((x) => x.tone === "good");
  return (
    <section aria-labelledby="combination-title" className="space-y-2 rounded-md border p-4 text-sm">
      <h2 id="combination-title" className="font-medium">
        조합 진단 · {label}
      </h2>
      <p className="text-muted-foreground">
        어떤 이름을 골라도 똑같이 들어가는 부분(성 + 함께 쓰는 부모 성)을 따로 살펴봤습니다.
      </p>
      {weak.length > 0 && (
        <div>
          <p className="font-medium">참고할 약점</p>
          <ul className="list-disc space-y-1 pl-5">
            {weak.map((x) => (
              <li key={x.text}>{x.text}</li>
            ))}
          </ul>
        </div>
      )}
      {good.length > 0 &&
        (lockedHref ? (
          <p className="text-muted-foreground">
            {weak.length === 0 && "눈에 띄는 약점은 없습니다. "}
            괜찮은 점 {good.length}가지는 프리미엄 리포트에서 볼 수 있습니다.{" "}
            <Link href={lockedHref} className="font-medium text-primary underline-offset-4 hover:underline">
              프리미엄 리포트로 보기 ›
            </Link>
          </p>
        ) : (
          <div>
            <p className="font-medium">괜찮은 점</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {good.map((x) => (
                <li key={x.text}>{x.text}</li>
              ))}
            </ul>
          </div>
        ))}
      <p className="text-xs text-muted-foreground">{COMBINATION_GUIDE}</p>
    </section>
  );
}
