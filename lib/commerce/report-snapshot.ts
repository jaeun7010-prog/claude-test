import { geokgukEasy, OUTER_NOTICE } from "@/components/naming/geokguk-note";
import { lackingElement } from "@/lib/commerce/catalog";
import type { NameHanja } from "@/lib/naming/recommend";
import type { NamingParams } from "@/lib/naming/params";
import type { CombinationItem } from "@/lib/naming/combination";
import { nameMeaningOf, type NameMeaning } from "@/lib/naming/name-meaning";
import { registrationText } from "@/lib/naming/registration";
import type { analyzeChosen } from "@/lib/naming/service";
import type { Element, NamingAnalysis } from "@/lib/naming/types";
import type { Pillar, YongsinResult } from "@/lib/saju";

/**
 * 프리미엄 리포트 고정 내용. 주문 생성 때 계산해 orders.report_snapshot 에 한 번만 저장하고,
 * 리포트는 이 값만으로 그린다. 엔진(사주·작명 규칙)이 바뀌어도 결제한 리포트는 바뀌지 않는다.
 * 필드를 바꿀 때는 version 을 올리고, 예전 version 도 계속 그릴 수 있게 유지한다.
 */
export interface ReportSnapshot {
  /**
   * 1: 첫 형식 / 2: texts.registration 추가 (부모 성 함께 쓰기, 2026-10-17)
   * 3: 부모 성 함께 쓰기의 analysis 가 새로 고르는 부분 기준으로 바뀌고 legalAnalysis·texts.combination 추가 (2026-10-17).
   *    version 2 이하의 부모 성 함께 쓰기 스냅숏은 analysis 가 법적 이름 전체 기준이다
   * 4: texts.nameMeaning(이름 전체 뜻 한 줄) 추가 (2026-10-18)
   */
  version: 1 | 2 | 3 | 4;
  /** 분석 시각 (ISO) */
  createdAt: string;
  surname: string;
  surnameHanja: string;
  surnameChars: NameHanja[];
  given: NameHanja[];
  /** 성명학 분석 (등급·점수). 부모 성 함께 쓰기는 새로 고르는 부분 기준 (version 3부터) */
  analysis: NamingAnalysis;
  /** 부모 성 함께 쓰기의 법적 이름 전체 기준 분석 (참고). 해당 없거나 version 2 이하면 없음 */
  legalAnalysis?: NamingAnalysis | null;
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
    /** 부모 성 함께 쓰기의 출생신고 등록 안내. 해당 없거나 version 1이면 없음 */
    registration?: string | null;
    /** 부모 성 함께 쓰기의 조합 진단. 해당 없거나 version 2 이하면 없음 */
    combination?: CombinationItem[] | null;
    /** 이름 전체 뜻 한 줄 (새로 고르는 글자 기준). 문장이 없는 이름이거나 version 3 이하면 없음 */
    nameMeaning?: NameMeaning | null;
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
    version: 4,
    createdAt: new Date().toISOString(),
    surname: p.surname,
    surnameHanja: p.surnameHanja,
    surnameChars: chosen.surname,
    given: chosen.given,
    analysis: chosen.analysis,
    legalAnalysis: chosen.legalAnalysis,
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
      registration: p.parentSurname
        ? registrationText({
            surname: p.surname,
            surnameHanja: p.surnameHanja,
            given: chosen.given.map((c) => c.eum).join(""),
            givenHanja: chosen.given.map((c) => c.hanja).join(""),
          })
        : null,
      combination: chosen.combination,
      nameMeaning: nameMeaningOf(chosen.given.slice(p.parentSurname ? [...p.parentSurname.hanja].length : 0)),
    },
  };
  // jsonb 에 넣을 수 있는 값만 남긴다 (Date·undefined 제거)
  return JSON.parse(JSON.stringify(snapshot));
}

/** DB에서 읽은 값이 그릴 수 있는 스냅숏인지 */
export function isReportSnapshot(v: unknown): v is ReportSnapshot {
  const s = v as ReportSnapshot | null;
  return !!s && (s.version === 1 || s.version === 2 || s.version === 3 || s.version === 4) && !!s.saju?.yongsin && !!s.analysis && Array.isArray(s.given) && !!s.texts;
}
