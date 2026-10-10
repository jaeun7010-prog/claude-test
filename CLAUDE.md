# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고할 안내서입니다.

# 프로젝트: 이름핏 (NameFit) - 사주 맞춤 작명 & 희소성 통계 플랫폼

## Tech Stack
- Framework: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Database & Auth: Supabase (PostgreSQL, Supabase Auth)
- Payment: Portone (포트원 / 구 아임포트)
- PDF Generation: react-pdf / html2pdf.js

## Key Features & Differentiation
1. 회원가입/로그인: Supabase Auth 기반 유저 인증 및 작명 결과 마이페이지 지속 저장
2. 정통 성명학 엔진: 자원오행, 발음오행, 수리 81수(원/형/이/정 4격), 불용한자 필터링
3. 차별화 필터: 돌림자, 외자, 젠더 뉴트럴(중성적 이름), 순우리말, 글로벌(영어) 발음 호환 점수
4. 실시간 희소성 통계: 연도별 출생 동명이인 수 및 성비 비율 시각화
5. 프리미엄 리포트: 양가 어르신 제출용 고풍스러운 한문 PDF 다운로드
6. 결제 & 커머스: 포트원(Portone) 결제 연동 + 사주 맞춤 자수 굿즈(턱받이, 손수건) 주문

## 테마 컬러
`app/globals.css`의 `:root`에 HSL 토큰으로 정의되어 있고, `tailwind.config.ts`에서 `ivory`/`navy`/`sand` 및 shadcn 시맨틱 토큰으로 노출됩니다. 컬러 값을 직접 쓰지 말고 토큰을 사용하세요.

| 이름 | HEX | 토큰 | 용도 |
|---|---|---|---|
| Warm Ivory | `#fdfbf7` | `--ivory` | background, card, popover, primary-foreground |
| Deep Navy | `#2d3a52` | `--navy` | foreground, primary, ring |
| Sand Beige | `#f4eae1` | `--sand` | secondary, muted, accent |

## 폰트
`app/layout.tsx`에서 불러와 CSS 변수로 노출합니다.
- **Pretendard** (`--font-pretendard`, Tailwind `font-sans`): 본문 기본 폰트. `app/fonts/PretendardVariable.woff2`를 `next/font/local`로 로드합니다.
- **나눔명조** (`--font-myeongjo`, Tailwind `font-serif`): 제목, 한문, 프리미엄 리포트 등 고풍스러운 영역에 사용합니다. `next/font/google`의 `Nanum_Myeongjo`로 로드합니다.

## 프로젝트 구조
- `lib/supabase/client.ts`(브라우저), `server.ts`(서버 컴포넌트/액션), `middleware.ts`(세션 갱신), 루트 `middleware.ts`
- `lib/portone.ts`: 포트원 결제 요청 래퍼 (클라이언트 전용)
- `components/ui/`: shadcn/ui 컴포넌트 (Tailwind v3 기준, `npx shadcn@latest add <name>`으로 추가)
- 환경 변수는 `.env.local.example`을 참고합니다. 결제 검증용 `PORTONE_API_SECRET`은 서버 전용입니다.