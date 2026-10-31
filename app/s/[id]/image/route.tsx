import { ImageResponse } from "next/og";

import { loadCardFonts } from "@/lib/share/card-font";
import { loadNameShare, shareFullHanja, shareFullName, type NameShare } from "@/lib/share/name-share";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 이름 카드 그림 (PNG). 이름·뜻·축원과 "이름핏"만 그린다 (생년월일·사주 없음).
 *  - 기본: 가로 1200×630, 카톡·문자 링크 미리보기용 (공유 페이지 og:image)
 *  - ?size=story: 세로 1080×1350, 이미지 저장·공유하기용
 * 카드 내용은 한 번 만들면 바뀌지 않으므로 오래 캐시한다.
 */

// nodejs 런타임의 next/og는 Windows에서 기본 글꼴 경로를 잘못 만들어 멈춘다 (Next 14.2). 이 경로는 fetch만 쓰므로 edge로 둔다
export const runtime = "edge";

// next/og는 CSS 변수를 읽지 못해 디자인 규칙의 색을 값으로 적는다 (크림·먹·보조 글자·테두리·연모래)
const CREAM = "#FFF9F2";
const INK = "#1F2D3A";
const INK_SOFT = "#4A5663";
const LINE = "#F0E4D8";
const SAND_LIGHT = "#FDE6D3";

const SIZES = {
  og: { width: 1200, height: 630, hanja: 96, meaning: 28, blessing: 32, brand: 22, gap: 28, pad: 56, textWidth: 960 },
  story: { width: 1080, height: 1350, hanja: 136, meaning: 38, blessing: 44, brand: 30, gap: 52, pad: 96, textWidth: 840 },
} as const;
type Size = keyof typeof SIZES;

const siteLabel = () => {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  return url ? `이름핏 · ${url.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "이름핏";
};

function Card({ share, size }: { share: NameShare; size: Size }) {
  const s = SIZES[size];
  const hanjaChars = Array.from(shareFullHanja(share) ?? "");
  const nameChars = Array.from(shareFullName(share));
  // 이름이 길면(부모 성 함께 쓰기 등) 글자를 줄여 한 줄에 둔다. 글자마다 [한글 위 / 한자 아래] (NameWithHanja와 같은 규칙)
  const big = Math.min(s.hanja, Math.floor(s.textWidth / (nameChars.length * 1.15)));
  const small = Math.round(big * 0.42);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: SAND_LIGHT,
        padding: s.pad / 2,
        fontFamily: '"Noto Serif KR", "Noto Serif TC"',
        color: INK,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: CREAM,
          border: `2px solid ${LINE}`,
          borderRadius: 32,
          padding: s.pad,
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", gap: Math.round(big * 0.15) }}>
          {nameChars.map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: big, fontWeight: 700, lineHeight: 1.2 }}>{c}</div>
              {hanjaChars[i] && (
                <div style={{ display: "flex", fontSize: small, color: INK_SOFT, lineHeight: 1.4 }}>{hanjaChars[i]}</div>
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            maxWidth: s.textWidth,
            fontSize: s.meaning,
            lineHeight: 1.5,
            marginTop: s.gap,
            color: INK_SOFT,
            wordBreak: "keep-all",
          }}
        >
          {share.meaning}
        </div>
        <div style={{ display: "flex", width: 72, height: 2, backgroundColor: LINE, margin: `${s.gap}px 0` }} />
        <div style={{ display: "flex", justifyContent: "center", maxWidth: s.textWidth, fontSize: s.blessing, lineHeight: 1.5, wordBreak: "keep-all" }}>
          {share.blessing}
        </div>
        <div style={{ display: "flex", fontSize: s.brand, marginTop: s.gap * 1.2, color: INK_SOFT }}>{siteLabel()}</div>
      </div>
    </div>
  );
}

/** 한글 파일 이름은 filename*, 못 읽는 다운로드 관리자용으로 영문 이름도 함께 */
const downloadDisposition = (share: NameShare) =>
  `attachment; filename="namefit-card-${share.id}.png"; filename*=UTF-8''${encodeURIComponent(
    `이름카드-${shareFullName(share)}.png`
  )}`;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const share = await loadNameShare(createAdminClient(), params.id);
  if (!share) return new Response("Not found", { status: 404 });
  const query = new URL(request.url).searchParams;
  const size: Size = query.get("size") === "story" ? "story" : "og";
  const text = [shareFullHanja(share) ?? "", shareFullName(share), share.meaning, share.blessing, siteLabel()].join("");
  const fonts = await loadCardFonts(text);
  return new ImageResponse(<Card share={share} size={size} />, {
    width: SIZES[size].width,
    height: SIZES[size].height,
    fonts,
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
      // ?download=1: 이미지 저장 버튼. 앱 안 브라우저(카카오톡 등)는 blob 주소를 내려받지 못해 이 주소를 첨부 파일로 받는다
      ...(query.get("download") === "1" ? { "Content-Disposition": downloadDisposition(share) } : {}),
    },
  });
}
