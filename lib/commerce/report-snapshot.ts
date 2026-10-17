import { geokgukEasy, OUTER_NOTICE } from "@/components/naming/geokguk-note";
import { lackingElement } from "@/lib/commerce/catalog";
import type { NameHanja } from "@/lib/naming/recommend";
import type { NamingParams } from "@/lib/naming/params";
import type { analyzeChosen } from "@/lib/naming/service";
import type { Element, NamingAnalysis } from "@/lib/naming/types";
import type { Pillar, YongsinResult } from "@/lib/saju";

/**
 * 프리미엄 리포트 고정 내용. 주문 생성 때 계산해 orders.report_snapshot 에 한 번만 저장하고,
 * 리포트는 이 값만으로 그린다. 엔진(사주·작명 규칙)이 바뀌어도 결제한 리포트는 바뀌지 않는다.
 * 필드를 바꿀 때는 version 을 올리고, 예전 version 도 계속 그릴 수 있게 유지한다.
 */
export interface ReportSnapshot {
  version: 1;
  /** 분석 시각 (ISO) */
  createdAt: string;
  surname: string;
  surnameHanja: string;
  surnameChars: NameHanja[];
  given: NameHanja[];
  analysis: NamingAnalysis;
  saju: {
    pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null };
    yongsin: YongsinResult;
  };
  birthText: string;
  /** 그릴 때 계산하던 풀이 문장도 고정한다 */
  texts: {
    /** 격국 쉬운 설명 (외격 후보 안내 포함). 격국 정보가 없으면 null */
    geokguk: string | null;
    /** 사주에서 가장 부족한 오행 (행운의 동물·색) */
    lacking: Element;
  };
}

type Chosen = NonNullable<Awaited<ReturnType<typeof analyzeChosen>>>;

const plainPillar = (x: Pillar): Pillar => ({
  stem: x.stem, branch: x.branch, index: x.index, hanja: x.hanja, ko: x.ko,
});

export function birthTextOf(p: NamingParams): string {
  const { year, month, day } = p.birth;
  return (
    `${year}년 ${month}월 ${day}일` +
    (p.hasTime
      ? ` ${String(p.birth.hour).padStart(2, "0")}시 ${String(p.birth.minute ?? 0).padStart(2, "0")}분`
      : " (시각 미상)") +
    ` · ${p.birthplace.label} 출생`
  );
}

export function buildReportSnapshot(p: NamingParams, chosen: Chosen): ReportSnapshot {
  const { pillars, yongsin } = chosen.saju;
  const snapshot: ReportSnapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    surname: p.surname,
    surnameHanja: p.surnameHanja,
    surnameChars: chosen.surname,
    given: chosen.given,
    analysis: chosen.analysis,
    saju: {
      pillars: {
        year: plainPillar(pillars.year),
        month: plainPillar(pillars.month),
        day: plainPillar(pillars.day),
        hour: pillars.hour ? plainPillar(pillars.hour) : null,
      },
      yongsin,
    },
    birthText: birthTextOf(p),
    texts: {
      geokguk: yongsin.geokguk
        ? `${geokgukEasy(yongsin)}${yongsin.geokguk.outer ? ` ${OUTER_NOTICE}` : ""}`
        : null,
      lacking: lackingElement(yongsin.scores, yongsin.yongsin),
    },
  };
  // jsonb 에 넣을 수 있는 값만 남긴다 (Date·undefined 제거)
  return JSON.parse(JSON.stringify(snapshot));
}

/** DB에서 읽은 값이 그릴 수 있는 스냅숏인지 */
export function isReportSnapshot(v: unknown): v is ReportSnapshot {
  const s = v as ReportSnapshot | null;
  return !!s && s.version === 1 && !!s.saju?.yongsin && !!s.analysis && Array.isArray(s.given) && !!s.texts;
}
