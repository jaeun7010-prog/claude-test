/**
 * 한자 한글 훈(예: 金 → 쇠)을 hanja_dict 에 채우는 시드 SQL 생성기.
 *
 * 입력: libhangul 의 hanja.txt (BSD-3-Clause, https://github.com/libhangul/libhangul)
 *   형식: `음:한자:훈 음, 훈 음`  예) `금:金:성 금, 쇠 금`
 * 출력: supabase/seed/hanja_hun_NN.sql (hanja_dict 에 이미 있는 (한자, 음) 행만 갱신)
 *
 * 사용법: npx tsx scripts/build-hanja-hun.ts <hanja.txt 경로>
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SEED_DIR = join(process.cwd(), "supabase", "seed");
const CHUNK = 1500;

const src = process.argv[2];
if (!src) {
  console.error("사용법: npx tsx scripts/build-hanja-hun.ts <hanja.txt 경로>");
  process.exit(1);
}

/** '성 금' 처럼 성씨 표기용 훈: 일반 훈이 따로 있으면 그쪽을 대표 훈으로 쓴다 */
const isSurnameNote = (hun: string) => /^(사람의 )?성(씨)?$/.test(hun) || hun.startsWith("성 ");

// 1) 사전에서 (한자, 음) → 훈 목록
const byPair = new Map<string, string[]>();
const byHanja = new Map<string, string[]>();
for (const line of readFileSync(src, "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const parts = line.split(":");
  if (parts.length < 3) continue;
  const [eum, hanja, defs] = parts;
  if ([...hanja].length !== 1 || !defs) continue;

  const huns: string[] = [];
  for (const def of defs.split(",")) {
    const t = def.trim();
    // "쇠 금" → 훈 "쇠" (끝의 음 제거)
    const m = t.match(/^(.+)\s+([가-힣])$/);
    if (m && m[2] === eum && m[1].trim()) huns.push(m[1].trim());
  }
  if (huns.length === 0) continue;
  byPair.set(`${hanja}\t${eum}`, [...(byPair.get(`${hanja}\t${eum}`) ?? []), ...huns]);
  byHanja.set(hanja, [...(byHanja.get(hanja) ?? []), ...huns]);
}

const primary = (huns: string[] | undefined): string | null => {
  if (!huns || huns.length === 0) return null;
  return huns.find((h) => !isSurnameNote(h)) ?? huns[0];
};

// 2) hanja_dict 시드에 있는 (한자, 음) 행
const rows: { hanja: string; eum: string }[] = [];
for (const f of readdirSync(SEED_DIR).filter((n) => /^hanja_dict_\d+\.sql$/.test(n)).sort()) {
  for (const line of readFileSync(join(SEED_DIR, f), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\('(.+?)','([가-힣]+)',/u);
    if (m) rows.push({ hanja: m[1], eum: m[2] });
  }
}
if (rows.length === 0) {
  console.error("supabase/seed/hanja_dict_*.sql 에서 행을 찾지 못했습니다.");
  process.exit(1);
}

// 3) 같은 (한자, 음)에 훈이 없으면 같은 한자의 다른 음 훈을 빌려 온다 (훈은 음과 무관한 글자 뜻)
let exact = 0;
let borrowed = 0;
const out: { hanja: string; eum: string; hun: string }[] = [];
for (const r of rows) {
  let hun = primary(byPair.get(`${r.hanja}\t${r.eum}`));
  if (hun) exact++;
  else {
    hun = primary(byHanja.get(r.hanja));
    if (hun) borrowed++;
  }
  if (hun) out.push({ ...r, hun });
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
mkdirSync(SEED_DIR, { recursive: true });
let files = 0;
for (let i = 0; i < out.length; i += CHUNK) {
  const part = out.slice(i, i + CHUNK);
  const n = String(++files).padStart(2, "0");
  const sql =
    `-- 한자 훈 시드 (hanja_hun_${n}.sql) — scripts/build-hanja-hun.ts 로 생성됨. 직접 수정하지 마세요.\n` +
    `-- 출처: libhangul hanja.txt (BSD-3-Clause, Copyright (c) 2005,2006 Choe Hwanjin)\n` +
    `update public.hanja_dict as h set hun = v.hun\n` +
    `from (values\n` +
    part.map((r) => `(${q(r.hanja)},${q(r.eum)},${q(r.hun)})`).join(",\n") +
    `\n) as v(hanja, eum, hun)\nwhere h.hanja = v.hanja and h.eum = v.eum;\n`;
  writeFileSync(join(SEED_DIR, `hanja_hun_${n}.sql`), sql, "utf8");
}

console.log(
  JSON.stringify(
    {
      dictRows: rows.length,
      withHun: out.length,
      exactMatch: exact,
      borrowedFromOtherEum: borrowed,
      missing: rows.length - out.length,
      files,
    },
    null,
    2
  )
);
