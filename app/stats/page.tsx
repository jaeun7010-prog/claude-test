import Link from "next/link";

import { DataSourceNote } from "@/components/data-source-note";
import { NameStatsBasic } from "@/components/name-stats-basic";
import { NameStatsDetail } from "@/components/name-stats-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATS_START_YEAR } from "@/lib/name-stats/constants";
import { getLatestSnapshot } from "@/lib/name-stats/snapshot";
import { loadNameSummaries } from "@/lib/stats/name-stats";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "이름 희소성 통계 | 이름핏" };
export const dynamic = "force-dynamic";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { name?: string };
}) {
  const name = (searchParams.name ?? "").trim();
  const valid = /^[가-힣]{1,4}$/.test(name);

  let loaded: Awaited<ReturnType<typeof loadNameSummaries>> = null;
  let failed = false;
  if (valid) {
    try {
      loaded = await loadNameSummaries(createClient(), [name]);
    } catch (e) {
      console.error("[stats] 조회 실패", e);
      failed = true;
    }
  }
  const stat = loaded?.summaries.get(name);
  const snapshot = stat ? await getLatestSnapshot() : null;

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-2xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-3xl font-extrabold">이름 희소성 통계</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {STATS_START_YEAR}년 이후 같은 이름(성 제외)으로 출생신고된 건수와 성비를 연도별로 확인합니다.
        </p>
      </header>

      <form method="get" className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="name">이름 (성 제외)</Label>
          <Input id="name" name="name" placeholder="예: 서윤" maxLength={4} defaultValue={name} required />
        </div>
        <Button type="submit">조회</Button>
      </form>

      {name && !valid && (
        <p role="alert" className="text-sm text-destructive">
          이름은 한글 1~4자로 입력해 주세요.
        </p>
      )}
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {valid && !failed && !loaded && (
        <p className="rounded-md bg-secondary p-3 text-sm">
          출생 통계 데이터가 아직 적재되지 않았습니다.
        </p>
      )}

      {stat && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif font-bold">{stat.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NameStatsBasic stat={stat} asOfDate={snapshot?.asOfDate ?? null} />
            <NameStatsDetail stat={stat} />
            <p className="text-xs text-muted-foreground">
              통계는 공개된 상위 출생신고 이름 목록을 기준으로 하므로, 점선 막대는 &quot;상위 목록 밖&quot;(해당
              연도 최소 인원 미만)을 뜻합니다. {STATS_START_YEAR}년 이후 누적 건수는 목록에 오른 해만
              합산한 값입니다.
            </p>
            <DataSourceNote />
          </CardContent>
        </Card>
      )}

      <Button asChild variant="outline">
        <Link href="/naming">작명하러 가기</Link>
      </Button>
    </main>
  );
}
