import { CSV_TEMPLATE_HEADER } from "@/lib/name-stats/constants";

/** 업로드용 CSV 템플릿 (헤더만). 엑셀이 한글을 올바르게 읽도록 UTF-8 BOM을 붙인다 */
export function GET() {
  return new Response(`\uFEFF${CSV_TEMPLATE_HEADER}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="name_stats_template.csv"',
    },
  });
}
