import type { SupabaseClient } from "@supabase/supabase-js";

import { namingChildKey } from "@/lib/naming/params";

/**
 * 프리미엄 리포트 결제 여부로 유료 내용을 보여 줄지 정한다. 유료 내용은 서버에서 이 판단을 거친 뒤에만 그린다
 * (결제하지 않았으면 HTML·RSC 응답에 아예 넣지 않음).
 *  - 사주 상세(오행 비율, 합·충·형·격국 근거, 용신을 고른 이유): 같은 아이로 결제한 리포트가 하나라도 있으면
 *  - 이름 상세(발음·자원오행 흐름, 글자 상세 풀이, 법적 기준 상세): 그 이름의 리포트. 저장 이름과 연결된 주문(history_id)이거나
 *    같은 아이 + 같은 법적 이름 한자·한글
 * 같은 아이 비교는 namingChildKey (성·성씨 한자·생년월일·시각·출생지·성별). 글자 수·돌림자 같은 검색 조건이 달라도,
 * 추천받기·직접 짓기·마이페이지 어디서 결제했든 같은 기준으로 연다 (2026-10-25 사용자 결정).
 */

/** 리포트를 볼 수 있는 주문 상태 (결제 대기·취소·환불 제외) */
const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

export interface PaidReport {
  orderId: string;
  historyId: string | null;
  childKey: string | null;
  nameKey: string | null;
}

export interface Entitlement {
  /** 사주 상세 */
  saju: boolean;
  /** 이 이름(법적 이름 한자·한글)의 상세 */
  name: (givenHanja: string, given: string) => boolean;
  /** 이 이름의 결제한 리포트 주문 id (가장 최근, 저장 이름과 연결된 주문 먼저). 없으면 null */
  reportOrderId: (givenHanja: string, given: string) => string | null;
}

export const NO_ENTITLEMENT: Entitlement = { saju: false, name: () => false, reportOrderId: () => null };

const nameKeyOf = (givenHanja: string, given: string) => `${givenHanja}|${given}`;

/** 로그인 사용자의 결제한 리포트 주문, 최근 주문 먼저 (RLS 로 본인 주문만) */
export async function loadPaidReports(supabase: SupabaseClient): Promise<PaidReport[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, history_id, item_options")
    .eq("order_type", "premium_report")
    .in("status", PAID_STATUSES)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[entitlement] 주문 조회 실패", error);
    return [];
  }
  return (data ?? []).map((o) => {
    const opt = (o.item_options ?? {}) as { qs?: unknown; name?: { given?: unknown; givenHanja?: unknown } };
    const n = opt.name;
    return {
      orderId: o.id,
      historyId: o.history_id,
      childKey: typeof opt.qs === "string" ? namingChildKey(opt.qs) : null,
      nameKey:
        typeof n?.givenHanja === "string" && typeof n?.given === "string" ? nameKeyOf(n.givenHanja, n.given) : null,
    };
  });
}

/**
 * 저장 이름(또는 지금 보는 이름)의 결제한 리포트 주문 id. 저장 이름과 연결된 주문(history_id)을 먼저 보고,
 * 없으면 같은 아이 + 같은 이름 한자·한글 주문. 마이페이지 목록의 "리포트 구매" 표시와 상세의 "리포트 보기"에 쓴다.
 */
export function findReportOrder(
  reports: PaidReport[],
  target: { historyId?: string; childKey: string | null; givenHanja: string; given: string }
): string | null {
  const linked = target.historyId ? reports.find((r) => r.historyId === target.historyId) : undefined;
  if (linked) return linked.orderId;
  if (!target.childKey) return null;
  const key = nameKeyOf(target.givenHanja, target.given);
  return reports.find((r) => r.childKey === target.childKey && r.nameKey === key)?.orderId ?? null;
}

/**
 * @param childKey 지금 보는 아이 (namingChildKey·namingChildQuery). 알 수 없으면 null
 * @param historyId 마이페이지 저장 이름에서 볼 때 그 저장 id
 */
export async function loadEntitlement(
  supabase: SupabaseClient,
  loggedIn: boolean,
  childKey: string | null,
  historyId?: string
): Promise<Entitlement> {
  if (!loggedIn) return NO_ENTITLEMENT;
  const reports = await loadPaidReports(supabase);
  const same = childKey ? reports.filter((r) => r.childKey === childKey) : [];
  const names = new Set(same.map((r) => r.nameKey));
  const linked = !!historyId && reports.some((r) => r.historyId === historyId);
  return {
    saju: same.length > 0 || linked,
    name: (givenHanja, given) => linked || names.has(nameKeyOf(givenHanja, given)),
    reportOrderId: (givenHanja, given) => findReportOrder(reports, { historyId, childKey, givenHanja, given }),
  };
}
