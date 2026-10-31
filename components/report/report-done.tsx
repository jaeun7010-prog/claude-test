import Link from "next/link";

import { NameWithHanja } from "@/components/brand/NameWithHanja";
import { PebbleFrame } from "@/components/brand/PebbleFrame";
import { ShareNameButton } from "@/components/share/share-name-button";
import { Button } from "@/components/ui/button";
import type { ReportSnapshot } from "@/lib/commerce/report-snapshot";

/** 리포트 결제 완료 화면 (이름은 주문에 고정된 스냅숏에서 읽는다) */
export function ReportDone({ orderId, snapshot }: { orderId: string; snapshot: ReportSnapshot }) {
  const given = snapshot.given.map((c) => c.eum).join("");
  const givenHanja = snapshot.given.map((c) => c.hanja).join("");
  // 글자 풀이(texts.hanja)는 새로 고르는 글자만 담으므로, 나머지가 함께 쓰는 부모 성 글자다 (예전 스냅숏에는 없어 0으로 둔다)
  const prefixLength = snapshot.texts.hanja ? snapshot.given.length - snapshot.texts.hanja.length : 0;
  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-md space-y-6 px-4 py-8 sm:py-12">
      <PebbleFrame className="px-3 py-5" cardClassName="flex flex-col items-center gap-2 px-4 py-7 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <NameWithHanja name={`${snapshot.surname}${given}`} hanja={`${snapshot.surnameHanja}${givenHanja}`} nameSize={34} hanjaSize={15} />
      </PebbleFrame>

      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-extrabold">리포트가 준비됐어요</h1>
        <p className="text-[15px] text-ink-soft break-keep">마이페이지에 보관돼서 언제든 다시 받을 수 있어요.</p>
      </div>

      <div className="space-y-2">
        <Button asChild size="lg" className="w-full">
          <Link href={`/report/${orderId}?download=1`}>PDF 받기</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href={`/report/${orderId}`}>리포트 보기</Link>
        </Button>
      </div>

      <div className="space-y-2.5">
        <h2 className="text-[15px] font-extrabold">이제 이렇게 써 보세요</h2>
        <div className="space-y-1.5 rounded-2xl border bg-card p-4">
          <p className="font-bold">가족에게 이름 보내기</p>
          <p className="text-sm text-muted-foreground">이름과 뜻만 보내요 · 생년월일은 빠져요</p>
          <ShareNameButton
            label="이름 카드 만들기"
            className="mt-1 w-full"
            input={{ kind: "hanja", surname: snapshot.surname, surnameHanja: snapshot.surnameHanja, given, givenHanja, prefixLength }}
          />
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="font-bold text-muted-foreground">돌·백일 이름 카드 만들기</p>
          <p className="text-sm text-muted-foreground">준비 중이에요</p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">결제 내역은 마이페이지에 있어요</p>
    </main>
  );
}
