"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/modal";
import { useCheckout } from "@/components/use-checkout";
import {
  ANIMAL_EMBROIDERY_PRICE,
  ELEMENTS,
  ELEMENT_LUCKY,
  MAX_EMBROIDERY_LENGTH,
  MAX_QUANTITY,
  PRODUCTS,
  goodsUnitPrice,
  won,
  type ProductId,
  type ShippingInput,
} from "@/lib/commerce/catalog";
import type { Element } from "@/lib/naming/types";

const EMPTY_SHIPPING: ShippingInput = {
  recipientName: "",
  phone: "",
  zipcode: "",
  address: "",
  addressDetail: "",
  memo: "",
};

export function GoodsCard({
  product,
  lacking,
  defaultText,
  qs,
  gh,
  ge,
  hid,
  loggedIn,
  loginHref,
}: {
  product: ProductId;
  /** 사주에서 가장 부족한 오행 → 행운 동물/색상의 기준 */
  lacking: Element;
  defaultText: string;
  qs: string;
  gh: string;
  ge: string;
  hid?: string;
  loggedIn: boolean;
  loginHref: string;
}) {
  const info = PRODUCTS[product];
  const lucky = ELEMENT_LUCKY[lacking];

  const [text, setText] = useState(defaultText);
  const [thread, setThread] = useState<Element>(lacking);
  const [withAnimal, setWithAnimal] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [shipping, setShipping] = useState<ShippingInput>(EMPTY_SHIPPING);
  const [open, setOpen] = useState(false);
  const { pay, busy, error, clearError } = useCheckout();

  const total = goodsUnitPrice(product, withAnimal) * quantity;
  const textValid = text.trim().length > 0 && [...text.trim()].length <= MAX_EMBROIDERY_LENGTH;
  const setShip = (k: keyof ShippingInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setShipping((s) => ({ ...s, [k]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{info.label}</CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 자수 미리보기 */}
        <div
          className="flex flex-col items-center gap-1 rounded-md bg-secondary py-6"
          aria-label="자수 미리보기"
        >
          {withAnimal && (
            <span className="text-xs font-medium" style={{ color: ELEMENT_LUCKY[thread].hex }}>
              ✦ {lucky.animal} ✦
            </span>
          )}
          <span
            className="font-serif text-2xl font-bold"
            style={{ color: ELEMENT_LUCKY[thread].hex }}
          >
            {text.trim() || "자수 문구"}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          사주에 부족한 <b className="text-foreground">{lacking}</b> 기운을 채우는 행운 동물{" "}
          <b className="text-foreground">{lucky.animal}</b>과 행운 색상{" "}
          <b className="text-foreground">{lucky.color}</b>을 담았어요. {lucky.meaning}.
        </p>

        <div className="space-y-2">
          <Label htmlFor={`${product}-text`}>자수 문구 (최대 {MAX_EMBROIDERY_LENGTH}자)</Label>
          <Input
            id={`${product}-text`}
            value={text}
            maxLength={MAX_EMBROIDERY_LENGTH}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">자수 실 색상</legend>
          <div className="flex flex-wrap gap-2">
            {ELEMENTS.map((el) => (
              <label
                key={el}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary"
              >
                <input
                  type="radio"
                  name={`${product}-thread`}
                  className="sr-only"
                  checked={thread === el}
                  onChange={() => setThread(el)}
                />
                <span
                  className="size-3 rounded-full border"
                  style={{ backgroundColor: ELEMENT_LUCKY[el].hex }}
                />
                {ELEMENT_LUCKY[el].color}
                {el === lacking && <span className="text-xs text-muted-foreground">추천</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withAnimal}
            onChange={(e) => setWithAnimal(e.target.checked)}
          />
          행운 동물({lucky.animal}) 자수 추가 (+{won(ANIMAL_EMBROIDERY_PRICE)})
        </label>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor={`${product}-qty`}>수량</Label>
            <Input
              id={`${product}-qty`}
              type="number"
              min={1}
              max={MAX_QUANTITY}
              value={quantity}
              className="w-20"
              onChange={(e) =>
                setQuantity(Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(e.target.value) || 1))))
              }
            />
          </div>
          <p className="text-lg font-bold">{won(total)}</p>
        </div>

        {loggedIn ? (
          <Button className="w-full" disabled={!textValid} onClick={() => setOpen(true)}>
            주문하기
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={loginHref}>로그인하고 주문하기</Link>
          </Button>
        )}
      </CardContent>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          clearError();
        }}
        title={`${info.label} 주문`}
      >
        <dl className="space-y-1 rounded-md bg-secondary p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">자수</dt>
            <dd className="font-serif">{text.trim()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">옵션</dt>
            <dd>
              {ELEMENT_LUCKY[thread].color} 실{withAnimal ? ` · ${lucky.animal} 자수` : ""} · {quantity}개
            </dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>결제 금액</dt>
            <dd>{won(total)}</dd>
          </div>
        </dl>

        <div className="space-y-3">
          <p className="text-sm font-medium">배송 정보</p>
          <Field id="rn" label="받는 분" value={shipping.recipientName} onChange={setShip("recipientName")} />
          <Field id="ph" label="휴대폰 번호" placeholder="010-1234-5678" inputMode="tel" value={shipping.phone} onChange={setShip("phone")} />
          <Field id="zp" label="우편번호" placeholder="5자리" inputMode="numeric" maxLength={5} value={shipping.zipcode} onChange={setShip("zipcode")} />
          <Field id="ad" label="주소" value={shipping.address} onChange={setShip("address")} />
          <Field id="ad2" label="상세주소" value={shipping.addressDetail} onChange={setShip("addressDetail")} />
          <Field id="mm" label="배송 메모" value={shipping.memo} onChange={setShip("memo")} />
        </div>

        <p className="text-xs text-muted-foreground">
          자수 상품은 주문 제작이라 제작 시작 후에는 교환·환불이 어렵습니다.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            닫기
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              pay({
                kind: "goods",
                qs,
                gh,
                ge,
                hid,
                product,
                quantity,
                embroideryText: text,
                thread,
                withAnimal,
                shipping,
              })
            }
          >
            {busy ? "결제 진행 중…" : `${won(total)} 결제`}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}
