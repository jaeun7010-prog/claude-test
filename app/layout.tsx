import type { Metadata } from "next";
import localFont from "next/font/local";
import { Nanum_Myeongjo, Noto_Serif_KR } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site/site-header";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

// 이름과 한자
const notoSerif = Noto_Serif_KR({
  weight: ["500", "700"],
  variable: "--font-noto-serif",
  display: "swap",
  preload: false,
});

// PDF 리포트 전용. 글꼴이 바뀌면 쪽 넘침을 다시 확인해야 한다
const myeongjo = Nanum_Myeongjo({
  weight: ["400", "700", "800"],
  variable: "--font-myeongjo",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // 링크 미리보기 그림(og:image)을 절대 주소로 만들 때 쓴다. 도메인이 정해지면 NEXT_PUBLIC_SITE_URL에 넣는다
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title: "이름핏 (NameFit)",
  description: "사주 맞춤 작명 & 희소성 통계 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${notoSerif.variable} ${myeongjo.variable}`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
