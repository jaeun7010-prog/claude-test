/** @type {import('next').NextConfig} */
const nextConfig = {
  // dev 서버가 실행 중일 때 별도 폴더로 빌드 검증을 하려면 NEXT_DIST_DIR=.next-check 처럼 지정한다
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
