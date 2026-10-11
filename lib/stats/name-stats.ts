import type { SupabaseClient } from "@supabase/supabase-js";

/** 같은 이름(성 제외)으로 출생신고된 인원의 희소성 등급 기준 (최신 연도 기준 인원) */
export const TIER_COMMON_MIN = 300;
export const TIER_NORMAL_MIN = 80;
/** 젠더 뉴트럴: 최근 합계 인원이 이 이상이고 소수 성별 비율이 이 이상 */
export const NEUTRAL_MIN_TOTAL = 20;
export const NEUTRAL_MIN_MINOR_RATIO = 0.3;
/** 성비·젠더 뉴트럴 판단에 쓰는 최근 연도 수 */
export const RECENT_YEARS = 5;

export type Tier = "흔함" | "보통" | "드묾" | "매우 드묾";

export interface YearPoint {
  year: number;
  total: number;
  male: number;
  female: number;
  /** 해당 연도 통계 목록에 올라 있는가. false면 total은 0이 아니라 "min_listed 미만"이다 */
  listed: boolean;
  /** listed=false일 때 상한(해당 연도 목록의 최소 인원). 그 연도 데이터가 없으면 null */
  upperBound: number | null;
}

export interface NameStatSummary {
  name: string;
  series: YearPoint[];
  latest: YearPoint | null;
  tier: Tier | null;
  /** 최근 RECENT_YEARS 연도 중 목록에 있는 해의 남아 비율 (0~1). 인원이 없으면 null */
  maleRatio: number | null;
  recentTotal: number;
  neutral: boolean;
  /** 어느 연도든 목록에 한 번이라도 올랐는가 */
  everListed: boolean;
  /** 적재된 전체 연도의 성별별 누적 건수 (목록에 오른 해만 합산) */
  cumulative: Cumulative;
}

export interface Cumulative {
  male: number;
  female: number;
}

export interface YearSummary {
  year: number;
  minListed: number;
  names: number;
}

interface StatRow {
  name: string;
  year: number;
  total_count: number;
  male_count: number;
  female_count: number;
}

// 한 번의 조회가 API 기본 최대 행 수(1,000행)를 넘지 않도록: 이름 40개 × 연도 수
const CHUNK = 40;

/** 연도별 목록 요약 (통계 데이터가 적재되지 않았거나 뷰가 없으면 빈 배열) */
export async function fetchYearSummary(supabase: SupabaseClient): Promise<YearSummary[]> {
  const { data, error } = await supabase
    .from("name_stats_year_summary")
    .select("year, min_listed, names")
    .order("year", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    year: Number(r.year),
    minListed: Number(r.min_listed),
    names: Number(r.names),
  }));
}

/** 여러 이름의 연도별 통계 행을 조회 (이름 수가 많으면 나눠서 조회) */
export async function fetchNameRows(
  supabase: SupabaseClient,
  names: string[]
): Promise<Map<string, StatRow[]>> {
  const unique = [...new Set(names)];
  const out = new Map<string, StatRow[]>();
  for (let i = 0; i < unique.length; i += CHUNK) {
    const part = unique.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("name_stats_yearly")
      .select("name, year, total_count, male_count, female_count")
      .in("name", part)
      .order("year", { ascending: true })
      .range(0, 4999);
    if (error) throw new Error(`이름 통계 조회 실패: ${error.message}`);
    for (const r of (data ?? []) as StatRow[]) {
      const list = out.get(r.name) ?? [];
      list.push(r);
      out.set(r.name, list);
    }
  }
  return out;
}

/** 여러 이름의 성별별 누적 건수를 조회 (name_stats_cumulative 뷰) */
export async function fetchCumulative(
  supabase: SupabaseClient,
  names: string[]
): Promise<Map<string, Cumulative>> {
  const unique = [...new Set(names)];
  const out = new Map<string, Cumulative>();
  for (let i = 0; i < unique.length; i += 500) {
    const { data, error } = await supabase
      .from("name_stats_cumulative")
      .select("name, male_total, female_total")
      .in("name", unique.slice(i, i + 500));
    if (error) throw new Error(`이름 누적 통계 조회 실패: ${error.message}`);
    for (const r of data ?? [])
      out.set(r.name, { male: Number(r.male_total), female: Number(r.female_total) });
  }
  return out;
}

export function tierOf(latest: YearPoint): Tier {
  if (!latest.listed) return "매우 드묾";
  if (latest.total >= TIER_COMMON_MIN) return "흔함";
  if (latest.total >= TIER_NORMAL_MIN) return "보통";
  return "드묾";
}

/** 한 이름의 통계를 연도별 계열과 등급/성비 요약으로 정리 */
export function summarizeName(
  name: string,
  rows: StatRow[],
  years: YearSummary[],
  cumulative: Cumulative = { male: 0, female: 0 }
): NameStatSummary {
  const byYear = new Map(rows.map((r) => [r.year, r]));
  const series: YearPoint[] = years.map((y) => {
    const r = byYear.get(y.year);
    return r
      ? {
          year: y.year,
          total: r.total_count,
          male: r.male_count,
          female: r.female_count,
          listed: true,
          upperBound: null,
        }
      : { year: y.year, total: 0, male: 0, female: 0, listed: false, upperBound: y.minListed };
  });

  const latest = series.length ? series[series.length - 1] : null;
  const recent = series.slice(-RECENT_YEARS).filter((p) => p.listed);
  const male = recent.reduce((s, p) => s + p.male, 0);
  const female = recent.reduce((s, p) => s + p.female, 0);
  const recentTotal = male + female;
  const maleRatio = recentTotal > 0 ? male / recentTotal : null;
  const neutral =
    maleRatio !== null &&
    recentTotal >= NEUTRAL_MIN_TOTAL &&
    Math.min(maleRatio, 1 - maleRatio) >= NEUTRAL_MIN_MINOR_RATIO;

  return {
    name,
    series,
    latest,
    tier: latest ? tierOf(latest) : null,
    maleRatio,
    recentTotal,
    neutral,
    everListed: rows.length > 0,
    cumulative,
  };
}

/** 이름 목록 → 요약 맵. 통계가 없으면 null */
export async function loadNameSummaries(
  supabase: SupabaseClient,
  names: string[]
): Promise<{ years: YearSummary[]; summaries: Map<string, NameStatSummary> } | null> {
  const years = await fetchYearSummary(supabase);
  if (years.length === 0) return null;
  const [rows, cumulative] = await Promise.all([
    fetchNameRows(supabase, names),
    fetchCumulative(supabase, names),
  ]);
  const summaries = new Map<string, NameStatSummary>();
  for (const n of new Set(names))
    summaries.set(n, summarizeName(n, rows.get(n) ?? [], years, cumulative.get(n)));
  return { years, summaries };
}
