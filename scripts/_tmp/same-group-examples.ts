import { nameMeaningOf } from "../../lib/naming/name-meaning";
import { NAME_MEANING } from "../../lib/naming/name-meaning-table";
const pairs = process.argv.slice(2);
const keys = Object.keys(NAME_MEANING);
const find = (h: string) => keys.find((k) => k.startsWith(`${h}|`))!;
for (const pr of pairs) {
  const cs = [...pr].map((h) => { const k = find(h); const [hanja, eum] = k.split("|"); return { hanja, eum, hun: null }; });
  console.log(pr, "→", nameMeaningOf(cs)?.sentence ?? "(없음)");
}
