/**
 * 소리·자원오행별 쓸 수 있는 글자 (임시): npx tsx --env-file=.env.local scripts/_tmp/sound-element-alts.ts 澨 池 …
 * 글자마다 같은 음·같은 자원오행의 다른 후보(애매·어색·제외 아님)를 보여 준다.
 * 대안이 없으면 그 오행이 용신인 사주에서 그 글자가 늘 대표 한자로 뽑힌다 (岷과 같은 경우).
 */
import { createClient } from "@supabase/supabase-js";
import { fetchByEum } from "@/lib/naming/hanja-repo";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const LABEL = { good: "좋음", normal: "보통", obscure: "애매", awkward: "어색", exclude: "제외" } as const;

(async () => {
  const targets = process.argv.slice(2);
  const all = await Promise.all(targets.map(async (h) => {
    // 대상 글자의 음은 사전에서 찾는다 (읽기가 여럿이면 모두)
    const { data } = await supabase.from("hanja_dict").select("eum").eq("hanja", h).eq("is_name_hanja", true);
    return { h, eums: [...new Set((data ?? []).map((r: { eum: string }) => r.eum))] };
  }));
  for (const { h, eums } of all) {
    for (const eum of eums) {
      const rows = await fetchByEum(supabase, eum);
      const me = rows.find((r) => r.hanja === h);
      if (!me) continue;
      const usable = (s: string) => s === "good" || s === "normal";
      const same = rows.filter((r) => r.hanja !== h && r.element === me.element && me.element && usable(r.suitability));
      console.log(
        `${h}(${me.hun ?? "훈 없음"} ${eum})\t${LABEL[me.suitability]}\t${me.element ?? "-"}\t같은 소리·오행 대안 ${same.length}자: ` +
          (same.map((r) => `${r.hanja}(${r.hun ?? "-"},${LABEL[r.suitability]})`).join(" ") || "없음")
      );
    }
  }
})();
