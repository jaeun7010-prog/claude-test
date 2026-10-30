import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 컬러 (CLAUDE.md "디자인 규칙"). sky는 Tailwind 기본 sky 색 단계를 대신한다
        sea: { DEFAULT: "hsl(var(--sea))", deep: "hsl(var(--sea-deep))" },
        ink: { DEFAULT: "hsl(var(--ink))", soft: "hsl(var(--ink-soft))", faint: "hsl(var(--ink-faint))" },
        cream: "hsl(var(--cream))",
        line: "hsl(var(--line))",
        sand: {
          DEFAULT: "hsl(var(--sand))",
          light: "hsl(var(--sand-light))",
          tint: "hsl(var(--sand-tint))",
          text: "hsl(var(--sand-text))",
        },
        sky: {
          DEFAULT: "hsl(var(--sky))",
          pebble: "hsl(var(--sky-pebble))",
          light: "hsl(var(--sky-light))",
          tint: "hsl(var(--sky-tint))",
        },
        coral: { DEFAULT: "hsl(var(--coral))", text: "hsl(var(--coral-text))" },
        // 오행 색: 오행을 뜻할 때만, 항상 한자와 함께 (예: bg-wood-bg text-wood-text)
        wood: { bar: "hsl(var(--wood-bar))", bg: "hsl(var(--wood-bg))", text: "hsl(var(--wood-text))" },
        fire: { bar: "hsl(var(--fire-bar))", bg: "hsl(var(--fire-bg))", text: "hsl(var(--fire-text))" },
        earth: { bar: "hsl(var(--earth-bar))", bg: "hsl(var(--earth-bg))", text: "hsl(var(--earth-text))" },
        metal: { bar: "hsl(var(--metal-bar))", bg: "hsl(var(--metal-bg))", text: "hsl(var(--metal-text))" },
        water: { bar: "hsl(var(--water-bar))", bg: "hsl(var(--water-bg))", text: "hsl(var(--water-text))" },
        // 점수 막대 4칸 (사주 보완·수리·발음 오행·자원 오행 순)
        score: {
          1: "hsl(var(--score-1))",
          2: "hsl(var(--score-2))",
          3: "hsl(var(--score-3))",
          4: "hsl(var(--score-4))",
        },
        // shadcn/ui 시맨틱 토큰
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-pretendard)", "system-ui", "sans-serif"],
        // 이름과 한자. PDF 리포트만 나눔명조(--font-myeongjo)를 그대로 쓴다
        serif: ["var(--font-noto-serif)", "serif"],
      },
      fontSize: {
        // 가장 작은 글자는 13px
        xs: ["13px", { lineHeight: "18px" }],
      },
      boxShadow: {
        pebble: "0 24px 48px hsl(var(--sea) / 0.14)",
      },
    },
  },
  plugins: [animate],
};
export default config;
