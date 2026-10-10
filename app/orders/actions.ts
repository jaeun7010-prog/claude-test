"use server";

import { parseNamingParams } from "@/lib/naming/params";
import { analyzeChosen } from "@/lib/naming/service";
import {
  ANIMAL_EMBROIDERY_PRICE,
  ELEMENT_LUCKY,
  ELEMENTS,
  MAX_EMBROIDERY_LENGTH,
  MAX_QUANTITY,
  PRODUCTS,
  PRODUCT_IDS,
  REPORT_PRICE,
  goodsUnitPrice,
  lackingElement,
  type CheckoutInput,
  type ShippingInput,
} from "@/lib/commerce/catalog";
import { isUuid, paymentIdOf, syncOrderPayment } from "@/lib/commerce/payment-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Customer = { fullName?: string; phoneNumber?: string; email?: string };

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      paymentId: string;
      orderName: string;
      amount: number;
      customer: Customer;
    }
  | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

const EMBROIDERY = /^[가-힣\p{Script=Han}A-Za-z0-9 ]+$/u;
const PHONE = /^01\d-?\d{3,4}-?\d{4}$/;

/**
 * 결제 전 주문 생성. 금액/오행은 클라이언트 값을 믿지 않고 서버에서 다시 계산하며,
 * RLS 정책(pending 상태 + payment_id 없음)에 맞춰 사용자 세션으로 삽입한다.
 */
export async function createOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(String(input.qs ?? ""))));
  if (!parsed.ok) return fail("작명 정보를 확인할 수 없습니다. 처음부터 다시 시도해 주세요.");
  const gh = String(input.gh ?? "");
  const ge = String(input.ge ?? "");
  if (!gh || !ge) return fail("이름 정보가 올바르지 않습니다.");

  const chosen = await analyzeChosen(supabase, parsed.value, gh, ge);
  if (!chosen) return fail("이름 정보를 확인할 수 없습니다.");
  const { surname, surnameHanja } = parsed.value;
  const fullName = `${surname}${ge}`;
  const fullHanja = `${surnameHanja}${gh}`;
  const { yongsin } = chosen.saju;
  const lacking = lackingElement(yongsin.scores, yongsin.yongsin);

  const base = { name: { surname, given: ge, surnameHanja, givenHanja: gh }, qs: input.qs };

  let row: Record<string, unknown>;
  let customer: Customer = { email: user.email ?? undefined };

  if (input.kind === "report") {
    row = {
      order_type: "premium_report",
      item_name: `이름핏 프리미엄 리포트 - ${fullName}(${fullHanja})`,
      item_options: base,
      quantity: 1,
      amount: REPORT_PRICE,
    };
  } else if (input.kind === "goods") {
    if (!PRODUCT_IDS.includes(input.product)) return fail("알 수 없는 상품입니다.");
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QUANTITY)
      return fail(`수량은 1~${MAX_QUANTITY}개까지 선택할 수 있습니다.`);
    const text = String(input.embroideryText ?? "").trim();
    if (!text || [...text].length > MAX_EMBROIDERY_LENGTH || !EMBROIDERY.test(text))
      return fail(`자수 문구는 한글·한자·영문·숫자 ${MAX_EMBROIDERY_LENGTH}자 이내로 입력해 주세요.`);
    if (!ELEMENTS.includes(input.thread)) return fail("자수 실 색상을 선택해 주세요.");

    const s: Partial<ShippingInput> = input.shipping ?? {};
    const recipientName = String(s.recipientName ?? "").trim();
    const phone = String(s.phone ?? "").trim();
    const zipcode = String(s.zipcode ?? "").trim();
    const address = String(s.address ?? "").trim();
    const addressDetail = String(s.addressDetail ?? "").trim();
    const memo = String(s.memo ?? "").trim();
    if (recipientName.length < 2 || recipientName.length > 20) return fail("받는 분 이름을 입력해 주세요.");
    if (!PHONE.test(phone)) return fail("휴대폰 번호를 올바르게 입력해 주세요. (예: 010-1234-5678)");
    if (!/^\d{5}$/.test(zipcode)) return fail("우편번호 5자리를 입력해 주세요.");
    if (address.length < 5 || address.length > 200) return fail("주소를 입력해 주세요.");
    if (addressDetail.length > 100 || memo.length > 100)
      return fail("상세주소·배송 메모는 100자 이내로 입력해 주세요.");

    const withAnimal = !!input.withAnimal;
    const unit = goodsUnitPrice(input.product, withAnimal);
    const product = PRODUCTS[input.product];
    const phoneDigits = phone.replace(/-/g, "");
    row = {
      order_type: "goods",
      item_name: `이름핏 ${product.label} - ${fullName}`,
      item_options: {
        ...base,
        product: input.product,
        embroideryText: text,
        thread: input.thread,
        threadColor: ELEMENT_LUCKY[input.thread].color,
        withAnimal,
        animal: ELEMENT_LUCKY[lacking].animal,
        lackingElement: lacking,
        unitPrice: unit,
        animalPrice: withAnimal ? ANIMAL_EMBROIDERY_PRICE : 0,
      },
      quantity: input.quantity,
      amount: unit * input.quantity,
      recipient_name: recipientName,
      recipient_phone: phoneDigits,
      zipcode,
      address,
      address_detail: addressDetail || null,
      delivery_memo: memo || null,
    };
    customer = { fullName: recipientName, phoneNumber: phoneDigits, email: user.email ?? undefined };
  } else {
    return fail("알 수 없는 주문 유형입니다.");
  }

  const { data, error } = await supabase
    .from("orders")
    .insert({ ...row, user_id: user.id, status: "pending" })
    .select("id, amount, item_name")
    .single();
  if (error || !data) {
    console.error("[orders] 주문 생성 실패", error);
    return fail("주문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return {
    ok: true,
    orderId: data.id,
    paymentId: paymentIdOf(data.id),
    orderName: data.item_name,
    amount: data.amount,
    customer,
  };
}

export type ConfirmResult = { ok: true; status: string } | { ok: false; error: string };

/**
 * 결제 직후 호출(웹훅의 빠른 경로). 본인 주문인지 확인한 뒤 포트원 서버에서 결제 건을 직접 조회해
 * 검증하고 orders 를 갱신한다. 웹훅과 같은 로직(syncOrderPayment)이라 둘 중 무엇이 먼저 와도 결과가 같다.
 */
export async function confirmPayment(orderId: string): Promise<ConfirmResult> {
  if (!isUuid(orderId)) return fail("올바르지 않은 주문입니다.");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.");

  // RLS 로 본인 주문만 조회된다
  const { data: order } = await supabase.from("orders").select("id, status").eq("id", orderId).maybeSingle();
  if (!order) return fail("주문을 찾을 수 없습니다.");
  if (order.status !== "pending") return { ok: true, status: order.status };

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[orders] admin 클라이언트 생성 실패", e);
    return fail("결제 반영 설정(SUPABASE_SERVICE_ROLE_KEY)이 누락되었습니다.");
  }

  const r = await syncOrderPayment(admin, order.id);
  if (!r.ok) return fail(r.error);
  if (r.status === "pending") return fail("결제가 완료되지 않았습니다.");
  return { ok: true, status: r.status };
}
