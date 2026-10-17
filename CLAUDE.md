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
4. 희소성 통계: 연도별 출생 동명이인 수 및 성비 비율 시각화 (기준일 표기)
5. 프리미엄 리포트: 양가 어르신 제출용 고풍스러운 한문 PDF 다운로드
6. 결제 & 커머스: 포트원(Portone) 결제 연동 + 사주 맞춤 자수 굿즈(턱받이, 손수건) 주문

## 데이터 출처 및 갱신 정책
- 이름 통계 출처: 대법원 전자가족관계등록시스템 '상위 출생신고 이름 현황' (2008년~, 출생신고 기준)
- 인명용 한자 기준: 동일 시스템의 '인명용 한자 조회'
- efamily.scourt.go.kr은 robots.txt로 자동 접근을 막고 있으므로, 허가 전까지 자동 수집 코드를 작성하지 않는다.
- 현재 갱신 방식: 관리자 CSV 업로드 (lib/name-stats/sources/csv-upload.ts). 수집 방식은 NameStatsSource 인터페이스로 분리되어 있다.
- 표기: 모든 통계 화면에 <DataSourceNote />로 "기준일 + 출처"를 표시한다. "실시간" 표현은 쓰지 않는다.
- 대법원 이름 통계 원본은 정보공개청구로 받기 위해 진행 중이다. 받기 전까지 `name_stats`는 비어 있고, 희귀한 이름 우선순위와 희귀·인기 정렬은 화면에서 꺼진다(정상).
- 테스트용 가짜 통계: `data/samples/sample_ok.csv`(정상), `sample_error.csv`(오류 확인용). 업로드 시 출처명을 "테스트 데이터"로 넣고, 실제 데이터를 넣기 전에 그 출처명의 `data_snapshots`와 연결된 `name_stats`를 지운다.

## 작명 엔진 규칙 (lib/naming)

### 점수 구조
| 점수 | 계산 | 쓰는 곳 | 파일 |
|---|---|---|---|
| 성명학 점수 (100점) | 사주 보완 35 · 수리 30 · 발음오행 20 · 자원오행 15. 수리는 4격 길흉(격별 가중) + 수리오행 흐름 + 획수 음양 조화 | 등급 S/A/B/C(92/86/80점 이상), PDF 리포트, 마이페이지 저장 | `score.ts`, `analyze.ts` |
| 기본 순위 점수 (100점) | 성명학 × 0.7 + 한자 뜻(0~1) × 15 + 요즘 어감(0~1) × 15 | 추천 후보 선택, 이름 카드 기본 순서, 카드 대표 한자 선택 | `ranking.ts` |
| 맞춤 점수 (100점) | (기본 순위 점수 + 우선순위 가점) ÷ (100 + 최대 가점) × 100 | 결과 화면 정렬과 "내 기준 맞춤 N점" 표시만 | `priorities.ts` |

- 등급·PDF·저장에는 성명학 점수만 쓴다. 기본 순위 점수와 맞춤 점수는 숫자로 저장하지 않는다.
- 동점 정렬: 사주 보완 → 수리 → 발음오행 → 희소성(누적 건수가 적은 이름) → 가나다.
- 같은 한글 이름의 한자 조합(최대 5개)은 카드 하나로 묶는다. 서버는 후보 이름 60개를 넘기고 화면은 맞춤 점수 상위 30개를 보여 준다 (`service.ts`의 `CANDIDATE_LIMIT`/`DISPLAY_LIMIT`).

### 한자 뜻 등급 (`hanja-suitability.ts`)
| 등급 | 기준 | 처리 (글자 점수) |
|---|---|---|
| 제외 | 부정적·불분명한 뜻, 또는 사물·도구·무기·신체·지명/성씨 전용·어조사 뜻인 비교육용 글자 | 후보에서 뺀다 |
| 어색 | 위 사물 등의 뜻이지만 교육용인 글자 | 후보에 남기고 감점 (0) |
| 애매 | 교육용 아님 + 뜻이 긍정적이지 않음 | 감점 (0.2) |
| 보통 | 교육용, 또는 뜻은 긍정적이지만 비교육용 | 0.6 |
| 좋음 | 뜻이 긍정적인 교육용, 또는 허용 목록 | 1 |

- 영문 뜻풀이는 첫 번째 뜻만 본다 (뒤쪽 뜻까지 보면 江 "…; surname"처럼 좋은 글자가 걸린다).
- 한글 훈은 단어 단위로 비교한다. 못·신·창처럼 뜻이 여러 개인 한 글자 단어는 판정에 쓰지 않는다.
- 뜻풀이의 "Kangxi radical N"은 뜻이 아니므로 판정 전에 지운다 (`hanja-meaning.ts`).
- 사용자가 지정한 돌림자는 제외 등급이어도 후보에 남긴다.

### 허용 목록과 이름용 대표 풀이 (`name-hanja-allowlist.ts`)
- 자주 쓰는 이름 한자 목록. 한자 + 음 단위로 적고, 목록의 글자는 자동 판정과 상관없이 "좋음"이다. 불용한자는 목록과 상관없이 제외된다.
- `nameHun`(이름용 대표 풀이)이 있으면 화면과 PDF에서 사전 훈 대신 보여 준다 (예: 景 볕 경, 漢 은하수 한). `hanja_dict` 데이터는 바꾸지 않는다. 판정에는 사전 훈을 쓴다.
- `displayOnly: true` 항목은 풀이만 바꾸고 등급은 자동 판정을 따른다 (利: 등급까지 올리면 상위 추천이 利 이름으로 몰린다).
- 글자를 추가·삭제하거나 풀이를 바꿀 때는 사용자에게 표로 먼저 보여 주고 확인받는다.

### 우리 집 우선순위 (`priorities.ts`, `components/naming/`)
- 항목은 "희귀한 이름"과 "글로벌 발음 친화" 두 가지. 각각 보통 / 중요 / 매우 중요(가점 0 / 5 / 10, 기본값 보통). 모두 보통이면 맞춤 점수 = 기본 순위 점수.
  - 희귀한 이름: 2008년 이후 누적 출생신고 건수. 상위 목록 밖 = 매우 희귀(1) · 500건 미만 희귀(0.7) · 5,000건 미만 보통(0.3) · 그 이상 흔함(0). 구간은 실제 대법원 데이터를 넣은 뒤 다시 조정한다.
  - 글로벌 발음 친화: `global-pronunciation.ts` 점수, 50점 이하 0 → 100점 1. 화면 표현은 "국제 표준"이 아니라 "글로벌 발음 친화".
- "발음 흐름 중시"는 상위 후보의 발음오행이 거의 다 만점이라 순서가 바뀌지 않아 뺐다.
- 배지("매우 희귀"·"희귀"·"글로벌 발음 우수")는 사용자가 "중요" 이상으로 고른 항목만 보여 준다.
- 정렬: 맞춤 점수순(기본) / 희귀한 이름순 / 인기 이름순. 선택을 바꾸면 브라우저에서 바로 다시 정렬한다.
- 저장: 로그인 사용자는 `profiles.naming_priorities`(jsonb, `supabase/migrations/20261017000000_naming_priorities.sql`), 비로그인은 localStorage.
- 입력 폼의 "희소성" 선택은 없앴다. 예전 링크의 `rarity=rare/common`은 결과 화면 첫 정렬로 이어받는다.

## 남은 작업
- 사주 엔진 보강: 출생지 보정, 합·충·형, 격국 (현재는 억부·조후 중심의 단순화된 풀이)
- 순우리말 이름 탭: 아직 구현 없음. 한자 이름 / 순우리말 이름 탭을 나누고, 자원오행·한자 수리 대신 발음오행과 뜻 풀이 중심의 별도 점수로 평가한다. 이름 목록은 사용자에게 먼저 보여 주고 검토받는다.
- 어감 점수 개선 (`trend.ts`): "김린이"(다른 단어가 떠오름), "김린윤"(부르기 어색) 사례. 사용자가 이 작업을 꺼내기 전에는 trend.ts를 고치지 않는다.
- 입력 항목 추가: 서열, 형제 이름, 피할 글자
- 셀프 작명
- 띠·오행 색상

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