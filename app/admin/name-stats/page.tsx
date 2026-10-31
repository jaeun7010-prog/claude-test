import { notFound, redirect } from "next/navigation";

import { NameStatsUploadForm } from "@/components/admin/name-stats-upload-form";
import { DataSourceNote } from "@/components/data-source-note";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEFAULT_SOURCE_NAME } from "@/lib/name-stats/constants";
import { formatAsOfDate } from "@/lib/name-stats/snapshot";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "이름 통계 업로드 | 이름핏 관리자" };
export const dynamic = "force-dynamic";

export default async function AdminNameStatsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/admin/name-stats")}`);

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();

  const { data: snapshots } = await supabase
    .from("data_snapshots")
    .select("id, as_of_date, source_name, uploaded_at, row_count")
    .order("uploaded_at", { ascending: false })
    .limit(10);

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-2xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-3xl font-extrabold">이름 통계 업로드</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          공개 통계를 정리한 CSV를 올리면 검증 후 반영합니다. CSV에 포함된 연도는 통째로 교체되므로
          연도 단위로 남/여 전체 목록을 올려 주세요.
        </p>
        <DataSourceNote className="mt-2" />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>CSV 업로드</CardTitle>
          <CardDescription>
            잘못된 행이 하나라도 있으면 아무것도 반영하지 않고 오류 목록을 보여 줍니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NameStatsUploadForm defaultSourceName={DEFAULT_SOURCE_NAME} />
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">최근 반영 이력</h2>
        {!snapshots || snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 반영된 통계가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 font-medium">기준일</th>
                <th className="py-1 font-medium">출처</th>
                <th className="py-1 text-right font-medium">행 수</th>
                <th className="py-1 text-right font-medium">업로드 일시</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-1">{formatAsOfDate(s.as_of_date)}</td>
                  <td className="py-1">{s.source_name}</td>
                  <td className="py-1 text-right">{Number(s.row_count).toLocaleString("ko-KR")}</td>
                  <td className="py-1 text-right">
                    {new Date(s.uploaded_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
