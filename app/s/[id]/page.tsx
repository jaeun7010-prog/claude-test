import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { BLESSINGS, vocative } from "@/lib/share/blessings";
import { loadNameShare, SHARE_EDIT_PARAM, shareFullHanja, shareFullName, type NameShare } from "@/lib/share/name-share";
import { createAdminClient } from "@/lib/supabase/admin";

import { changeBlessing } from "../actions";

/**
 * 공유용 이름 카드 페이지 (2026-10-25). 이름·뜻·축원만 보여 준다 (생년월일·사주 없음).
 * 받은 사람도 같은 화면을 보고, "우리 아이 이름도 지어 보기"로 첫 화면에 간다.
 * 카드를 만든 사람(?edit=1)에게만 축원 고르기를 보여 준다.
 * 아이 이름이 검색에 걸리지 않게 noindex.
 */

export const dynamic = "force-dynamic";

type Props = { params: { id: string }; searchParams: Record<string, string | string[] | undefined> };

const load = (id: string) => loadNameShare(createAdminClient(), id);

export async function generateMetadata({ params }: Props) {
  const share = await load(params.id);
  const robots = { index: false, follow: false };
  if (!share) return { title: "이름 카드 | 이름핏", robots };
  const hanja = shareFullHanja(share);
  const title = `${shareFullName(share)}${hanja ? `(${hanja})` : ""} 이름 카드`;
  // 카톡·문자 미리보기: 가로 카드 그림 (생년월일·사주 없음)
  const image = { url: `/s/${share.id}/image`, width: 1200, height: 630, alt: title };
  return {
    title: `${title} | 이름핏`,
    description: share.meaning,
    robots,
    openGraph: { type: "website", siteName: "이름핏", title, description: share.blessing, images: [image] },
    twitter: { card: "summary_large_image", title, description: share.blessing, images: [image.url] },
  };
}

/** 카드: 저장·공유하는 세로 그림과 같은 것을 보여 준다 (그림은 image/route.tsx) */
function NameCard({ share }: { share: NameShare }) {
  const hanja = shareFullHanja(share);
  const alt = `${hanja ? `${hanja} ` : ""}${shareFullName(share)}. ${share.meaning}. ${share.blessing}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 서버가 만든 PNG를 그대로 보여 준다 (next/image 최적화 불필요)
    <img
      src={`/s/${share.id}/image?size=story`}
      alt={alt}
      width={1080}
      height={1350}
      className="h-auto w-full rounded-2xl shadow-sm"
    />
  );
}

function BlessingPicker({ share }: { share: NameShare }) {
  const callName = vocative(share.given.slice(share.prefixLength));
  return (
    <form action={changeBlessing} className="rounded-xl border bg-card p-4">
      <input type="hidden" name="id" value={share.id} />
      <p className="mb-3 text-sm font-semibold">축원 한 줄 고르기</p>
      <div className="flex flex-col gap-1.5">
        {BLESSINGS.map((b, i) => {
          const active = i === share.blessingIndex;
          return (
            <button
              key={i}
              type="submit"
              name="b"
              value={i}
              disabled={active}
              className={`rounded-lg border px-3 py-2 text-left text-sm break-keep ${
                active ? "border-navy bg-sand font-semibold" : "hover:bg-sand/60"
              }`}
            >
              {active ? "✓ " : ""}
              {b.replace("{이름}", callName)}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground break-keep">
        축원을 바꾸면 카드 주소도 바뀝니다. 바꾼 뒤의 주소로 공유해 주세요.
      </p>
    </form>
  );
}

export default async function SharePage({ params, searchParams }: Props) {
  const share = await load(params.id);
  if (!share) notFound();
  const editing = searchParams[SHARE_EDIT_PARAM] === "1";
  // 뜻 자리에 문장을 썼으면 훈음 줄을 따로 보여 준다
  const chars = share.meaningChars && share.meaningChars !== share.meaning ? share.meaningChars : null;

  return (
    <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-md px-4 py-8 sm:py-12">
      <NameCard share={share} />

      {(chars || share.meaningNote) && (
        <div className="mt-4 space-y-1 text-center text-xs text-muted-foreground break-keep">
          {chars && <p>{chars}</p>}
          {share.meaningNote && <p>{share.meaningNote}</p>}
        </div>
      )}

      {editing && (
        <div className="mt-6">
          <BlessingPicker share={share} />
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted-foreground break-keep">아이 사주에 맞는 이름을 찾아 드려요.</p>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/">우리 아이 이름도 지어 보기</Link>
        </Button>
      </div>
    </main>
  );
}
