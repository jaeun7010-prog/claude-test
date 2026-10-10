/**
 * 이름 통계 CSV → name_stats 적재용 SQL 생성기.
 *
 *   npx tsx scripts/import-name-stats.ts <입력.csv>
 *
 * CSV 형식 (UTF-8, 헤더 필수. 이름은 성을 제외한 한글 이름):
 *   name,year,male_count,female_count
 *   서윤,2023,0,1234
 * total_count 는 male_count + female_count 로 계산됩니다.
 * (헤더에 total 컬럼이 있어도 무시하지 않고, male+female 과 다르면 오류로 중단합니다.)
 *
 * 출력: supabase/seed/name_stats_NN.sql (upsert). SQL Editor에서 순서대로 실행하세요.
 * 통계 원본은 대법원 전자가족관계등록시스템(https://efamily.scourt.go.kr) 등 정당한 경로로
 * 확보한 데이터를 사용하세요. 이 저장소에는 통계 원본이 포함되어 있지 않습니다.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("usage: import-name-stats.ts <input.csv>");
  process.exit(1);
}

const text = readFileSync(input, "utf8").replace(/^﻿/, "");
const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
const col = (n: string) => header.indexOf(n);
const iName = col("name");
const iYear = col("year");
const iMale = col("male_count");
const iFemale = col("female_count");
const iTotal = col("total_count");
if ([iName, iYear, iMale, iFemale].includes(-1)) {
  console.error("헤더에 name,year,male_count,female_count 컬럼이 필요합니다.");
  process.exit(1);
}

interface Row {
  name: string;
  year: number;
  male: number;
  female: number;
}
const merged = new Map<string, Row>();
const errors: string[] = [];

lines.slice(1).forEach((line, i) => {
  const c = line.split(",").map((v) => v.trim());
  const lineNo = i + 2;
  const name = c[iName];
  const year = Number(c[iYear]);
  const male = Number(c[iMale]);
  const female = Number(c[iFemale]);
  if (!/^[가-힣]{1,4}$/.test(name)) return void errors.push(`${lineNo}행: 이름 형식 오류 '${name}'`);
  if (!Number.isInteger(year) || year < 1900 || year > 2100)
    return void errors.push(`${lineNo}행: 연도 오류 '${c[iYear]}'`);
  if (![male, female].every((n) => Number.isInteger(n) && n >= 0))
    return void errors.push(`${lineNo}행: 인원수 오류`);
  if (iTotal !== -1 && Number(c[iTotal]) !== male + female)
    return void errors.push(`${lineNo}행: total_count 가 남+여와 다릅니다`);
  const key = `${name}|${year}`;
  if (merged.has(key)) return void errors.push(`${lineNo}행: 중복 (${name}, ${year})`);
  merged.set(key, { name, year, male, female });
});

if (errors.length) {
  console.error(errors.slice(0, 20).join("\n"));
  console.error(`... 총 ${errors.length}건의 오류로 중단합니다.`);
  process.exit(1);
}

const rows = [...merged.values()].sort((a, b) => a.year - b.year || a.name.localeCompare(b.name, "ko"));
const outDir = join(process.cwd(), "supabase", "seed");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir).filter((n) => /^name_stats_\d+\.sql$/.test(n)))
  rmSync(join(outDir, f));

const CHUNK = 2000;
let files = 0;
for (let i = 0; i < rows.length; i += CHUNK) {
  const part = rows.slice(i, i + CHUNK);
  const name = `name_stats_${String(i / CHUNK + 1).padStart(2, "0")}.sql`;
  const values = part
    .map((r) => `('${r.name}',${r.year},${r.male + r.female},${r.male},${r.female})`)
    .join(",\n");
  writeFileSync(
    join(outDir, name),
    `-- 이름 통계 (${name}) — scripts/import-name-stats.ts 로 생성됨\n` +
      `insert into public.name_stats (name, year, total_count, male_count, female_count)\nvalues\n${values}\n` +
      `on conflict (name, year) do update set\n  total_count = excluded.total_count,\n` +
      `  male_count = excluded.male_count,\n  female_count = excluded.female_count;\n`
  );
  files++;
}
console.log(JSON.stringify({ rows: rows.length, files, years: [...new Set(rows.map((r) => r.year))].sort() }));
