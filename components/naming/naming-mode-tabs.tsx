import Link from "next/link";

type NamingMode = "recommend" | "self";

const MODES: { value: NamingMode; href: string; label: string; hint: string }[] = [
  { value: "recommend", href: "/naming", label: "추천받기", hint: "사주에 맞는 이름을 골라 드려요" },
  { value: "self", href: "/naming/self", label: "직접 짓기", hint: "정한 이름에 맞는 한자를 골라요" },
];

/** 작명 입력 화면의 추천받기 / 직접 짓기(셀프 작명) 탭. 두 화면은 주소가 달라 링크로 옮겨 간다 */
export function NamingModeTabs({ active }: { active: NamingMode }) {
  return (
    <nav aria-label="작명 방식" className="grid grid-cols-2 gap-1 rounded-lg border bg-secondary p-1">
      {MODES.map((m) => {
        const on = m.value === active;
        return (
          <Link
            key={m.value}
            href={m.href}
            aria-current={on ? "page" : undefined}
            className={`min-w-0 rounded-md px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="block text-sm font-semibold sm:text-base">{m.label}</span>
            <span className="mt-0.5 block text-xs break-keep">{m.hint}</span>
          </Link>
        );
      })}
    </nav>
  );
}
