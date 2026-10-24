/**
 * 성씨 한자 표 만들기: npx tsx --env-file=.env.local scripts/build-surname-table.ts
 * 통계청 2015 인구주택총조사 성씨·본관별 인구(data/surnames/*.csv, KOSIS)에서 성씨 합계 행만 읽어
 * lib/naming/surname-table.ts를 만든다. 사전(hanja_dict)에서 획수를 읽고, 사전에 없는 글자는 빼고 보고한다.
 *
 * - 같은 소리·한자가 두 번 나오면 합친다 (호환 한자 李 U+F9E1 등은 NFC로 표준 글자에 합침)
 * - 두음법칙: 첫소리만 다른 소리(류·유, 림·임, 라·나, 리·이, 로·노 …)는 한 묶음(surnameKey)으로 보고, 한자마다 인구를 더한다
 * - "제갈(諸*)"은 자료에서 葛이 깨진 것이라 諸葛으로 읽는다. "기타(기타)"는 뺀다
 * 출력하는 확인 표: 성씨 수, 상위 10, 사전에 없는 글자, 이체자 쌍, 자원오행 표에 없는 상위 한자, 소리별 바로 보이는 한자
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { surnameKey, SURNAME_VISIBLE_SHARE } from "@/lib/naming/surname-hanja";
import { COMPOUND_SURNAMES, SURNAME_ELEMENTS } from "@/lib/naming/surnames";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const DIR = "data/surnames";
const OUT = "lib/naming/surname-table.ts";
const FIX: Record<string, string> = { "諸*": "諸葛" };

const file = readdirSync(DIR).find((f) => f.endsWith(".csv"));
if (!file) throw new Error(`${DIR}에 CSV가 없습니다`);
const lines = readFileSync(join(DIR, file), "utf8").replace(/^﻿/, "").split(/\r?\n/);

// 1. 성씨 합계 행: "이(李)",7306828 (본관 행은 괄호가 없다)
const raw = new Map<string, number>(); // "소리|한자" → 인구
let total = 0;
let rows = 0;
for (const line of lines) {
  const m = line.match(/^"([가-힣]{1,2})\((.+)\)",(\d+)$/);
  if (!m) continue;
  rows++;
  const sound = m[1];
  const hanja = (FIX[m[2]] ?? m[2]).normalize("NFC");
  const n = Number(m[3]);
  total += n;
  if (!/^\p{Script=Han}+$/u.test(hanja) || [...hanja].length !== sound.length) {
    console.log(`읽지 않은 행: ${line}`);
    continue;
  }
  raw.set(`${sound}|${hanja}`, (raw.get(`${sound}|${hanja}`) ?? 0) + n);
}
const national = Number(lines.find((l) => l.startsWith('"전국"'))?.split(",")[1] ?? 0);

(async () => {
  // 2. 사전에서 획수·읽기
  const chars = [...new Set([...raw.keys()].flatMap((k) => [...k.split("|")[1]]))];
  const dict = new Map<string, { eum: string; strokes: number }[]>();
  for (let i = 0; i < chars.length; i += 200) {
    const { data, error } = await supabase.from("hanja_dict").select("hanja, eum, stroke_count").in("hanja", chars.slice(i, i + 200));
    if (error) throw error;
    for (const r of data ?? []) dict.set(r.hanja, [...(dict.get(r.hanja) ?? []), { eum: r.eum, strokes: r.stroke_count }]);
  }

  // 3. 두음법칙 묶음으로 합치기. 사전에 없는 글자, 사전에 그 묶음의 읽기가 없는 글자는 뺀다
  type Entry = { hanja: string; population: number; strokes: number[]; sounds: Set<string> };
  const groups = new Map<string, Map<string, Entry>>();
  const missing: [string, string, number][] = [];
  const noReading: [string, string, number, string][] = [];
  for (const [k, n] of raw) {
    const [sound, hanja] = k.split("|");
    const key = surnameKey(sound);
    const cs = [...hanja];
    if (cs.some((c) => !dict.has(c))) {
      missing.push([sound, hanja, n]);
      continue;
    }
    if (cs.some((c, i) => !dict.get(c)!.some((r) => surnameKey(r.eum) === surnameKey([...sound][i])))) {
      noReading.push([sound, hanja, n, cs.map((c) => dict.get(c)!.map((r) => r.eum).join("·")).join(" / ")]);
      continue;
    }
    const g = groups.get(key) ?? new Map<string, Entry>();
    const e = g.get(hanja) ?? { hanja, population: 0, strokes: cs.map((c) => dict.get(c)![0].strokes), sounds: new Set() };
    e.population += n;
    e.sounds.add(sound);
    g.set(hanja, e);
    groups.set(key, g);
  }

  const sorted = [...groups].map(([key, g]) => {
    const list = [...g.values()].sort((a, b) => b.population - a.population || a.hanja.localeCompare(b.hanja));
    return { key, list, sum: list.reduce((s, e) => s + e.population, 0) };
  });
  sorted.sort((a, b) => b.sum - a.sum);

  // 4. 파일 쓰기
  const body = sorted
    .map(({ key, list }) => `  "${key}": [${list.map((e) => `["${e.hanja}", ${e.population}, [${e.strokes.join(", ")}]]`).join(", ")}],`)
    .join("\n");
  writeFileSync(
    OUT,
    `/**
 * 성씨 한자 표 (자동 생성: scripts/build-surname-table.ts, 직접 고치지 않는다).
 * 출처: 통계청, 2015 인구주택총조사 성씨·본관별 인구 (5인 이상, 전국). data/surnames/README.md
 * 소리 묶음(두음법칙, surnameKey) → [한자, 인구, 글자별 획수] 인구 많은 순. 두음법칙 두 소리의 인구는 더했다 (예: 柳 = 유 + 류)
 */
export const SURNAME_TABLE: Record<string, readonly (readonly [string, number, readonly number[]])[]> = {
${body}
};
`
  );

  // 5. 확인 표
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  console.log(`\n## 1. 읽은 성씨: 합계 행 ${rows}개 (성씨 한자 ${raw.size}개), 인구 합 ${fmt(total)} / 전국 ${fmt(national)}`);
  console.log(`표에 넣은 소리 묶음 ${sorted.length}개, 한자 ${sorted.reduce((s, g) => s + g.list.length, 0)}개`);
  const flat = sorted.flatMap((g) => g.list.map((e) => ({ ...e, key: g.key })));
  flat.sort((a, b) => b.population - a.population);
  console.log("상위 10:", flat.slice(0, 10).map((e) => `${[...e.sounds].join("·")}(${e.hanja}) ${fmt(e.population)}`).join(" · "));

  console.log(`\n## 2. 사전에 없는 글자 ${missing.length}개 (뺌)`);
  console.log(missing.sort((a, b) => b[2] - a[2]).map(([s, h, n]) => `${s}(${h}) ${fmt(n)}`).join(" · "));
  console.log(`사전에 그 소리 읽기가 없는 글자 ${noReading.length}개 (뺌)`);
  console.log(noReading.sort((a, b) => b[2] - a[2]).map(([s, h, n, r]) => `${s}(${h}) ${fmt(n)} [사전 ${r}]`).join(" · "));
  const PAIRS = ["曺曹", "裵裴", "兪俞", "吳呉", "黃黄", "晉晋", "姬姫", "姸妍", "邊辺", "權権", "鄭郑", "盧卢", "羅罗", "劉刘"];
  console.log("이체자 쌍 (자료 인구 / 사전 있음):");
  for (const pair of PAIRS) {
    console.log(
      "  " +
        [...pair]
          .map((c) => {
            const pop = [...raw].filter(([k]) => k.split("|")[1] === c).reduce((s, [, n]) => s + n, 0);
            return `${c} 자료 ${pop ? fmt(pop) : "없음"} · 사전 ${dict.has(c) ? dict.get(c)!.map((r) => r.eum).join("·") : "없음"}`;
          })
          .join("  |  ")
    );
  }

  console.log("\n## 3. 자원오행 표에 없는 상위 성씨 한자 (인구 1만 명 이상)");
  const noElem = flat.filter((e) => e.population >= 10000 && [...e.hanja].every((c) => !SURNAME_ELEMENTS[c]));
  console.log(noElem.map((e) => `${[...e.sounds].join("·")}(${e.hanja}) ${fmt(e.population)}`).join(" · "));
  const elemNotInTable = Object.keys(SURNAME_ELEMENTS).filter((c) => !flat.some((e) => e.hanja.includes(c)));
  console.log(`자원오행 표에 있지만 성씨 표에 없는 글자: ${elemNotInTable.join(" ") || "없음"}`);

  console.log(`\n## 4. 바로 보이는 한자 (그 소리 인구 ${SURNAME_VISIBLE_SHARE * 100}% 이상, 1위는 늘)`);
  for (const s of ["이", "리", "박", "정", "조", "신", "전", "유", "류", "임", "림", "나", "라", "노", "김", "강", "장", "한", "윤", ...COMPOUND_SURNAMES]) {
    const g = sorted.find((x) => x.key === surnameKey(s));
    if (!g) {
      console.log(`${s}: 표에 없음`);
      continue;
    }
    const vis = g.list.filter((e, i) => i === 0 || e.population >= g.sum * SURNAME_VISIBLE_SHARE);
    console.log(`${s}: ${vis.map((e) => `${e.hanja} ${((e.population / g.sum) * 100).toFixed(1)}%`).join(" · ")}  (접힘 ${g.list.length - vis.length}개)`);
  }
  const compounds = sorted.filter((g) => g.key.length === 2);
  console.log(`\n자료의 복성 ${compounds.length}개: ${compounds.map((g) => `${g.key}(${g.list.map((e) => e.hanja).join("·")}) ${fmt(g.sum)}`).join(" · ")}`);
})();
