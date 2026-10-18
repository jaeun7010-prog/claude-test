/**
 * 우리말 이름 점수 표본: npx tsx scripts/native-score-sample.ts [--detail]
 * 성 5개 × 용신(목 / 금 / 생일 없음) × 성별(남자아이 = 남 + 무관, 여자아이 = 여 + 무관)의 상위 10개와 하위 5개.
 * 글자 수는 "상관없음"(2~3자). 마지막에 지켜볼 이름(WATCH)의 순위와 외자 후보 수를 출력한다.
 * --detail이면 이름마다 항목별 점수와 설명을 함께 출력한다.
 */
import { NATIVE_NAMES } from "@/lib/naming/native-names";
import { nativeLengthAllowed, type NativeLength } from "@/lib/naming/native/length";
import { compareNativeScore, scoreNativeName, type NativeSaju } from "@/lib/naming/native/score";

const SURNAMES = ["김", "이", "박", "최", "정"];
const SAJU: [string, NativeSaju | undefined][] = [
  ["목이 필요한 아이", { needed: "목", favorable: "수", unfavorable: "금" }],
  ["금이 필요한 아이", { needed: "금", favorable: "토", unfavorable: "화" }],
  ["생일 없음", undefined],
];
const GENDERS = [["남자아이", "male"], ["여자아이", "female"]] as const;
/** [성, 이름]: 표본 성씨 밖이어도 순위를 따로 본다 */
const WATCH: [string, string][] = [["박", "꽃길"], ["이", "가꿈"], ["이", "별"], ["강", "도담"]];
const detail = process.argv.includes("--detail");

function rank(surname: string, saju: NativeSaju | undefined, g: string, length: NativeLength) {
  return NATIVE_NAMES.filter((n) => (n.gender === g || n.gender === "neutral") && nativeLengthAllowed([...n.name].length, length))
    .map((name) => scoreNativeName({ name, surname, saju }))
    .sort((a, b) => compareNativeScore(a, b) || a.name.localeCompare(b.name, "ko"));
}

const watchLines: string[] = [];
for (const [sajuLabel, saju] of SAJU) {
  for (const [gLabel, g] of GENDERS) {
    console.log(`\n## ${sajuLabel} · ${gLabel} (상관없음 ${rank("김", saju, g, "any").length}개)`);
    for (const surname of SURNAMES) {
      const ranked = rank(surname, saju, g, "any");
      const fmt = (r: (typeof ranked)[number]) => {
        const i = r.items;
        const base = `${surname}${r.name} ${r.total}${r.teasing ? `(${r.teasing.level === "strong" ? "강" : "약"}:${r.teasing.word})` : ""}`;
        return detail
          ? `${base} [용${i.yongsin.score ?? "-"} 흐${i.flow.score} 뜻${i.meaning.score} 쉬${i.easy.score}] ${i.easy.note}`
          : base;
      };
      if (detail) {
        console.log(`### ${surname}`);
        console.log("상위 10:\n  " + ranked.slice(0, 10).map(fmt).join("\n  "));
        console.log("하위 5:\n  " + ranked.slice(-5).map(fmt).join("\n  "));
      } else {
        console.log(`${surname} 상위: ${ranked.slice(0, 10).map(fmt).join(", ")}`);
        console.log(`${surname} 하위: ${ranked.slice(-5).map(fmt).join(", ")}`);
      }
    }
    for (const [s, n] of WATCH) {
      const name = NATIVE_NAMES.find((x) => x.name === n)!;
      const length: NativeLength = [...n].length === 1 ? "single" : "any";
      if (name.gender !== g && name.gender !== "neutral") continue;
      const ranked = rank(s, saju, g, length);
      const i = ranked.findIndex((r) => r.name === n);
      const r = ranked[i];
      watchLines.push(
        `${sajuLabel} · ${gLabel} · ${s}${n} (${length === "single" ? "외자" : "상관없음"}): ${i + 1}/${ranked.length}위 ${r.total}점 [용${r.items.yongsin.score ?? "-"} 흐${r.items.flow.score} 뜻${r.items.meaning.score} 쉬${r.items.easy.score}] ${r.items.easy.note}`
      );
    }
  }
}
console.log("\n## 지켜볼 이름\n" + watchLines.join("\n"));
const single = NATIVE_NAMES.filter((n) => [...n.name].length === 1);
console.log(
  `\n## 외자 후보 수: 남자아이 ${single.filter((n) => n.gender !== "female").length} · 여자아이 ${single.filter((n) => n.gender !== "male").length} · 성별 무관 ${single.filter((n) => n.gender === "neutral").length}`
);
