import * as PortOne from "@portone/browser-sdk/v2";

// 브라우저(클라이언트 컴포넌트)에서만 호출할 것.
export async function requestPayment(params: {
  orderName: string;
  totalAmount: number;
  paymentId: string;
  /** 모바일 등 리다이렉트 결제 후 돌아올 주소 */
  redirectUrl: string;
  customer?: { fullName?: string; phoneNumber?: string; email?: string };
}) {
  return PortOne.requestPayment({
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
    channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
    paymentId: params.paymentId,
    orderName: params.orderName,
    totalAmount: params.totalAmount,
    currency: "CURRENCY_KRW",
    payMethod: "CARD",
    redirectUrl: params.redirectUrl,
    customer: params.customer,
  });
}
