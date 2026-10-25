import { ImageResponse } from "next/og";

import { loadCardFonts } from "@/lib/share/card-font";
import { loadNameShare, shareFullHanja, shareFullName, type NameShare } from "@/lib/share/name-share";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 이름 카드 그림 (PNG). 이름·뜻·축원과 "이름핏"만 그린다 (생년월일·사주 없음).
 *  - 기본: 가로 1200×630, 카톡·문자 링크 미리보기용 (공유 페이지 og:image)
 *  - ?size=story: 세로 1080×1350, 이미지 저장·공유하기용
 * 카드 내용은 한 번 만들면 바뀌지 않으므로 오래 캐시한다. 모양은 간단하게 두고 전체 디자인 때 다듬는다.
 */

// nodejs 런타임의 next/og는 Windows에서 기본 글꼴 경로를 잘못 만들어 멈춘다 (Next 14.2). 이 경로는 fetch만 쓰므로 edge로 둔다
export const runtime = "edge";

const IVORY = "#fdfbf7";
const NAVY = "#2d3a52";
const SAND = "#f4eae1";

const SIZES = {
  og: { width: 1200, height: 630, hanja: 104, name: 40, meaning: 28, blessing: 32, brand: 22, gap: 28, pad: 56, textWidth: 960 },
  story: { width: 1080, height: 1350, hanja: 150, name: 56, meaning: 38, blessing: 44, brand: 30, gap: 52, pad: 96, textWidth: 840 },
} as const;
type Size = keyof typeof SIZES;

const siteLabel = () => {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  return url ? `이름핏 · ${url.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "이름핏";
};

function Card({ share, size }: { share: NameShare; size: Size }) {
  const s = SIZES[size];
  const hanja = shareFullHanja(share);
  const name = shareFullName(share);
  // 이름이 길면(부모 성 함께 쓰기 등) 글자를 줄여 한 줄에 둔다
  const chars = (hanja ?? name).length;
  const big = Math.min(s.hanja, Math.floor((s.textWidth * 0.9) / (chars * 1.5)));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: SAND,
        padding: s.pad / 2,
        // 글자 사이 간격(letterSpacing)은 마지막 글자 뒤에도 붙어 이름이 왼쪽으로 쏠리므로 같은 만큼 왼쪽을 띄운다
        fontFamily: '"Noto Serif KR", "Noto Serif TC"',
        color: NAVY,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: IVORY,
          border: `2px solid rgba(45, 58, 82, 0.15)`,
          borderRadius: 32,
          padding: s.pad,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: big, fontWeight: 700, letterSpacing: big * 0.3, paddingLeft: big * 0.3, lineHeight: 1.1, whiteSpace: "nowrap" }}>
          {hanja ?? name}
        </div>
        {hanja && (
          <div style={{ display: "flex", fontSize: s.name, letterSpacing: s.name * 0.3, paddingLeft: s.name * 0.3, marginTop: s.gap / 2, whiteSpace: "nowrap" }}>{name}</div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            maxWidth: s.textWidth,
            fontSize: s.meaning,
            lineHeight: 1.5,
            marginTop: s.gap,
            opacity: 0.8,
            wordBreak: "keep-all",
          }}
        >
          {share.meaning}
        </div>
        <div style={{ display: "flex", width: 72, height: 2, backgroundColor: NAVY, opacity: 0.2, margin: `${s.gap}px 0` }} />
        <div style={{ display: "flex", justifyContent: "center", maxWidth: s.textWidth, fontSize: s.blessing, lineHeight: 1.5, wordBreak: "keep-all" }}>
          “{share.blessing}”
        </div>
        <div style={{ display: "flex", fontSize: s.brand, marginTop: s.gap * 1.2, opacity: 0.55 }}>{siteLabel()}</div>
      </div>
    </div>
  );
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const share = await loadNameShare(createAdminClient(), params.id);
  if (!share) return new Response("Not found", { status: 404 });
  const size: Size = new URL(request.url).searchParams.get("size") === "story" ? "story" : "og";
  const text = [shareFullHanja(share) ?? "", shareFullName(share), share.meaning, `“${share.blessing}”`, siteLabel()].join("");
  const fonts = await loadCardFonts(text);
  return new ImageResponse(<Card share={share} size={size} />, {
    width: SIZES[size].width,
    height: SIZES[size].height,
    fonts,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
