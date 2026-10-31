import type { TimeCorrection } from "@/lib/saju";
import { BRANCHES, BRANCHES_KO, type Pillar } from "@/lib/saju";
import type { Birthplace } from "@/lib/saju/birthplaces";

function clock(hour: number, minute: number) {
  const ampm = hour < 12 ? "오전" : "오후";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${ampm} ${h}시${minute ? ` ${minute}분` : ""}`;
}

const sijin = (p: Pillar) => `${BRANCHES_KO[p.branch]}시(${BRANCHES[p.branch]}時)`;

function formatLongitude(lon: number) {
  return `${lon >= 0 ? "동경" : "서경"} ${Math.abs(lon).toFixed(2)}°`;
}

/** 출생지 경도 보정 안내. 보정으로 시주·일주가 바뀌면 강조해서 알린다 */
export function TimeCorrectionNote({
  correction,
  birthplace,
  input,
  hourPillar,
  dayPillar,
}: {
  correction: TimeCorrection | null;
  birthplace: Birthplace;
  input: { hour: number; minute: number } | null;
  hourPillar: Pillar | null;
  dayPillar: Pillar;
}) {
  if (!correction || !input || !hourPillar) {
    return (
      <p className="text-xs text-muted-foreground">
        태어난 시각을 몰라 출생지({birthplace.label}) 시간 보정은 하지 않았습니다.
      </p>
    );
  }

  const { minutes, corrected, uncorrected, hourChanged, dayChanged } = correction;
  const changed = hourChanged || dayChanged;
  const gap = `${Math.abs(minutes)}분 ${minutes < 0 ? "이른" : "늦은"}`;
  const before = clock(input.hour, input.minute);
  const after = clock(corrected.hour, corrected.minute);

  return (
    <div className={changed ? "rounded-md bg-secondary p-4 text-sm" : "text-sm"} role={changed ? "status" : undefined}>
      {changed ? (
        <p>
          <b>태어난 곳에 맞춰 출생 시각을 보정하면서 {dayChanged ? "태어난 날과 시간" : "태어난 시간"}의 기둥이 바뀌었습니다.</b>{" "}
          {birthplace.label}의 실제 해 위치로 보면 시계({before})보다 {gap} {after}에 태어난 셈이어서,{" "}
          {uncorrected.hour && hourChanged && <>{sijin(uncorrected.hour)}가 아니라 {sijin(hourPillar)}로 봅니다.</>}
          {dayChanged && <> 날짜가 넘어가 일주도 {uncorrected.day.ko}일이 아니라 {dayPillar.ko}일로 봅니다.</>}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          태어난 곳({birthplace.label})의 해 위치에 맞춰 출생 시각을 {Math.abs(minutes)}분 보정했고, 시간 기둥은 그대로입니다.
        </p>
      )}
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="min-h-11 cursor-pointer leading-[44px]">자세히 보기</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt>출생지</dt>
          <dd>
            {birthplace.label} ({formatLongitude(birthplace.longitude)}, {birthplace.timeZone})
          </dd>
          <dt>시계 시각</dt>
          <dd>{before}</dd>
          <dt>평균태양시</dt>
          <dd>
            {after} ({minutes >= 0 ? "+" : "−"}
            {Math.abs(minutes)}분)
          </dd>
          <dt>보정 전 → 후</dt>
          <dd>
            일주 {uncorrected.day.hanja} → {dayPillar.hanja}, 시주 {uncorrected.hour?.hanja ?? "-"} →{" "}
            {hourPillar.hanja}
          </dd>
        </dl>
        <p className="mt-2">
          보정량 = (출생지 경도 − 표준시 기준 경도) × 4분이며, 그 시기의 서머타임도 반영합니다. 국내 사주
          풀이 대부분과 같게 균시차(계절에 따른 해 시각의 차이)는 반영하지 않습니다.
        </p>
      </details>
    </div>
  );
}
