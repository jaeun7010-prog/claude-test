/**
 * 성씨 자원오행 표 시험: npx tsx --env-file=.env.local scripts/_tmp/surname-element-trial.ts <off|A|B> [set]
 * fetchSurname 조회 결과(hanja + eum 두 조건 조회)의 element만 바꿔 끼워 엔진 코드를 고치지 않고 영향을 잰다.
 * A = 확신 높음·보통만, B = 낮음까지 전부. set: single(단성 전체) | compound | top5
 */
import { createClient } from "@supabase/supabase-js";
import { parseNamingParams } from "@/lib/naming/params";
import { DISPLAY_LIMIT, runNaming } from "@/lib/naming/service";
import { rankByPriorities, firstSoundKey, DEFAULT_PRIORITIES } from "@/lib/naming/priorities";
const base = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

// 한자 → [제안 오행, 확신(H/M/L)]
const TABLE: Record<string, [string, "H" | "M" | "L"]> = {
  鄭: ["토", "M"], 姜: ["토", "L"], 趙: ["화", "M"], 尹: ["수", "L"], 張: ["금", "M"], 韓: ["금", "L"],
  吳: ["수", "M"], 徐: ["화", "L"], 申: ["금", "M"], 黃: ["토", "H"], 安: ["목", "M"], 宋: ["목", "H"],
  全: ["토", "L"], 高: ["화", "M"], 文: ["목", "M"], 孫: ["수", "H"], 裵: ["목", "M"], 曺: ["토", "L"],
  白: ["금", "H"], 許: ["금", "M"], 南: ["화", "H"], 盧: ["수", "L"], 丁: ["화", "H"], 郭: ["토", "M"],
  成: ["금", "L"], 車: ["화", "L"], 朱: ["화", "M"], 禹: ["토", "L"], 具: ["금", "L"], 辛: ["금", "H"],
  任: ["화", "M"], 閔: ["목", "M"], 兪: ["목", "L"], 羅: ["목", "M"], 嚴: ["수", "M"], 元: ["목", "M"],
  千: ["수", "L"], 方: ["토", "L"], 孔: ["수", "H"],
  宮: ["목", "M"], 諸: ["금", "M"], 皇: ["금", "M"], 甫: ["수", "L"], 于: ["수", "L"], 獨: ["토", "M"],
  孤: ["수", "M"], 司: ["수", "M"], 空: ["수", "L"], 西: ["금", "H"], 門: ["목", "M"],
};
const MODE = process.argv[2] ?? "off";
const SET = process.argv[3] ?? "top5";
const override = (h: string): string | undefined => {
  const t = TABLE[h];
  if (!t || MODE === "off") return undefined;
  return MODE === "B" || t[1] !== "L" ? t[0] : undefined;
};

// fetchSurname만 .in()을 두 번 부른다 → 그 조회 결과만 바꾼다
const supabase = new Proxy(base, {
  get(target, prop, recv) {
    if (prop !== "from") return Reflect.get(target, prop, recv);
    return (table: string) => {
      const q = target.from(table);
      return new Proxy(q, {
        get(t, p, r) {
          if (p !== "select") return Reflect.get(t, p, r);
          return (...args: unknown[]) => {
            let ins = 0;
            const wrap = (b: any): any => new Proxy(b, {
              get(bt, bp, br) {
                if (bp === "in") return (...a: unknown[]) => { ins++; return wrap(bt.in(...a)); };
                if (bp === "then") return (res: any, rej: any) => bt.then((out: any) => {
                  if (ins >= 2 && out.data) out.data = out.data.map((row: any) => { const e = override(row.hanja); return e ? { ...row, element: e } : row; });
                  return res(out);
                }, rej);
                const v = Reflect.get(bt, bp, br);
                return typeof v === "function" ? (...a: unknown[]) => { const o = v.apply(bt, a); return o && typeof o === "object" && "then" in o ? wrap(o) : o; } : v;
              },
            });
            return wrap((t as any).select(...args));
          };
        },
      });
    };
  },
}) as typeof base;

const BIRTHS = [
  ["2024-11-20", "09:33", "jeju"], ["2024-11-20", "09:33", "seoul"], ["2024-05-10", "07:28", "seoul"],
  ["2023-01-05", "23:25", "seoul"], ["1987-07-15", "14:20", "seoul"], ["2022-08-08", "12:10", "seoul"],
  ["2025-12-24", "18:50", "seoul"], ["2024-09-02", "06:58", "seoul"], ["2025-03-03", "03:15", "seoul"],
  ["2025-07-21", "16:40", "seoul"],
];
const SINGLE = "김金 이李 박朴 최崔 정鄭 강姜 조趙 윤尹 장張 임林 한韓 오吳 서徐 신申 권權 황黃 안安 송宋 전全 홍洪 유柳 고高 문文 양梁 손孫 배裵 조曺 백白 허許 유劉 남南 심沈 노盧 정丁 하河 곽郭 성成 차車 주朱 우禹 구具 신辛 임任 전田 민閔 유兪 나羅 진陳 지池 엄嚴 채蔡 원元 천千 방方 공孔";
const COMPOUND = "남궁南宮 제갈諸葛 황보皇甫 선우鮮于 독고獨孤 사공司空 서문西門 동방東方";
const TOP5 = "김金 이李 박朴 정鄭 최崔 강姜 윤尹 한韓";
const list = (SET === "single" ? SINGLE : SET === "compound" ? COMPOUND : TOP5).split(" ").map((x) => {
  const n = x.length / 2; return [x.slice(0, n), x.slice(n)] as const;
});

(async () => {
  const total: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
  for (const [s, sh] of list) for (const g of SET === "top5" ? ["male", "female"] : [undefined]) for (const [date, time, place] of BIRTHS) {
    const p = parseNamingParams({ surname: s, sh, date, time, place, ...(g ? { gender: g } : {}) });
    if (!p.ok) throw p.error;
    const r = await runNaming(supabase, p.value);
    if (!r.ok) throw new Error(r.error);
    const items = r.groups.map((x) => ({ x, metrics: { baseScore: x.options[0].baseScore, globalScore: 0, births: null, everListed: null } }));
    const shown = rankByPriorities(items, DEFAULT_PRIORITIES, false, DISPLAY_LIMIT, undefined, (i) => firstSoundKey([...i.x.hangul][0]));
    const c: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 };
    for (const { item } of shown.slice(0, DISPLAY_LIMIT)) { const a = item.x.options[0].analysis; c[a.grade]++; total[a.grade]++; }
    const top = shown.slice(0, 10).map(({ item }) => `${item.x.hangul}${item.x.options[0].givenName.map((h) => h.hanja).join("")}${item.x.options[0].analysis.grade}`).join(",");
    console.log(`${s}${sh}\t${g ?? "-"}\t${date} ${time} ${place}\t용신${r.saju.yongsin.yongsin}\tS${c.S} A${c.A} B${c.B} C${c.C}\t${top}`);
  }
  console.log(`TOTAL S${total.S} A${total.A} B${total.B} C${total.C}`);
})();
