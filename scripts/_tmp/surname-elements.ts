import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const L = "김金 이李 박朴 최崔 정鄭 강姜 조趙 윤尹 장張 임林 한韓 오吳 서徐 신申 권權 황黃 안安 송宋 전全 홍洪 유柳 고高 문文 양梁 손孫 배裵 조曺 백白 허許 유劉 남南 심沈 노盧 정丁 하河 곽郭 성成 차車 주朱 우禹 구具 신辛 임任 전田 민閔 유兪 류柳 나羅 진陳 지池 엄嚴 채蔡 원元 천千 방方 공孔 강康 현玄 함咸 변卞 염廉 양楊 변邊 여呂 추秋 도都 남南 궁宮 제諸 갈葛 황皇 보甫 선鮮 우于 독獨 고孤 사司 공空 서西 문門 동東 방方".split(" ");
(async () => {
  const { data, error } = await s.from("hanja_dict").select("hanja,eum,element,stroke_count,radical,hun").in("hanja", L.map(x => x.slice(-1)));
  if (error) throw error;
  for (const x of L) { const [e, h] = [x.slice(0, -1), x.slice(-1)]; const r = data!.find(r => r.hanja === h && r.eum === e);
    console.log(e, h, r ? `${r.radical} ${r.stroke_count} ${r.element ?? "-"} ${r.hun ?? ""}` : "없음"); }
})();
