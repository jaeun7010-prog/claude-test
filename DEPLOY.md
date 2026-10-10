# 이름핏 배포 체크리스트 (Vercel + Supabase + 포트원)

## 0. 한눈에 보기

| 단계 | 할 일 | 확인 |
|---|---|---|
| 1 | Supabase 스키마·시드 적용 | `hanja_dict` 8,486행, `hun` 약 7,335행 |
| 2 | 환경 변수 7개 준비 | `npm run check:env` 통과 |
| 3 | 로컬 전체 흐름 테스트 (포트원 **테스트 채널**) | 아래 4번 시나리오 |
| 4 | Vercel 프로젝트 생성·환경 변수 등록·배포 | 빌드 성공 |
| 5 | 운영 도메인 확정 후 Supabase/포트원에 도메인 등록 | 로그인·결제·웹훅 |
| 6 | 포트원 **실결제 채널**로 교체 후 소액 결제·환불 테스트 | 주문 `paid` → `refunded` |

## 1. Supabase

SQL Editor에서 순서대로 실행합니다 (모두 여러 번 실행해도 안전).

1. `supabase/schema.sql` 전체
   - 이번 버전에서 `orders_insert_own_pending` **정책이 제거**되고 `hanja_dict.hun` 컬럼이 추가됩니다.
   - 실행 후 확인: `select policyname, cmd from pg_policies where tablename = 'orders';` → `orders_select_own`(SELECT)만 남아야 합니다.
2. `supabase/seed/hanja_dict_01.sql` ~ `09.sql` → `select count(*) from hanja_dict;` = **8486**
3. `supabase/seed/hanja_hun_01.sql` ~ `05.sql` → `select count(*) from hanja_dict where hun is not null;` ≈ **7335**
4. 출생 통계(`name_stats`)는 원본이 저장소에 없습니다. 적재 전에는 희소성 화면이 비어 있는 것이 정상입니다 (`supabase/seed/README.md`).

Auth 설정 (Authentication → URL Configuration)

- **Site URL**: 운영 도메인 (예: `https://namefit.example.com`)
- **Redirect URLs**: `https://<운영 도메인>/auth/callback`, 로컬 테스트용 `http://localhost:3000/auth/callback`
- Preview 배포에서도 로그인을 쓰려면 `https://*-<팀>.vercel.app/auth/callback` 와일드카드를 추가합니다.
- 이메일 인증을 켜 두었다면 기본 SMTP는 발송 한도가 낮습니다. 운영에서는 자체 SMTP를 연결하세요.

## 2. 환경 변수

| 키 | 공개 | 용도 | 없으면 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | O | Supabase 주소 | 전체 동작 불가 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | O | anon 키 (RLS로 보호) | 전체 동작 불가 |
| `SUPABASE_SERVICE_ROLE_KEY` | **X** | **주문 생성**, 결제 반영 (RLS 우회) | 주문 생성 자체가 실패 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | O | 결제창 | 결제창 열리지 않음 |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | O | 결제 채널 | 결제창 열리지 않음 |
| `PORTONE_API_SECRET` | **X** | 서버의 결제 검증 | 결제 후 주문이 `paid`로 안 바뀜 |
| `PORTONE_WEBHOOK_SECRET` | **X** | 웹훅 서명 검증 | 웹훅이 500 반환 |
| `NEXT_PUBLIC_SITE_URL` (선택) | O | 가입 메일 링크의 기준 도메인 (origin 헤더가 없을 때) | 기본은 요청 origin 사용 |

- **`SUPABASE_SERVICE_ROLE_KEY`는 모든 RLS를 우회합니다.** `NEXT_PUBLIC_` 접두사 금지, 클라이언트 코드 import 금지(`lib/supabase/admin.ts`는 서버 전용), 저장소 커밋 금지.
- 이번 변경으로 **이 키가 없으면 주문을 만들 수 없습니다.** (기존엔 결제 반영 단계에서만 필요했습니다.)
- `NEXT_PUBLIC_*` 값은 **빌드 시점에 번들에 박힙니다.** Vercel에서 바꾸면 반드시 재배포하세요.
- 점검: `npm run check:env` (값은 출력하지 않고 설정 여부, 접두사 실수, anon/service 키 뒤바뀜만 확인).
  Vercel에 등록한 값은 `vercel env pull .env.vercel` 후 `node scripts/check-env.mjs .env.vercel`.
- 키가 노출된 적이 있다면(채팅, 스크린샷, 커밋) Supabase/포트원 콘솔에서 **재발급**하세요.

## 3. Vercel

1. GitHub 저장소를 Import → Framework `Next.js` 자동 감지, 빌드 명령/출력 폴더는 기본값.
2. Settings → Environment Variables에 위 키를 **Production / Preview / Development** 범위를 구분해 등록.
   - Preview 배포에는 **포트원 테스트 채널 키**, Production에는 실결제 채널 키를 넣는 구성을 권장합니다.
3. Settings → Functions → Region을 Supabase 프로젝트와 가까운 곳(서울 `icn1`)으로 설정합니다. 작명 엔진이 한자 사전을 여러 번 조회하므로 지연 차이가 큽니다.
4. 배포 후 `https://<도메인>/` 이 열리는지, Functions 로그에 에러가 없는지 확인합니다.
5. 도메인 연결(Settings → Domains) 후 1번의 Supabase Site URL/Redirect URL을 **최종 도메인**으로 갱신합니다.

## 4. 포트원

- 콘솔 → 결제연동에서 **테스트 채널**로 먼저 검증합니다. 채널 키는 환경(테스트/실결제)별로 다릅니다.
- 콘솔 → 웹훅 관리: URL `https://<운영 도메인>/api/portone/webhook`, 발급된 시크릿을 `PORTONE_WEBHOOK_SECRET`에 등록.
  - 웹훅 서명 검증에 실패하면 400, 설정 누락은 500(재전송), 우리 주문이 아닌 결제는 200으로 무시합니다.
- API Secret은 **V2 API Secret**입니다 (`PORTONE_API_SECRET`).
- 실결제 전환 시: 실결제 채널의 PG 계약/심사 완료 여부, 결제 금액이 `lib/commerce/catalog.ts`의 가격과 일치하는지 확인합니다.

## 5. 배포 전 통합 테스트 시나리오

로컬(`npm run dev`) 또는 Preview 배포에서 **포트원 테스트 채널**로 진행합니다.

1. **회원가입** → 인증 메일 링크 → `/auth/callback` → 로그인 상태
2. **작명**: `/naming` 입력 → `/naming/result` 추천 표시
   - 성씨 드롭다운에 `金 (쇠 김, 8획)`처럼 훈음이 보이는지, 결과 카드에 `賢 어질 현`처럼 보이는지
3. **저장**: 결과의 저장 버튼 → `/mypage` 이력에 표시
4. **결제 (리포트)**: 결과 화면에서 리포트 구매 → 결제창 → `/orders/complete` 에서 "결제가 완료되었습니다"
   - Supabase `orders`: `status = paid`, `payment_id`, `paid_at` 채워짐
5. **PDF**: `/report/<orderId>` 에서 한자·한글 폰트가 깨지지 않는지, PDF 다운로드가 열리는지, 3쪽 분량인지
6. **결제 (굿즈)**: `/goods` 주문 → 배송지 검증 → 결제 → 마이페이지 주문 내역
7. **예외 처리**
   - 결제창을 닫음 → 주문은 `pending`으로 남고 `paid`가 되지 않음
   - 다른 계정으로 로그인해 타인의 `/report/<orderId>` 접근 → 열리지 않음
   - 미결제(`pending`) 주문의 리포트 접근 → "결제가 아직 확인되지 않았습니다"
   - 웹훅: 결제 후 `/orders/complete` 를 거치지 않고 창을 닫아도 웹훅으로 `paid` 처리되는지
8. **보안 확인**: 로그인한 브라우저 콘솔에서 `orders` 에 직접 insert 시도 → RLS 로 **거부**되어야 합니다.

## 6. 운영 전 남은 확인 사항

- [ ] 이용약관, 개인정보처리방침, 환불 규정 페이지 (전자상거래법상 필수) — 현재 코드에 없음
- [ ] 사업자 정보 푸터 표기 (상호, 대표자, 사업자등록번호, 통신판매업 신고번호)
- [ ] 굿즈 배송/제작 프로세스와 관리자 화면 (현재 `orders` 상태 변경은 Supabase 콘솔에서 수동)
- [ ] 포트원 환불 후 `refunded` 반영 확인 (웹훅 `Transaction.Cancelled`)
- [ ] `name_stats` 통계 데이터 적재, 도메인/OG 이미지 등 메타데이터
- [ ] 에러 모니터링 (Vercel Logs 또는 Sentry)
- [ ] `hanja_hun` 출처(libhangul, BSD-3-Clause) 고지 — 오픈소스 라이선스 표기 페이지 또는 `supabase/seed/README.md`
