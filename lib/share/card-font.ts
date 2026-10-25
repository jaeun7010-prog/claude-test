/**
 * 이름 카드 그림 글꼴. next/og(satori)는 woff2를 읽지 못해 Pretendard 파일을 쓸 수 없으므로,
 * 카드에 들어갈 글자만 Google Fonts에서 TTF로 받는다 (User-Agent 없이 요청하면 truetype을 준다).
 *  - Noto Serif KR: 한글·한자 (나눔명조는 한자가 KS X 1001 4,888자뿐이라 드문 인명용 한자가 빠질 수 있다)
 *  - Noto Serif TC: Noto Serif KR에 없는 한자를 채우는 예비 글꼴 (satori는 앞 글꼴에 없는 글자를 다음 글꼴에서 찾는다)
 * 받은 글꼴은 fetch 캐시에 남는다 (같은 글자 묶음이면 다시 받지 않음).
 */

export interface CardFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

async function loadFont(family: string, weight: 400 | 700, text: string): Promise<ArrayBuffer | null> {
  const chars = Array.from(new Set(text)).join("");
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(chars)}`;
  const css = await (await fetch(cssUrl)).text();
  const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) return null;
  const res = await fetch(src);
  return res.ok ? res.arrayBuffer() : null;
}

/** 카드 글자(text)에 필요한 글꼴. 굵기 400(뜻·축원)·700(이름) */
export async function loadCardFonts(text: string): Promise<CardFont[]> {
  const hanja = text.replace(/[^一-鿿豈-﫿]/g, "");
  const jobs: Promise<CardFont | null>[] = [];
  for (const weight of [400, 700] as const) {
    jobs.push(loadFont("Noto Serif KR", weight, text).then((data) => data && { name: "Noto Serif KR", data, weight, style: "normal" }));
    if (hanja)
      jobs.push(loadFont("Noto Serif TC", weight, hanja).then((data) => data && { name: "Noto Serif TC", data, weight, style: "normal" }));
  }
  return (await Promise.all(jobs)).filter((f): f is CardFont => f !== null);
}
