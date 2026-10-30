import { LandingPage, type LandingStats } from "@/components/landing/landing-page";
import { TEST_SOURCE_NAME } from "@/lib/name-stats/constants";
import { getLatestSnapshot } from "@/lib/name-stats/snapshot";
import { loadNameSummaries } from "@/lib/stats/name-stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "이름핏 | 우리 아이 사주에 맞는 이름",
  description: "성씨와 태어난 날만 넣으면 추천 이름 30개를 점수, 출처, 출생 통계와 함께 무료로 받아요.",
};

const SAMPLE_NAME = "서윤";
const CHART_YEARS = 6;

/** 예시 이름의 실제 통계. 자료가 없거나 테스트 데이터면 null (가짜 숫자를 홍보 화면에 내보내지 않는다) */
async function loadLandingStats(): Promise<LandingStats | null> {
  const snapshot = await getLatestSnapshot();
  if (!snapshot || snapshot.sourceName === TEST_SOURCE_NAME) return null;
  try {
    const loaded = await loadNameSummaries(createClient(), [SAMPLE_NAME]);
    const stat = loaded?.summaries.get(SAMPLE_NAME);
    const points = (stat?.series ?? [])
      .filter((p) => p.listed)
      .sort((a, b) => a.year - b.year)
      .slice(-CHART_YEARS);
    const latest = points[points.length - 1];
    if (!stat || !latest) return null;
    return { name: SAMPLE_NAME, asOfDate: snapshot.asOfDate, points, latest, tier: stat.tier };
  } catch (e) {
    console.error("[home] 통계 조회 실패", e);
    return null;
  }
}

export default async function Home() {
  return <LandingPage stats={await loadLandingStats()} />;
}
