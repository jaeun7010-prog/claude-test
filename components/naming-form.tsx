"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NATIVE_SINGLE_SHORTAGE_NOTICE } from "@/lib/naming/native/length";
import { SELF_MAX_LENGTH } from "@/lib/naming/self-rank";
import { COMMON_SURNAMES, COMPOUND_SURNAMES } from "@/lib/naming/surnames";
import {
  BIRTHPLACES,
  CUSTOM_BIRTHPLACE_ID,
  DEFAULT_BIRTHPLACE_ID,
} from "@/lib/saju/birthplaces";
import { createClient } from "@/lib/supabase/client";

interface SurnameOption {
  hanja: string;
  /** 한글 훈 (예: 쇠) */
  hun: string | null;
  strokes: number;
  /** 복성의 글자별 획수 (예: 南9 + 宮10) */
  detail?: string;
}

type NameKind = "hanja" | "native";

/** 이름 종류. 고른 쪽 탭이 결과 화면에서 먼저 열린다 (순우리말이면 tab=native, 다른 탭도 그대로 볼 수 있다) */
const NAME_KINDS: { value: NameKind; label: string; hint: string }[] = [
  { value: "hanja", label: "한자 이름", hint: "사주와 성명학으로 한자를 골라요" },
  { value: "native", label: "순우리말 이름", hint: "뜻이 고운 우리말 이름을 골라요" },
];

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * 성(한글) 입력 + 한자 선택. 한글 성이 바뀌면 사전에서 해당 음의 한자 후보를 불러온다.
 * 복성은 알려진 조합(COMMON_SURNAMES)만 지원하고, 글자별 획수를 함께 보여 준다.
 */
function SurnameFields({
  label,
  hangulName,
  hanjaName,
  placeholder,
}: {
  label: string;
  /** 폼 필드 이름 (URL 파라미터) */
  hangulName: string;
  hanjaName: string;
  placeholder: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [surname, setSurname] = useState("");
  const [options, setOptions] = useState<SurnameOption[]>([]);
  const [surnameHanja, setSurnameHanja] = useState("");
  const [loadError, setLoadError] = useState(false);
  const s = surname.trim();
  const unknownCompound = /^[가-힣]{2}$/.test(s) && !COMPOUND_SURNAMES.includes(s);

  useEffect(() => {
    setOptions([]);
    setSurnameHanja("");
    setLoadError(false);
    if (!/^[가-힣]{1,2}$/.test(s)) return;

    let cancelled = false;

    // 복성: 기본 한자 조합 하나를 보여 주고, 글자별 획수를 사전에서 읽어 붙인다
    if (s.length === 2) {
      const h = COMMON_SURNAMES[s];
      if (!h || !COMPOUND_SURNAMES.includes(s)) return;
      setOptions([{ hanja: h, hun: null, strokes: 0 }]);
      setSurnameHanja(h);
      void (async () => {
        const res = await supabase
          .from("hanja_dict")
          .select("hanja, eum, stroke_count")
          .in("hanja", [...h])
          .in("eum", [...s]);
        if (cancelled || res.error) return;
        const rows = (res.data ?? []) as { hanja: string; eum: string; stroke_count: number }[];
        const chars = [...h].map((c, i) => rows.find((r) => r.hanja === c && r.eum === s[i]));
        if (chars.some((r) => !r)) return;
        setOptions([
          {
            hanja: h,
            hun: null,
            strokes: chars.reduce((n, r) => n + r!.stroke_count, 0),
            detail: chars.map((r) => `${r!.hanja}${r!.stroke_count}`).join(" + "),
          },
        ]);
      })();
      return () => {
        cancelled = true;
      };
    }

    // 기본 한자(COMMON_SURNAMES)는 따로 불러와 맨 앞에 두고 기본값으로 고른다. 획수순 60개 안에 없을 수 있어서다
    // (鄭은 정 86자 중 85번째라 목록에 없었고, 정씨가 丁으로 들어갔다)
    const preferred = COMMON_SURNAMES[s];
    const load = async () => {
      const query = (columns: string, hanja?: string) => {
        const q = supabase.from("hanja_dict").select(columns).eq("eum", s);
        return hanja
          ? q.eq("hanja", hanja).limit(1)
          : q.eq("is_name_hanja", true).order("stroke_count", { ascending: true }).limit(60);
      };
      // hun 컬럼이 아직 없는 DB(42703)는 훈 없이 다시 조회한다
      const run = async (hanja?: string) => {
        const res = await query("hanja, stroke_count, hun", hanja);
        return res.error?.code === "42703" ? query("hanja, stroke_count", hanja) : res;
      };
      const [res, pref] = await Promise.all([run(), preferred ? run(preferred) : null]);
      if (cancelled) return;
      if (res.error) {
        setLoadError(true);
        return;
      }
      type Row = { hanja: string; stroke_count: number; hun?: string | null };
      const rows = [...((pref?.data ?? []) as unknown as Row[]), ...((res.data ?? []) as unknown as Row[])];
      const seen = new Set<string>();
      const opts = rows
        .filter((r) => !seen.has(r.hanja) && seen.add(r.hanja))
        .map((r) => ({
          hanja: r.hanja,
          hun: r.hun ?? null,
          strokes: r.stroke_count,
        }));
      setOptions(opts);
      setSurnameHanja(opts[0]?.hanja ?? "");
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [s, supabase]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={hangulName}>{label} (한글)</Label>
        <Input
          id={hangulName}
          name={hangulName}
          placeholder={placeholder}
          maxLength={2}
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          required
        />
        {unknownCompound && (
          <p className="text-xs text-destructive">
            지원하는 복성은 {COMPOUND_SURNAMES.join("·")}입니다. 두 부모의 성을 함께 쓰려면 아래 &lsquo;부모 성
            함께 쓰기&rsquo;를 선택해 주세요.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={hanjaName}>{label} (한자)</Label>
        <select
          id={hanjaName}
          name={hanjaName}
          className={selectClass}
          value={surnameHanja}
          onChange={(e) => setSurnameHanja(e.target.value)}
          required
          disabled={options.length === 0}
        >
          {options.length === 0 && <option value="">성을 먼저 입력하세요</option>}
          {options.map((o) => (
            <option key={o.hanja} value={o.hanja}>
              {o.hanja} ({o.hun ? `${o.hun} ` : ""}
              {s}
              {o.detail ? `, ${o.detail} = ${o.strokes}획` : o.strokes ? `, ${o.strokes}획` : ""})
            </option>
          ))}
        </select>
        {loadError && <p className="text-xs text-destructive">한자 목록을 불러오지 못했습니다.</p>}
      </div>
    </div>
  );
}

/**
 * 작명 입력 폼. `self`(직접 짓기)는 이름 조건 대신 부모가 정한 한글 이름을 받아 /naming/self로 보낸다
 */
export function NamingForm({ mode = "recommend" }: { mode?: "recommend" | "self" }) {
  const self = mode === "self";
  const [noTime, setNoTime] = useState(false);
  const [place, setPlace] = useState(DEFAULT_BIRTHPLACE_ID);
  const [length, setLength] = useState<"any" | "1" | "2">("any");
  const [withParent, setWithParent] = useState(false);
  const [kind, setKind] = useState<NameKind>("hanja");

  // 기타 해외 출생: 브라우저가 아는 IANA 시간대 목록 (선택했을 때만 렌더링)
  const timeZones = useMemo(
    () => (place === CUSTOM_BIRTHPLACE_ID ? Intl.supportedValuesOf("timeZone") : []),
    [place]
  );

  return (
    <form action={self ? "/naming/self" : "/naming/result"} method="get" className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">성씨</h2>
        <SurnameFields label="성" hangulName="surname" hanjaName="sh" placeholder="예: 김, 남궁" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withParent} onChange={(e) => setWithParent(e.target.checked)} />
          부모 성 함께 쓰기 (예: 김박서윤)
        </label>
        {withParent && (
          <div className="space-y-3 rounded-md border p-4">
            <SurnameFields label="함께 쓸 부모 성" hangulName="ps" hanjaName="psh" placeholder="예: 박" />
            <p className="text-xs text-muted-foreground">
              출생신고에는 성을 하나만 등록할 수 있어, 함께 쓰는 부모 성은 이름의 첫 부분으로 등록됩니다
              (김박서윤 → 성 김, 이름 박서윤). 이름 등급과 아래 이름 글자 수·돌림자는 새로 고르는 부분(서윤)
              기준이고, 성과 부모 성 조합의 약점은 결과 화면의 조합 진단에서 따로 알려 드립니다.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">출생 정보</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">생년월일 (양력)</Label>
            <Input id="date" name="date" type="date" min="1901-01-01" max="2099-12-31" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">태어난 시각</Label>
            <Input id="time" name="time" type="time" disabled={noTime} required={!noTime} />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={noTime}
                onChange={(e) => setNoTime(e.target.checked)}
              />
              태어난 시각을 모릅니다
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="place">태어난 곳</Label>
          <select
            id="place"
            name="place"
            className={selectClass}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          >
            {(["국내", "해외"] as const).map((group) => (
              <optgroup key={group} label={group}>
                {BIRTHPLACES.filter((b) => b.group === group).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
                {group === "해외" && (
                  <option value={CUSTOM_BIRTHPLACE_ID}>기타 (시간대·경도 직접 입력)</option>
                )}
              </optgroup>
            ))}
          </select>
          {place === CUSTOM_BIRTHPLACE_ID && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tz">시간대</Label>
                <select id="tz" name="tz" className={selectClass} required defaultValue="">
                  <option value="" disabled>
                    시간대를 고르세요
                  </option>
                  {timeZones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lon">경도 (동경 +, 서경 −)</Label>
                <Input
                  id="lon"
                  name="lon"
                  type="number"
                  step="0.001"
                  min={-180}
                  max={180}
                  placeholder="예: -73.94"
                  required
                />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            태어난 곳의 경도로 해의 실제 위치에 맞춰 출생 시각을 보정합니다. 시·도까지만 고르면 됩니다.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="late">자시(23:00~24:00) 처리</Label>
          <select id="late" name="late" className={selectClass} defaultValue="next-day">
            <option value="next-day">23시부터 다음 날로 계산 (기본)</option>
            <option value="same-day">야자시: 당일로 계산 (23~24시)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            23시 이후 출생이 아니면 결과에 영향이 없습니다.
          </p>
        </div>
        <div className="space-y-2">
          <Label>성별</Label>
          <div className="flex gap-4 text-sm">
            {[
              ["male", "남아"],
              ["female", "여아"],
              ["neutral", "성별 상관없음 (미정)"],
            ].map(([v, label]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="gender" value={v} defaultChecked={v === "neutral"} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {self ? (
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold">정한 이름</h2>
          <div className="space-y-2">
            <Label htmlFor="given">이름 (한글)</Label>
            <Input
              id="given"
              name="given"
              placeholder="예: 서윤"
              maxLength={SELF_MAX_LENGTH}
              pattern={`[가-힣]{1,${SELF_MAX_LENGTH}}`}
              title={`한글 1~${SELF_MAX_LENGTH}자`}
              required
            />
            <p className="text-xs text-muted-foreground break-keep">
              {withParent ? "성과 함께 쓰는 부모 성을 뺀" : "성을 뺀"} 이름을 한글 1~{SELF_MAX_LENGTH}자로 적어 주세요.
              글자마다 쓸 수 있는 한자와 사주에 맞는 조합 점수를 보여 드려요.
            </p>
          </div>
        </section>
      ) : (
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">이름 조건</h2>
        <div className="space-y-2">
          <Label id="kind-label">이름 종류</Label>
          <div role="radiogroup" aria-labelledby="kind-label" className="grid grid-cols-2 gap-2 sm:gap-3">
            {NAME_KINDS.map((k) => {
              const active = kind === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(k.value)}
                  className={`min-w-0 rounded-md border-2 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-primary bg-secondary" : "border-input hover:bg-secondary/50"
                  }`}
                >
                  <span className="block text-sm font-semibold sm:text-base">{k.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground break-keep">{k.hint}</span>
                </button>
              );
            })}
          </div>
          {/* 한자 이름은 예전 주소와 같게 tab을 넣지 않는다 */}
          {kind === "native" && <input type="hidden" name="tab" value="native" />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="len">이름 글자 수</Label>
          <select
            id="len"
            name="len"
            className={selectClass}
            value={length}
            onChange={(e) => setLength(e.target.value as "any" | "1" | "2")}
          >
            <option value="any">상관없음</option>
            <option value="2">두 글자 이름</option>
            <option value="1">외자 이름</option>
          </select>
          {kind === "native" && length === "1" && (
            <p className="text-xs text-muted-foreground">{NATIVE_SINGLE_SHORTAGE_NOTICE}</p>
          )}
        </div>
        {kind === "native" ? (
          <p className="text-xs text-muted-foreground">돌림자는 한자 이름에만 적용돼요</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dol">돌림자 (선택)</Label>
              <Input
                id="dol"
                name="dol"
                placeholder="예: 준"
                maxLength={1}
                disabled={length === "1"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dolpos">돌림자 위치</Label>
              <select
                id="dolpos"
                name="dolpos"
                className={selectClass}
                defaultValue="1"
                disabled={length === "1"}
              >
                <option value="1">이름의 첫째 글자</option>
                <option value="2">이름의 둘째 글자</option>
              </select>
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="glob" value="1" />
          글로벌 발음 친화 이름만 보기
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="neutral" value="1" />
          남녀 공용 (중성적인 이름만)
        </label>
        <p className="text-xs text-muted-foreground">
          희귀한 이름·인기 이름 순서와 우리 집 우선순위는 결과 화면에서 바로 고를 수 있습니다.
        </p>
      </section>
      )}

      <Button type="submit" size="lg" className="w-full">
        {self ? "한자 고르기" : "이름 추천받기"}
      </Button>
    </form>
  );
}
