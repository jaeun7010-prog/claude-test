import { cn } from "@/lib/utils";

/**
 * 이름 표시. 글자마다 [한글 위 / 한자 아래] 묶음을 가로로 놓아 한자가 한글 바로 아래 가운데 온다.
 * 순우리말 이름은 hanja를 넘기지 않으면 이름만 나온다.
 */
export function NameWithHanja({
  name,
  hanja,
  nameSize = 40,
  hanjaSize = 18,
  className,
}: {
  /** 성까지 포함한 한글 이름 (예: 김서윤) */
  name: string;
  /** name과 같은 글자 수의 한자 (예: 金瑞潤) */
  hanja?: string | null;
  nameSize?: number;
  hanjaSize?: number;
  className?: string;
}) {
  // 확장 한자는 두 칸을 차지하므로 코드 포인트 단위로 나눈다
  const nameChars = Array.from(name);
  const hanjaChars = Array.from(hanja ?? "");
  return (
    <span
      role="img"
      aria-label={hanja ? `${name} ${hanja}` : name}
      className={cn("inline-flex items-start font-serif", className)}
      style={{ gap: Math.round(nameSize * 0.1) }}
    >
      {nameChars.map((char, i) => (
        <span key={i} aria-hidden="true" className="flex flex-col items-center">
          <span className="font-bold leading-[1.2]" style={{ fontSize: nameSize }}>
            {char}
          </span>
          {hanja && (
            <span className="font-medium leading-[1.4] text-ink-soft" style={{ fontSize: hanjaSize }}>
              {hanjaChars[i] ?? " "}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
