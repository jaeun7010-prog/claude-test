/**
 * 인명용 한자 시드 생성기.
 *
 *   npx tsx scripts/build-hanja-seed.ts <Unihan 압축 해제 폴더> <CJKRadicals.txt>
 *
 * 입력 (모두 Unicode Consortium 공개 데이터, Unicode License):
 *   - https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
 *   - https://www.unicode.org/Public/UCD/latest/ucd/CJKRadicals.txt
 *
 * 출력: supabase/seed/hanja_dict_NN.sql (idempotent: on conflict do nothing)
 *
 * 선정 기준: Unihan kHangul 출처 코드 N(인명용 한자) 또는 E(한문 교육용 기초 한자 1,800자)가
 *   하나라도 붙은 글자. 해당 글자의 모든 음(두음법칙 변형 포함)을 싣는다.
 * 획수: 강희자전 부수 획수 + 부수 외 획수 (성명학의 원획 기준; 氵=4, 艹=6 등).
 * 자원오행: 부수 기반의 보수적 추정. 판단 근거가 없으면 null.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [unihanDir, radicalsFile] = process.argv.slice(2);
if (!unihanDir || !radicalsFile) {
  console.error("usage: build-hanja-seed.ts <unihan-dir> <CJKRadicals.txt>");
  process.exit(1);
}

type Props = Map<string, Map<string, string>>; // codepoint -> property -> value
const props: Props = new Map();
for (const f of readdirSync(unihanDir).filter((n) => n.startsWith("Unihan_") && n.endsWith(".txt"))) {
  for (const line of readFileSync(join(unihanDir, f), "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [cp, prop, value] = line.split("\t");
    if (!value) continue;
    let m = props.get(cp);
    if (!m) props.set(cp, (m = new Map()));
    m.set(prop, value);
  }
}

// 부수 번호 → [부수 글자, 부수 획수]
const radicals = new Map<number, { ch: string; strokes: number }>();
for (const line of readFileSync(radicalsFile, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const [num, , unified] = line.split(";").map((s) => s.trim());
  const n = parseInt(num, 10); // "90'" 같은 간체 표기는 숫자만 취한다
  if (!unified || radicals.has(n)) continue;
  const cp = `U+${unified}`;
  const strokes = parseInt(props.get(cp)?.get("kTotalStrokes") ?? "", 10);
  if (strokes) radicals.set(n, { ch: String.fromCodePoint(parseInt(unified, 16)), strokes });
}
if (radicals.size !== 214) throw new Error(`부수 214개가 필요합니다: ${radicals.size}`);

/** 부수 번호 → 자원오행 (보수적 부수 기반 추정) */
const RADICAL_ELEMENT: Record<number, string> = {
  75: "목", 115: "목", 118: "목", 140: "목", 200: "목", // 木 禾 竹 艸 麻
  72: "화", 86: "화", 155: "화", // 日 火 赤
  32: "토", 46: "토", 98: "토", 102: "토", 170: "토", // 土 山 瓦 田 阜
  18: "금", 96: "금", 112: "금", 167: "금", // 刀 玉 石 金
  15: "수", 47: "수", 85: "수", 173: "수", 195: "수", // 冫 川 水 雨 魚
};

/** 불용한자: 뜻이 부정적이어서 이름에 쓰지 않는 글자 (필요 시 수정) */
const FORBIDDEN: Record<string, string> = {};
for (const ch of "死病亡喪凶惡殺怨哀泣貧賤孤寡苦災禍敗失離別逃罪罰刑毒盜賊奴婢妖鬼魔夭斷絶窮困忘")
  FORBIDDEN[ch] = "부정적 의미";

interface Row {
  hanja: string;
  eum: string;
  meaning: string | null;
  strokes: number;
  radical: string;
  element: string | null;
  forbidden: boolean;
  reason: string | null;
  /** 한문 교육용 기초 한자(1,800자) 여부 — 널리 알려진 글자 */
  edu: boolean;
}

const rows: Row[] = [];
let skippedNoStroke = 0;
let simplifiedRadical = 0;

for (const [cp, p] of props) {
  const hangul = p.get("kHangul");
  if (!hangul) continue;
  // 인명용(N)·교육용(E) 표시가 하나라도 있는 글자만 대상으로 하고, 그 글자의 모든 음을 싣는다.
  // (Unihan은 李 리:0E 이:0 처럼 두음법칙 변형 음에는 출처 코드를 붙이지 않는다)
  const tokens = hangul.split(" ").map((t) => {
    const [eum, src = ""] = t.split(":");
    return { eum, src };
  });
  if (!tokens.some((t) => /[NE]/.test(t.src))) continue;
  const edu = tokens.some((t) => t.src.includes("E"));
  const eums = new Set(tokens.filter((t) => t.src !== "X").map((t) => t.eum));
  if (eums.size === 0) continue;

  const rs = p.get("kRSUnicode")?.split(" ")[0];
  const m = rs?.match(/^(\d+)('*)\.(-?\d+)$/);
  const rad = m ? radicals.get(parseInt(m[1], 10)) : undefined;
  if (!m || !rad) {
    skippedNoStroke++;
    continue;
  }
  if (m[2]) simplifiedRadical++;
  const strokes = rad.strokes + parseInt(m[3], 10);

  const ch = String.fromCodePoint(parseInt(cp.slice(2), 16));
  const def = p.get("kDefinition")?.split(";").slice(0, 3).join(";").trim().slice(0, 80) ?? null;
  for (const eum of eums) {
    rows.push({
      hanja: ch,
      eum,
      meaning: def,
      strokes,
      radical: rad.ch,
      element: RADICAL_ELEMENT[parseInt(m[1], 10)] ?? null,
      forbidden: ch in FORBIDDEN,
      reason: FORBIDDEN[ch] ?? null,
      edu,
    });
  }
}

rows.sort((a, b) => a.eum.localeCompare(b.eum, "ko") || a.hanja.localeCompare(b.hanja));

const q = (s: string | null) => (s === null ? "null" : `'${s.replace(/'/g, "''")}'`);
const outDir = join(process.cwd(), "supabase", "seed");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir).filter((n) => /^hanja_dict_\d+\.sql$/.test(n)))
  rmSync(join(outDir, f));

const CHUNK = 1000;
const files: string[] = [];
for (let i = 0; i < rows.length; i += CHUNK) {
  const part = rows.slice(i, i + CHUNK);
  const name = `hanja_dict_${String(i / CHUNK + 1).padStart(2, "0")}.sql`;
  const values = part
    .map(
      (r) =>
        `(${q(r.hanja)},${q(r.eum)},${q(r.meaning)},${r.strokes},${q(r.radical)},${q(r.element)},${r.forbidden},${q(r.reason)},${r.edu})`
    )
    .join(",\n");
  writeFileSync(
    join(outDir, name),
    `-- 인명용 한자 시드 (${name}) — scripts/build-hanja-seed.ts 로 생성됨. 직접 수정하지 마세요.\n` +
      `insert into public.hanja_dict\n  (hanja, eum, meaning, stroke_count, radical, element, is_forbidden, forbidden_reason, is_edu)\n` +
      `values\n${values}\non conflict (hanja, eum) do nothing;\n`
  );
  files.push(name);
}

const withElement = rows.filter((r) => r.element).length;
console.log(
  JSON.stringify(
    {
      rows: rows.length,
      distinctHanja: new Set(rows.map((r) => r.hanja)).size,
      withElement,
      forbidden: rows.filter((r) => r.forbidden).length,
      edu: new Set(rows.filter((r) => r.edu).map((r) => r.hanja)).size,
      skippedNoStroke,
      simplifiedRadical,
      files: files.length,
    },
    null,
    1
  )
);
