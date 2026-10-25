/**
 * 이름 카드 점검: npx tsx --env-file=.env.local scripts/share-check.ts [--db]
 *  - 카드 내용 만들기(buildShareContent): 한자·순우리말·부모 성 함께 쓰기·문장 없는 이름, 받지 않아야 하는 입력
 *  - 카드 내용에 생년월일·시각·출생지·성별·사주 칸이 없는지
 *  - --db: name_shares에 실제로 넣어 같은 내용이면 같은 id인지, 축원이 다르면 다른 id인지 (service_role 필요)
 */
import { createClient } from "@supabase/supabase-js";

import { buildShareContent, createNameShare, loadNameShare, type ShareInput } from "@/lib/share/name-share";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

const H = (surname: string, surnameHanja: string, given: string, givenHanja: string, prefixLength = 0, blessingIndex = 0): ShareInput =>
  ({ kind: "hanja", surname, surnameHanja, given, givenHanja, prefixLength, blessingIndex });
const N = (surname: string, given: string, prefixLength = 0, blessingIndex = 0): ShareInput =>
  ({ kind: "native", surname, given, prefixLength, blessingIndex });

const OK: [string, ShareInput][] = [
  ["한자 두 글자", H("김", "金", "하린", "霞潾")],
  ["한자 문장 없음(훈음)", H("김", "金", "도윤", "度允")],
  ["외자", H("이", "李", "윤", "潤")],
  ["부모 성 함께 쓰기", H("김", "金", "박서윤", "朴瑞允", 1)],
  ["복성 + 부모 성 복성", H("이", "李", "남궁서윤", "南宮瑞允", 2)],
  ["순우리말", N("김", "보미", 0, 1)],
  ["순우리말 짧은 뜻", N("박", "초아")],
  ["순우리말 부모 성", N("김", "박하늘", 1, 3)],
];
const BAD: [string, ShareInput][] = [
  ["읽기가 다른 한자", H("김", "金", "하린", "霞潤")],
  ["성씨 표에 없는 한자", H("김", "二", "하린", "霞潾")],
  ["한자 수가 다름", H("김", "金", "하린", "霞")],
  ["목록에 없는 순우리말", N("김", "바보")],
  ["부모 성이 아이 성과 같음", N("김", "김보미", 1)],
  ["축원 번호 밖", N("김", "보미", 0, 10)],
  ["이름 6자", N("김", "가나다라마바")],
];
const PRIVATE = /birth|date|time|place|gender|saju|yongsin|score|grade|lon|tz/i;

async function main() {
  let failed = 0;
  for (const [label, input] of OK) {
    const r = await buildShareContent(supabase, input);
    if (!r.ok) {
      failed++;
      console.log(`✗ ${label}: ${r.error}`);
      continue;
    }
    const leak = Object.keys(r.value).filter((k) => PRIVATE.test(k));
    if (leak.length) failed++;
    const v = r.value;
    console.log(`✓ ${label}: ${v.surnameHanja ?? ""}${v.givenHanja ?? ""} ${v.surname}${v.given}`);
    console.log(`    뜻: ${v.meaning}${v.meaningChars && v.meaningChars !== v.meaning ? `  [${v.meaningChars}]` : ""}`);
    if (v.meaningNote) console.log(`    원래 뜻: ${v.meaningNote}`);
    console.log(`    축원: ${v.blessing}${leak.length ? `  ✗ 개인정보 칸: ${leak.join(", ")}` : ""}`);
  }
  for (const [label, input] of BAD) {
    const r = await buildShareContent(supabase, input);
    if (r.ok) failed++;
    console.log(`${r.ok ? "✗ 받으면 안 됨" : "✓ 거절"} ${label}${r.ok ? "" : `: ${r.error}`}`);
  }

  if (process.argv.includes("--db")) {
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const a = await createNameShare(supabase, admin, OK[0][1]);
    const b = await createNameShare(supabase, admin, OK[0][1]);
    const c = await createNameShare(supabase, admin, { ...OK[0][1], blessingIndex: 2 });
    if (!a.ok || !b.ok || !c.ok) throw new Error("저장 실패");
    const same = a.value === b.value;
    const diff = a.value !== c.value;
    if (!same || !diff) failed++;
    console.log(`${same ? "✓" : "✗"} 같은 내용 같은 id (${a.value}) · ${diff ? "✓" : "✗"} 축원이 다르면 다른 id (${c.value})`);
    const loaded = await loadNameShare(admin, a.value);
    console.log(`  불러오기: ${loaded?.surname}${loaded?.given} / ${loaded?.blessing}`);
    // anon 키로는 목록을 볼 수 없어야 한다 (정책 없음)
    const anon = await supabase.from("name_shares").select("id").limit(1);
    const hidden = !anon.error && (anon.data ?? []).length === 0;
    if (!hidden) failed++;
    console.log(`${hidden ? "✓" : "✗"} anon 키로 name_shares 목록이 보이지 않음`);
  }

  console.log(failed ? `\n실패 ${failed}건` : "\n모두 통과");
  process.exitCode = failed ? 1 : 0;
}

main();
