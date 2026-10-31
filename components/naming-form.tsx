"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";

import { openNamingResult, openSelfPicker } from "@/app/naming/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NamingWaiting } from "@/components/naming/naming-waiting";
import { NATIVE_SINGLE_SHORTAGE_NOTICE } from "@/lib/naming/native/length";
import { SELF_MAX_LENGTH } from "@/lib/naming/self-rank";
import { surnameLabel, surnameOptions } from "@/lib/naming/surname-hanja";
import { COMPOUND_SURNAMES } from "@/lib/naming/surnames";
import {
  BIRTHPLACES,
  CUSTOM_BIRTHPLACE_ID,
  DEFAULT_BIRTHPLACE_ID,
} from "@/lib/saju/birthplaces";

type NameKind = "hanja" | "native";

/** 이름 종류. 고른 쪽 탭이 결과 화면에서 먼저 열린다 (순우리말이면 tab=native, 다른 탭도 그대로 볼 수 있다) */
const NAME_KINDS: { value: NameKind; label: string; hint: string }[] = [
  { value: "hanja", label: "한자 이름", hint: "사주와 성명학으로 한자를 골라요" },
  { value: "native", label: "순우리말 이름", hint: "뜻이 고운 우리말 이름을 골라요" },
];

const selectClass =
  "flex h-[52px] w-full rounded-md border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const inputClass = "h-[52px]";
const checkClass = "h-5 w-5 shrink-0 accent-primary";
const checkLabelClass = "flex min-h-11 items-center gap-2.5 text-[15px]";

const GENDERS = [
  ["male", "남자아이"],
  ["female", "여자아이"],
  ["neutral", "성별 상관없음 (미정)"],
] as const;

/** 위쪽 진행 막대 (완료 = 바다색, 지금 = 하늘색) */
function StepBar({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="space-y-2">
      <div role="img" aria-label={`3단계 중 ${step + 1}단계`} className="flex gap-1.5">
        {labels.map((l, i) => (
          <span key={l} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-primary" : i === step ? "bg-sky" : "bg-line"}`} />
        ))}
      </div>
      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
        {labels.map((l, i) => (
          <span key={l} className={i < step ? "font-bold text-primary" : i === step ? "font-bold text-foreground" : ""}>
            {l}
            {i < step && " 완료"}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 이미 넣은 정보 한 줄 + 고치기 */
function DoneRow({ text, onEdit }: { text: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border bg-card py-1 pl-3.5 pr-1.5">
      <span className="min-w-0 text-[15px] break-keep">{text}</span>
      <button type="button" onClick={onEdit} className="h-11 shrink-0 rounded-xl px-2 text-sm font-bold text-primary hover:bg-secondary">
        고치기
      </button>
    </div>
  );
}

/**
 * 성(한글) 입력 + 한자 선택. 후보는 통계청 2015 성씨별 인구로 만든 성씨 표(surname-hanja.ts)만 쓰고 사전은 조회하지 않는다.
 * 인구 1위를 기본으로 고르고, 목록은 접기 없이 인구 많은 순 (인구수는 보여 주지 않는다).
 * 두음법칙 성씨는 두 소리 모두에서 같은 후보가 나온다 (류·유, 림·임, 라·나)
 */
function SurnameFields({
  label,
  hangulName,
  hanjaName,
  placeholder,
  initial = "",
}: {
  label: string;
  /** 폼 필드 이름 (URL 파라미터) */
  hangulName: string;
  hanjaName: string;
  placeholder: string;
  initial?: string;
}) {
  const [surname, setSurname] = useState(initial);
  const [surnameHanja, setSurnameHanja] = useState("");
  const s = surname.trim();
  const valid = /^[가-힣]{1,2}$/.test(s) && (s.length === 1 || COMPOUND_SURNAMES.includes(s));
  const unknownCompound = /^[가-힣]{2}$/.test(s) && !COMPOUND_SURNAMES.includes(s);
  const options = useMemo(() => (valid ? surnameOptions(s) : []), [s, valid]);
  const unknown = valid && options.length === 0;

  // 소리가 바뀌면 인구 1위를 기본으로 고른다
  useEffect(() => {
    setSurnameHanja(options[0]?.hanja ?? "");
  }, [options]);

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
          className={inputClass}
          onChange={(e) => setSurname(e.target.value)}
          required
        />
        {unknownCompound && (
          <p className="text-xs text-destructive">
            지원하는 복성은 {COMPOUND_SURNAMES.join("·")}입니다. 두 부모의 성을 함께 쓰려면 아래 &lsquo;부모 성
            함께 쓰기&rsquo;를 선택해 주세요.
          </p>
        )}
        {unknown && <p className="text-xs text-destructive">성씨 통계에 없는 성입니다. 성을 다시 확인해 주세요.</p>}
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
              {surnameLabel(s, o)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** 입력 내용 한 줄 (기다리는 화면에도 쓴다) */
function whoText(f: FormData) {
  const s = String(f.get("surname") ?? "").trim();
  const sh = String(f.get("sh") ?? "");
  const gender = GENDERS.find(([v]) => v === f.get("gender"))?.[1] ?? "";
  const ps = String(f.get("ps") ?? "").trim();
  return `${s}${sh ? `(${sh})` : ""}씨${ps ? ` · ${ps} 함께 쓰기` : ""} · ${gender}`;
}

function birthText(f: FormData) {
  const date = String(f.get("date") ?? "").split("-").map(Number);
  const time = String(f.get("time") ?? "");
  const placeId = f.get("place");
  const place = BIRTHPLACES.find((b) => b.id === placeId)?.label ?? "해외";
  return `${date[0]}. ${date[1]}. ${date[2]}${time ? ` ${time}` : " (시각 모름)"} · ${place}`;
}

/** 서버 액션으로 넘어가는 동안 기다리는 화면을 덮어 다시 누르지 못하게 한다 */
function SubmitButton({ label }: { label: string }) {
  const { pending, data } = useFormStatus();
  return (
    <>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {label}
      </Button>
      {pending && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-50 overflow-y-auto bg-background">
          <NamingWaiting summary={data ? `${whoText(data)} · ${birthText(data)}` : null} />
        </div>
      )}
    </>
  );
}

/**
 * 작명 입력 폼. `self`(직접 짓기)는 이름 조건 대신 부모가 정한 한글 이름을 받아 /naming/self로 보낸다
 */
export function NamingForm({
  mode = "recommend",
  initialSurname = "",
  initialGiven = "",
}: {
  mode?: "recommend" | "self";
  initialSurname?: string;
  initialGiven?: string;
}) {
  const self = mode === "self";
  const [noTime, setNoTime] = useState(false);
  const [place, setPlace] = useState(DEFAULT_BIRTHPLACE_ID);
  const [length, setLength] = useState<"any" | "1" | "2">("any");
  const [withParent, setWithParent] = useState(false);
  const [kind, setKind] = useState<NameKind>("hanja");
  // 입력은 세 단계로 나눠 보여 주기만 한다. 한 폼이라 숨긴 단계의 값도 그대로 함께 보낸다
  const [step, setStep] = useState(0);
  const [time, setTime] = useState("");
  const [done, setDone] = useState<{ who: string; birth: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepLabels = ["성씨·성별", "태어난 날", "확인"];

  /** 지금 단계의 칸을 확인하고 다음 단계로 (숨긴 칸은 브라우저 확인 말풍선을 띄울 수 없다) */
  const next = () => {
    const form = formRef.current;
    if (!form) return;
    const section = form.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const fields = Array.from(section?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select") ?? []);
    if (fields.some((f) => !f.reportValidity())) return;
    // 성씨 표에 없는 성은 한자 칸이 비어 있다 (안내는 칸 아래에 이미 나온다)
    if (fields.some((f) => f.tagName === "SELECT" && f.disabled && (f.name === "sh" || f.name === "psh"))) return;
    const data = new FormData(form);
    setDone({ who: whoText(data), birth: step >= 1 ? birthText(data) : "" });
    setStep(step + 1);
    window.scrollTo({ top: 0 });
  };
  const handleSubmit = (e: FormEvent) => {
    // 마지막 단계 전에는 엔터를 눌러도 보내지 않고 다음 단계로
    if (step < 2) {
      e.preventDefault();
      next();
    }
  };

  // 기타 해외 출생: 브라우저가 아는 IANA 시간대 목록 (선택했을 때만 렌더링)
  const timeZones = useMemo(
    () => (place === CUSTOM_BIRTHPLACE_ID ? Intl.supportedValuesOf("timeZone") : []),
    [place]
  );

  return (
    <form ref={formRef} action={self ? openSelfPicker : openNamingResult} onSubmit={handleSubmit} className="space-y-6">
      <StepBar step={step} labels={stepLabels} />

      {done && step >= 1 && <DoneRow text={done.who} onEdit={() => setStep(0)} />}
      {done && step === 2 && done.birth && <DoneRow text={done.birth} onEdit={() => setStep(1)} />}

      <section data-step={0} hidden={step !== 0} className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-snug">성씨와 성별을 알려 주세요</h2>
        <SurnameFields label="성" hangulName="surname" hanjaName="sh" placeholder="예: 김, 남궁" initial={initialSurname} />
        <label className={checkLabelClass}>
          <input type="checkbox" className={checkClass} checked={withParent} onChange={(e) => setWithParent(e.target.checked)} />
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
        <div className="space-y-2">
          <Label>성별</Label>
          <div className="flex flex-wrap gap-x-4">
            {GENDERS.map(([v, label]) => (
              <label key={v} className={checkLabelClass}>
                <input type="radio" className={checkClass} name="gender" value={v} defaultChecked={v === "neutral"} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section data-step={1} hidden={step !== 1} className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-snug">아이가 태어난 날을 알려 주세요</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">생년월일 (양력)</Label>
            <Input id="date" name="date" type="date" className={inputClass} min="1901-01-01" max="2099-12-31" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">태어난 시각</Label>
            <Input
              id="time"
              name="time"
              type="time"
              className={inputClass}
              disabled={noTime}
              required={!noTime}
              onChange={(e) => setTime(e.target.value)}
            />
            <label className={checkLabelClass}>
              <input
                type="checkbox"
                className={checkClass}
                checked={noTime}
                onChange={(e) => setNoTime(e.target.checked)}
              />
              시각을 몰라요
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
                  className={inputClass}
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
          <p className="text-sm text-ink-soft break-keep">태어난 곳에 따라 시각을 조금 보정해요. 시·도까지만 고르면 돼요.</p>
        </div>
        {/* 23시대 출생에만 영향이 있어 그때만 보여 준다 (값은 기본값으로 함께 간다) */}
        <div className="space-y-2" hidden={noTime || !time.startsWith("23")}>
          <Label htmlFor="late">자시(23:00~24:00) 처리</Label>
          <select id="late" name="late" className={selectClass} defaultValue="next-day">
            <option value="next-day">23시부터 다음 날로 계산 (기본)</option>
            <option value="same-day">야자시: 당일로 계산 (23~24시)</option>
          </select>
        </div>
      </section>

      {self ? (
        <section data-step={2} hidden={step !== 2} className="space-y-4">
          <h2 className="text-2xl font-extrabold leading-snug">정한 이름을 알려 주세요</h2>
          <div className="space-y-2">
            <Label htmlFor="given">이름 (한글)</Label>
            <Input
              id="given"
              name="given"
              placeholder="예: 서윤"
              className={inputClass}
              defaultValue={initialGiven}
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
      <section data-step={2} hidden={step !== 2} className="space-y-4">
        <h2 className="text-2xl font-extrabold leading-snug">이름 조건을 확인해 주세요</h2>
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
                className={inputClass}
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
        <label className={checkLabelClass}>
          <input type="checkbox" className={checkClass} name="glob" value="1" />
          글로벌 발음 친화 이름만 보기
        </label>
        <label className={checkLabelClass}>
          <input type="checkbox" className={checkClass} name="neutral" value="1" />
          남녀 공용 (중성적인 이름만)
        </label>
        <p className="text-xs text-muted-foreground">
          희귀한 이름·인기 이름 순서와 우리 집 우선순위는 결과 화면에서 바로 고를 수 있습니다.
        </p>
      </section>
      )}

      {/* 휴대폰에서 엄지가 닿도록 아래쪽에 붙인다 */}
      <div className="sticky bottom-0 -mx-4 space-y-2 border-t bg-background px-4 pb-6 pt-3.5 sm:-mx-6 sm:px-6">
        {step < 2 ? (
          <Button key={`next-${step}`} type="button" size="lg" className="w-full" onClick={next}>
            다음
          </Button>
        ) : (
          <SubmitButton key="submit" label={self ? "한자 고르기" : length === "1" ? "이름 받기" : "이름 30개 받기"} />
        )}
        <p className="text-center text-xs text-muted-foreground">카드 등록 없이 무료예요</p>
      </div>
    </form>
  );
}
