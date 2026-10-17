import { COMBINATION_GUIDE, type CombinationItem } from "@/lib/naming/combination";

/** 부모 성 함께 쓰기의 조합 진단 (고정된 부분의 약점을 쉬운 말로) */
export function CombinationNote({
  items,
  label,
}: {
  items: CombinationItem[];
  /** 예: 김 + 박 */
  label: string;
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
      {good.length > 0 && (
        <div>
          <p className="font-medium">괜찮은 점</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {good.map((x) => (
              <li key={x.text}>{x.text}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{COMBINATION_GUIDE}</p>
    </section>
  );
}
