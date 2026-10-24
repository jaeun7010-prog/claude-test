/** 81수 문구 점검: npx tsx scripts/_tmp/suri-check.ts (개수·겹치는 이름·무서운 말·여자아이 문장) */
import { isLuckySuri, suriText } from "@/lib/naming/suri81";

const names = new Map<string, number[]>();
for (let n = 1; n <= 81; n++) {
  const t = suriText(n);
  if (!t) throw new Error(`${n}수 없음`);
  names.set(t.name, [...(names.get(t.name) ?? []), n]);
  if (/단명|횡액|파멸|죽|사망|재앙/.test(t.text + t.summary)) console.log("무서운 말", n, t.text);
  if (t.female && !isLuckySuri(n)) console.log("흉수에 여자아이 문장", n);
}
console.log("겹치는 이름", [...names].filter(([, v]) => v.length > 1));
console.log("여자아이 문장", [...Array(81)].map((_, i) => i + 1).filter((n) => suriText(n).female));
console.log("82수 →", suriText(82).name, "/ 5·34·70:", suriText(5).name, suriText(34).name, suriText(70).name);
