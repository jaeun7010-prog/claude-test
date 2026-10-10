import type { Element } from "@/lib/naming/types";

/** 서버(주문 생성 시 금액 계산)와 클라이언트(표시)가 함께 쓰는 상품 카탈로그. 금액은 항상 서버에서 다시 계산한다. */

export const ELEMENTS: readonly Element[] = ["목", "화", "토", "금", "수"];

export const REPORT_PRICE = 9_900;

export const PRODUCTS = {
  bib: { label: "자수 턱받이", description: "순면 거즈 턱받이에 이름과 행운 동물을 수놓습니다.", price: 29_000 },
  handkerchief: { label: "자수 손수건", description: "부드러운 순면 손수건 한 장에 이름을 수놓습니다.", price: 15_000 },
} as const;
export type ProductId = keyof typeof PRODUCTS;
export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];

/** 상품 금액에 얹는 행운 동물 자수 추가 금액 */
export const ANIMAL_EMBROIDERY_PRICE = 3_000;
export const MAX_QUANTITY = 5;
export const MAX_EMBROIDERY_LENGTH = 10;

export const ELEMENT_LUCKY: Record<Element, { animal: string; color: string; hex: string; meaning: string }> = {
  목: { animal: "토끼", color: "초록", hex: "#5f8f5a", meaning: "싱그럽게 자라나는 성장의 기운" },
  화: { animal: "공작", color: "다홍", hex: "#c8553d", meaning: "밝고 따뜻하게 퍼지는 활력의 기운" },
  토: { animal: "곰", color: "황토", hex: "#c49a4a", meaning: "든든하게 감싸 주는 안정의 기운" },
  금: { animal: "백호", color: "아이보리 골드", hex: "#d6c28f", meaning: "맑고 단단하게 맺히는 결단의 기운" },
  수: { animal: "거북", color: "남색", hex: "#34507a", meaning: "깊고 유연하게 흐르는 지혜의 기운" },
};

/** 사주에서 가장 부족한 오행. 동점이면 용신을 우선하고, 그래도 같으면 목화토금수 순서. */
export function lackingElement(scores: Record<Element, number>, yongsin: Element): Element {
  const min = Math.min(...ELEMENTS.map((e) => scores[e]));
  const tied = ELEMENTS.filter((e) => scores[e] === min);
  return tied.includes(yongsin) ? yongsin : tied[0];
}

export interface ShippingInput {
  recipientName: string;
  phone: string;
  zipcode: string;
  address: string;
  addressDetail: string;
  memo: string;
}

interface NameRef {
  /** 작명 입력 쿼리스트링 (사주 재계산용) */
  qs: string;
  /** 이름 한자 / 한글 음 */
  gh: string;
  ge: string;
}

export type CheckoutInput =
  | ({ kind: "report" } & NameRef)
  | ({
      kind: "goods";
      product: ProductId;
      quantity: number;
      embroideryText: string;
      thread: Element;
      withAnimal: boolean;
      shipping: ShippingInput;
    } & NameRef);

export function goodsUnitPrice(product: ProductId, withAnimal: boolean) {
  return PRODUCTS[product].price + (withAnimal ? ANIMAL_EMBROIDERY_PRICE : 0);
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
