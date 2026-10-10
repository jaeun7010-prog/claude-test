"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMMON_SURNAMES } from "@/lib/naming/surnames";
import { createClient } from "@/lib/supabase/client";

interface SurnameOption {
  hanja: string;
  /** 한글 훈 (예: 쇠) */
  hun: string | null;
  strokes: number;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NamingForm() {
  const supabase = useMemo(() => createClient(), []);
  const [surname, setSurname] = useState("");
  const [options, setOptions] = useState<SurnameOption[]>([]);
  const [surnameHanja, setSurnameHanja] = useState("");
  const [noTime, setNoTime] = useState(false);
  const [length, setLength] = useState<"any" | "1" | "2">("any");
  const [loadError, setLoadError] = useState(false);

  // 성(한글)이 바뀌면 사전에서 해당 음의 한자 후보를 불러온다 (복성은 글자별 조합)
  useEffect(() => {
    setOptions([]);
    setSurnameHanja("");
    setLoadError(false);
    const s = surname.trim();
    if (!/^[가-힣]{1,2}$/.test(s)) return;

    // 복성: 알려진 조합만 지원하고 기본 한자를 그대로 보여준다
    if (s.length === 2) {
      const h = COMMON_SURNAMES[s];
      if (h) {
        setOptions([{ hanja: h, hun: null, strokes: 0 }]);
        setSurnameHanja(h);
      }
      return;
    }

    let cancelled = false;
    const load = async () => {
      const query = (columns: string) =>
        supabase
          .from("hanja_dict")
          .select(columns)
          .eq("eum", s)
          .eq("is_name_hanja", true)
          .order("stroke_count", { ascending: true })
          .limit(60);
      // hun 컬럼이 아직 없는 DB(42703)는 훈 없이 다시 조회한다
      let res = await query("hanja, stroke_count, hun");
      if (res.error?.code === "42703") res = await query("hanja, stroke_count");
      if (cancelled) return;
      if (res.error) {
        setLoadError(true);
        return;
      }
      const rows = (res.data ?? []) as unknown as {
        hanja: string;
        stroke_count: number;
        hun?: string | null;
      }[];
      const opts = rows.map((r) => ({
        hanja: r.hanja,
        hun: r.hun ?? null,
        strokes: r.stroke_count,
      }));
      setOptions(opts);
      const preferred = COMMON_SURNAMES[s];
      setSurnameHanja(
        preferred && opts.some((o) => o.hanja === preferred) ? preferred : (opts[0]?.hanja ?? "")
      );
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [surname, supabase]);

  return (
    <form action="/naming/result" method="get" className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">성씨</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="surname">성 (한글)</Label>
            <Input
              id="surname"
              name="surname"
              placeholder="예: 김"
              maxLength={2}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sh">성 (한자)</Label>
            <select
              id="sh"
              name="sh"
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
                  {surname.trim()}
                  {o.strokes ? `, ${o.strokes}획` : ""})
                </option>
              ))}
            </select>
            {loadError && (
              <p className="text-xs text-destructive">한자 목록을 불러오지 못했습니다.</p>
            )}
          </div>
        </div>
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
          <Label htmlFor="late">자시(23:00~24:00) 처리</Label>
          <select id="late" name="late" className={selectClass} defaultValue="next-day">
            <option value="next-day">23시부터 다음 날로 계산 (기본)</option>
            <option value="same-day">야자시: 당일로 계산 (23~24시)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            23시 이후 출생이 아니면 결과에 영향이 없습니다. 출생시는 서울(동경 126.98°) 기준 평균
            태양시로 보정하여 계산합니다.
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

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-bold">이름 조건</h2>
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
        </div>
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="glob" value="1" />
          외국에서도 발음하기 쉬운 이름
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="neutral" value="1" />
          남녀 공용 (중성적인 이름만)
        </label>
        <div className="space-y-2">
          <Label htmlFor="rarity">희소성</Label>
          <select id="rarity" name="rarity" className={selectClass} defaultValue="any">
            <option value="any">상관없음</option>
            <option value="rare">희소한 이름 우선 (동명이인이 적은 이름)</option>
            <option value="common">익숙한 이름 우선</option>
          </select>
        </div>
      </section>

      <Button type="submit" size="lg" className="w-full">
        이름 추천받기
      </Button>
    </form>
  );
}
