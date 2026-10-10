/**
 * 환경 변수 점검 (값은 출력하지 않고 설정 여부와 형식만 확인합니다).
 *
 * 사용법: npm run check:env            (.env.local 을 읽음)
 *         node scripts/check-env.mjs .env.production   (다른 파일 지정)
 * Vercel 에 등록한 값은 `vercel env pull .env.vercel` 로 받은 뒤 같은 방식으로 점검할 수 있습니다.
 */
import { existsSync, readFileSync } from "node:fs";

const file = process.argv[2] ?? ".env.local";
if (!existsSync(file)) {
  console.error(`✗ ${file} 파일이 없습니다. .env.local.example 을 복사해 값을 채워 주세요.`);
  process.exit(1);
}

const env = {};
for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line
    .slice(i + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const REQUIRED = [
  ["NEXT_PUBLIC_SUPABASE_URL", "public", "Supabase 프로젝트 URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "public", "Supabase anon(publishable) 키"],
  ["SUPABASE_SERVICE_ROLE_KEY", "secret", "주문 생성/결제 반영 (RLS 우회, 서버 전용)"],
  ["NEXT_PUBLIC_PORTONE_STORE_ID", "public", "포트원 스토어 ID"],
  ["NEXT_PUBLIC_PORTONE_CHANNEL_KEY", "public", "포트원 채널 키"],
  ["PORTONE_API_SECRET", "secret", "결제 검증용 V2 API Secret (서버 전용)"],
  ["PORTONE_WEBHOOK_SECRET", "secret", "웹훅 서명 검증 시크릿 (서버 전용)"],
];

let problems = 0;
const bad = (msg) => {
  problems++;
  console.log(`  ✗ ${msg}`);
};

console.log(`환경 변수 점검: ${file}\n`);
for (const [key, scope, desc] of REQUIRED) {
  const v = env[key];
  console.log(`${v ? "✓" : "✗"} ${key.padEnd(34)} ${v ? "설정됨" : "비어 있음"}  — ${desc}`);
  if (!v) problems++;
}

// JWT 형식 키의 role 클레임만 확인 (서명/값은 출력하지 않음)
const roleOf = (jwt) => {
  try {
    const payload = jwt.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role;
  } catch {
    return null;
  }
};

console.log("\n형식 점검");
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))
  bad("NEXT_PUBLIC_SUPABASE_URL 이 https://<project>.supabase.co 형식이 아닙니다.");

const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
if (anon && service && anon === service)
  bad("SUPABASE_SERVICE_ROLE_KEY 가 anon 키와 같습니다. service_role 키를 넣어 주세요.");
if (anon?.split(".").length === 3 && roleOf(anon) === "service_role")
  bad("NEXT_PUBLIC_SUPABASE_ANON_KEY 에 service_role 키가 들어 있습니다. 브라우저에 노출되므로 즉시 교체하세요.");
if (service?.split(".").length === 3 && roleOf(service) === "anon")
  bad("SUPABASE_SERVICE_ROLE_KEY 에 anon 키가 들어 있습니다.");

for (const [key] of REQUIRED.filter(([, s]) => s === "secret")) {
  if (`NEXT_PUBLIC_${key}` in env) bad(`NEXT_PUBLIC_${key} 가 정의되어 있습니다. 서버 전용 값은 NEXT_PUBLIC 접두사를 붙이지 마세요.`);
}
for (const key of Object.keys(env)) {
  if (key.startsWith("NEXT_PUBLIC_") && /SECRET|SERVICE_ROLE/.test(key))
    bad(`${key}: NEXT_PUBLIC_ 변수는 브라우저에 공개됩니다. 시크릿이면 접두사를 제거하세요.`);
}

console.log(problems === 0 ? "  ✓ 문제 없음" : `\n문제 ${problems}건을 확인해 주세요.`);
process.exit(problems === 0 ? 0 : 1);
