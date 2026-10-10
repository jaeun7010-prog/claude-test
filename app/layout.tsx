import type { Metadata } from "next";
import localFont from "next/font/local";
import { Nanum_Myeongjo } from "next/font/google";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

const myeongjo = Nanum_Myeongjo({
  weight: ["400", "700", "800"],
  variable: "--font-myeongjo",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "이름핏 (NameFit)",
  description: "사주 맞춤 작명 & 희소성 통계 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${myeongjo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
