"use server";

import { redirect } from "next/navigation";

import { civilToUtcMs } from "@/lib/saju/calendar";
import { parseNamingParams } from "@/lib/naming/params";
import { analyzeChosen } from "@/lib/naming/service";
import { createClient } from "@/lib/supabase/server";

/** 추천 결과 중 하나를 마이페이지(작명 이력)에 저장. 점수는 서버에서 다시 계산한다. */
export async function saveName(formData: FormData) {
  const qs = String(formData.get("qs") ?? "");
  const givenHanja = String(formData.get("gh") ?? "");
  const givenEum = String(formData.get("ge") ?? "");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/naming/result?${qs}`)}`);

  const parsed = parseNamingParams(Object.fromEntries(new URLSearchParams(qs)));
  if (!parsed.ok) redirect("/naming");
  const p = parsed.value;

  const r = await analyzeChosen(supabase, p, givenHanja, givenEum);
  if (!r) redirect(`/naming/result?${qs}`);

  const { year, month, day, hour, minute } = p.birth;
  const birthDatetime =
    hour !== undefined
      ? new Date(
          civilToUtcMs({ year, month, day, hour, minute: minute ?? 0 }, p.birthplace.timeZone)
        ).toISOString()
      : null;

  const { pillars, yongsin } = r.saju;
  const { error } = await supabase.from("user_naming_history").insert({
    user_id: user.id,
    surname: p.surname,
    surname_hanja: p.surnameHanja,
    birth_datetime: birthDatetime,
    gender: p.gender,
    given_name: givenEum,
    given_name_hanja: givenHanja,
    total_score: r.analysis.totalScore,
    analysis: {
      ...r.analysis,
      saju: {
        pillars: {
          year: pillars.year.hanja,
          month: pillars.month.hanja,
          day: pillars.day.hanja,
          hour: pillars.hour?.hanja ?? null,
        },
        strength: yongsin.strength,
        yongsin: yongsin.yongsin,
        huisin: yongsin.huisin,
        gisin: yongsin.gisin,
        method: yongsin.method,
        geokguk: yongsin.geokguk
          ? { name: yongsin.geokguk.name, status: yongsin.geokguk.status, applied: yongsin.geokguk.applied }
          : null,
        birthDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      },
    },
    filters: {
      length: p.length,
      dolrimja: p.dolrimja,
      globalFriendly: p.globalFriendly,
      neutral: p.neutral,
      rarity: p.rarity,
      lateNight: p.birth.lateNight,
      birthplace: {
        id: p.birthplace.id,
        timeZone: p.birthplace.timeZone,
        longitude: p.birthplace.longitude,
      },
    },
  });
  if (error) redirect(`/naming/result?${qs}&saveError=1`);

  redirect("/mypage");
}
