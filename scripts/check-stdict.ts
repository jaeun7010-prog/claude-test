/**
 * 순우리말 이름 후보의 표준국어대사전 등재 확인: npx tsx --env-file=.env.local scripts/check-stdict.ts [출력 JSON 경로]
 * lib/naming/native-names.ts의 이름마다 표준국어대사전 오픈 API(search.do)로 표제어를 찾아
 * 목록의 분류(사전 등재어 / 이름용 조어 / 널리 쓰이는 이름)와 맞는지 본다. 웹 검색 화면(/search/)은 robots.txt로 막혀 있어 쓰지 않는다.
 * 검색 API(search.do)는 표제어마다 첫 뜻만 주므로, 찾은 표제어마다 상세 API(view.do)로 모든 뜻과 어종(고유어·한자어 등)을 받는다.
 * 인자 `--raw 하늘`을 주면 그 낱말의 API 응답을 그대로 출력한다 (응답 구조 확인용).
 * 키(STDICT_API_KEY)는 출력하지 않는다.
 */
import { writeFileSync } from "node:fs";

import { NATIVE_NAMES, type NativeNameCategory } from "@/lib/naming/native-names";

const KEY = process.env.STDICT_API_KEY;
if (!KEY) {
  console.error("STDICT_API_KEY가 .env.local에 없습니다.");
  process.exit(1);
}
const ENDPOINT = "https://stdict.korean.go.kr/api/search.do";
const VIEW_ENDPOINT = "https://stdict.korean.go.kr/api/view.do";
const CATEGORY_LABEL: Record<NativeNameCategory, string> = {
  dictionary: "사전 등재어",
  coined: "이름용 조어",
  popular: "널리 쓰이는 이름",
};

interface Sense {
  definition: string;
  type?: string;
  link?: string;
}
interface Item {
  word: string;
  target_code: string;
  sup_no?: string;
  pos?: string;
  sense: Sense | Sense[];
}
export interface Entry {
  word: string;
  supNo: string;
  targetCode: string;
  pos: string;
  /** 어종: 고유어 / 한자어 / 외래어 / 혼종어 */
  wordType: string;
  /** 원어 (한자어·혼종어의 한자 등) */
  origin: string;
  /** 모든 뜻. type은 일반어 / 방언 / 옛말 / 북한어 등 */
  senses: { definition: string; type: string }[];
}

/** 표제어의 붙임표(-)·띄어쓰기 표시(^)·어깨번호를 지운 형태 */
const bare = (w: string) => w.replace(/[-^\s\d]/g, "");

/** API 응답을 받아 JSON으로 읽는다. 결과가 없으면 빈 문자열이 오므로 null */
async function getJson(url: string, label: string) {
  const res = await fetch(url);
  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} (${label})`);
  if (raw.trim() === "") return { raw, body: null };
  try {
    const body = JSON.parse(raw);
    if (body.error) throw new Error(`API 오류 ${body.error.error_code}: ${body.error.message}`);
    return { raw, body };
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error(`JSON이 아닌 응답 (${label}): ${raw.slice(0, 200)}`);
    throw e;
  }
}

interface ViewWord {
  word_type?: string;
  origin?: string;
  pos_info?: { comm_pattern_info?: { sense_info?: { definition: string; type?: string }[] }[] }[];
}

async function view(targetCode: string) {
  const url = `${VIEW_ENDPOINT}?key=${encodeURIComponent(KEY!)}&req_type=json&method=target_code&q=${targetCode}&type_search=view`;
  const { body } = await getJson(url, `view ${targetCode}`);
  const wi: ViewWord = body?.channel?.item?.word_info ?? {};
  const senses = (wi.pos_info ?? []).flatMap((p) =>
    (p.comm_pattern_info ?? []).flatMap((c) =>
      (c.sense_info ?? []).map((s) => ({ definition: s.definition, type: s.type ?? "" }))
    )
  );
  return { wordType: wi.word_type ?? "", origin: wi.origin ?? "", senses };
}

async function search(q: string): Promise<{ raw: string; entries: Entry[] }> {
  const url = `${ENDPOINT}?key=${encodeURIComponent(KEY!)}&q=${encodeURIComponent(q)}&req_type=json&num=100&advanced=y&method=exact`;
  const { raw, body } = await getJson(url, q);
  const items: Item[] = [body?.channel?.item ?? []].flat();
  const entries: Entry[] = [];
  for (const it of items.filter((i) => bare(i.word) === q)) {
    const detail = await view(it.target_code);
    await new Promise((ok) => setTimeout(ok, 150));
    const first = [it.sense].flat()[0];
    entries.push({
      word: it.word,
      supNo: it.sup_no ?? "",
      targetCode: it.target_code,
      pos: it.pos ?? "",
      ...detail,
      senses: detail.senses.length > 0 ? detail.senses : [{ definition: first.definition, type: first.type ?? "" }],
    });
  }
  return { raw, entries };
}

async function main() {
  if (process.argv[2] === "--raw") {
    const { raw } = await search(process.argv[3] ?? "하늘");
    console.log(raw.replaceAll(KEY!, "***"));
    return;
  }
  const out = process.argv[2] ?? "stdict-result.json";
  const result: { name: string; category: string; meaning: string; entries: Entry[] }[] = [];
  for (const r of NATIVE_NAMES) {
    const { entries } = await search(r.name);
    const category = CATEGORY_LABEL[r.category];
    result.push({ name: r.name, category, meaning: r.meaning, entries });
    console.log(`${r.name}\t${category}\t표제어 ${entries.length}개`);
    await new Promise((ok) => setTimeout(ok, 150));
  }
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`저장: ${out}`);
}

main().catch((e) => {
  console.error(String(e?.message ?? e).replaceAll(KEY!, "***"));
  process.exit(1);
});
