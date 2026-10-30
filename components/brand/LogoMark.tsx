/** 두 발 발도장 로고 (docs/design-2026-10-25/logo-feet.svg) */

const INK = "#1F2D3A";

function Foot() {
  return (
    <>
      <circle cx="20" cy="14" r="6.5" />
      <circle cx="30" cy="8.5" r="4.2" />
      <circle cx="37.5" cy="9.5" r="3.7" />
      <circle cx="43.5" cy="13.5" r="3.2" />
      <circle cx="48" cy="19.5" r="2.8" />
      <path d="M16 32C15 25 22 22 30 22C40 22 48 26 48 35C48 44 44 50 41 58C38 66 39 74 37 80C35 86 31 88 27 88C21 88 18 83 18 77C18 70 21 64 21 57C21 50 17 42 16 32Z" />
    </>
  );
}

/** 발도장만. 글자와 함께 쓰면 label을 null로 넘겨 화면 낭독에서 뺀다 */
export function LogoMark({
  width = 42,
  color = INK,
  label = "이름핏 발도장 로고",
  className,
}: {
  width?: number;
  color?: string;
  label?: string | null;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 124 96"
      width={width}
      height={(width * 96) / 124}
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <g fill={color}>
        <g transform="translate(66 4) scale(-1 1) rotate(8 30 45)">
          <Foot />
        </g>
        <g transform="translate(58 4) rotate(8 30 45)">
          <Foot />
        </g>
      </g>
    </svg>
  );
}

/** 머리글용: 발도장 + "이름핏" 가로 */
export function Logo({ color = INK }: { color?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[21px] font-extrabold tracking-tight" style={{ color }}>
      <LogoMark width={42} color={color} label={null} />
      이름핏
    </span>
  );
}

/** 넓은 곳용 (SNS 프로필, 리포트 표지): 발도장 아래에 "이름핏" */
export function LogoStacked({ width = 210, color = INK }: { width?: number; color?: string }) {
  return (
    <span className="inline-flex flex-col items-center font-extrabold tracking-tight" style={{ color, gap: width / 15 }}>
      <LogoMark width={width} color={color} label={null} />
      <span className="leading-none" style={{ fontSize: width * 0.22 }}>
        이름핏
      </span>
    </span>
  );
}
