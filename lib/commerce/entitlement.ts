import type { SupabaseClient } from "@supabase/supabase-js";

import { namingConditionKey } from "@/lib/naming/params";

/**
 * 프리미엄 리포트 결제 여부로 유료 내용을 보여 줄지 정한다. 유료 내용은 서버에서 이 판단을 거친 뒤에만 그린다
 * (결제하지 않았으면 HTML·RSC 응답에 아예 넣지 않음).
 *  - 사주 상세(오행 비율, 합·충·형·격국 근거, 용신을 고른 이유, 조합 진단의 괜찮은 점): 같은 입력 조건으로 결제한 리포트가 하나라도 있으면
 *  - 이름 상세(발음·자원오행 흐름, 영문 뜻풀이, 법적 기준 상세): 그 이름의 리포트. 저장 이름과 연결된 주문(history_id)이거나
 *    같은 입력 조건 + 같은 이름 한자·한글
 * 같은 조건 비교는 namingConditionKey (정렬 방식 rarity 는 보지 않음).
 */

/** 리포트를 볼 수 있는 주문 상태 (결제 대기·취소·환불 제외) */
const PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"];

interface PaidReport {
  historyId: string | null;
  conditionKey: string | null;
  nameKey: string | null;
}

export interface Entitlement {
  /** 사주 상세 */
  saju: boolean;
  /** 이 이름(법적 이름 한자·한글)의 상세 */
  name: (givenHanja: string, given: string) => boolean;
}

export const NO_ENTITLEMENT: Entitlement = { saju: false, name: () => false };

const nameKeyOf = (givenHanja: string, given: string) => `${givenHanja}|${given}`;

/** 로그인 사용자의 결제한 리포트 주문 (RLS 로 본인 주문만) */
async function loadPaidReports(supabase: SupabaseClient): Promise<PaidReport[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("history_id, item_options")
    .eq("order_type", "premium_report")
    .in("status", PAID_STATUSES);
  if (error) {
    console.error("[entitlement] 주문 조회 실패", error);
    return [];
  }
  return (data ?? []).map((o) => {
    const opt = (o.item_options ?? {}) as { qs?: unknown; name?: { given?: unknown; givenHanja?: unknown } };
    const n = opt.name;
    return {
      historyId: o.history_id,
      conditionKey: typeof opt.qs === "string" ? namingConditionKey(opt.qs) : null,
      nameKey:
        typeof n?.givenHanja === "string" && typeof n?.given === "string" ? nameKeyOf(n.givenHanja, n.given) : null,
    };
  });
}

/**
 * @param conditionKey 지금 보는 입력 조건 (namingConditionKey). 알 수 없으면 null
 * @param historyId 마이페이지 저장 이름에서 볼 때 그 저장 id
 */
export async function loadEntitlement(
  supabase: SupabaseClient,
  loggedIn: boolean,
  conditionKey: string | null,
  historyId?: string
): Promise<Entitlement> {
  if (!loggedIn) return NO_ENTITLEMENT;
  const reports = await loadPaidReports(supabase);
  const same = conditionKey ? reports.filter((r) => r.conditionKey === conditionKey) : [];
  const names = new Set(same.map((r) => r.nameKey));
  const linked = !!historyId && reports.some((r) => r.historyId === historyId);
  return {
    saju: same.length > 0 || linked,
    name: (givenHanja, given) => linked || names.has(nameKeyOf(givenHanja, given)),
  };
}
