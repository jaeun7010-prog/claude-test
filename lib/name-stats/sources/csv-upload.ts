import { validateAsOfDate, validateRow } from "../validate";
import type { Gender, NameStatsRow, NameStatsSource, SourceError } from "./types";

const COLUMNS = ["name", "year", "gender", "count"] as const;
type Column = (typeof COLUMNS)[number];

const HEADER_ALIAS: Record<string, Column> = {
  name: "name",
  이름: "name",
  year: "year",
  연도: "year",
  gender: "gender",
  성별: "gender",
  count: "count",
  건수: "count",
};

const GENDER_ALIAS: Record<string, Gender> = {
  male: "male",
  m: "male",
  남: "male",
  남자: "male",
  남아: "male",
  female: "female",
  f: "female",
  여: "female",
  여자: "female",
  여아: "female",
};

const cells = (line: string) => line.split(",").map((v) => v.trim().replace(/^"(.*)"$/, "$1").trim());

/**
 * CSV 텍스트 → 행 목록. 형식 (UTF-8, 헤더 필수):
 *   name,year,gender,count
 *   서윤,2023,여,1234
 * 빈 줄과 # 으로 시작하는 줄은 건너뛴다. 오류가 있어도 끝까지 읽어 전체 오류 목록을 돌려준다.
 */
export function parseNameStatsCsv(
  csv: string,
  maxYear: number
): { rows: NameStatsRow[]; errors: SourceError[] } {
  const rows: NameStatsRow[] = [];
  const errors: SourceError[] = [];
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/);

  let index: Record<Column, number> | null = null;
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const c = cells(line);

    if (!index) {
      const header = c.map((h) => HEADER_ALIAS[h.toLowerCase()]);
      const ok =
        c.length === COLUMNS.length && COLUMNS.every((col) => header.filter((h) => h === col).length === 1);
      if (!ok) {
        errors.push({ line: lineNo, message: "헤더는 name,year,gender,count 네 칸이어야 합니다." });
        return { rows, errors };
      }
      index = Object.fromEntries(COLUMNS.map((col) => [col, header.indexOf(col)])) as Record<Column, number>;
      continue;
    }

    if (c.length !== COLUMNS.length) {
      errors.push({ line: lineNo, message: `칸 수 오류 (${c.length}칸, 4칸이어야 함)` });
      continue;
    }
    const gender = GENDER_ALIAS[c[index.gender].toLowerCase()];
    if (!gender) {
      errors.push({ line: lineNo, message: `성별 오류 '${c[index.gender]}' (남/여)` });
      continue;
    }
    if (!/^\d+$/.test(c[index.year]) || !/^\d+$/.test(c[index.count])) {
      errors.push({ line: lineNo, message: "연도와 건수는 숫자만 입력해 주세요 (쉼표·단위 없이)." });
      continue;
    }
    const row: NameStatsRow = {
      name: c[index.name],
      year: Number(c[index.year]),
      gender,
      count: Number(c[index.count]),
    };
    const invalid = validateRow(row, maxYear);
    if (invalid) {
      errors.push({ line: lineNo, message: invalid });
      continue;
    }
    const key = `${row.name}|${row.year}|${row.gender}`;
    if (seen.has(key)) {
      errors.push({ line: lineNo, message: `중복 (${row.name}, ${row.year}, ${c[index.gender]})` });
      continue;
    }
    seen.add(key);
    rows.push(row);
  }

  if (!index) errors.push({ message: "CSV가 비어 있습니다." });
  else if (rows.length === 0 && errors.length === 0) errors.push({ message: "데이터 행이 없습니다." });
  return { rows, errors };
}

/** 관리자가 올린 CSV를 읽는 수집 구현체. 외부 사이트에는 접근하지 않는다 */
export function createCsvUploadSource(input: {
  csv: string;
  asOfDate: string;
  sourceName: string;
}): NameStatsSource {
  return {
    id: "csv-upload",
    async load() {
      const dateError = validateAsOfDate(input.asOfDate);
      if (dateError) return { ok: false, errors: [{ message: dateError }] };
      if (!input.sourceName.trim()) return { ok: false, errors: [{ message: "출처명을 입력해 주세요." }] };

      const { rows, errors } = parseNameStatsCsv(input.csv, Number(input.asOfDate.slice(0, 4)));
      if (errors.length > 0) return { ok: false, errors };
      return {
        ok: true,
        batch: { asOfDate: input.asOfDate, sourceName: input.sourceName.trim(), rows },
      };
    },
  };
}
