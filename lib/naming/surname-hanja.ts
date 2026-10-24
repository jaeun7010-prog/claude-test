/**
 * 성씨 한자 후보 (입력 폼·서버 확인). 통계청 2015 인구주택총조사 성씨별 인구로 만든 SURNAME_TABLE만 쓴다.
 * 엔진·사전을 가져오지 않아 브라우저에서도 쓴다. 2026-10-24 사용자 결정:
 *  - 실제 성씨 한자만 후보로, 인구 많은 순. 기본값은 인구 1위
 *  - 그 소리 인구의 1% 이상은 바로 보이고 나머지는 "다른 한자 성씨 보기"로 접는다 (조 趙·曺, 신 申·辛, 전 全·田)
 *  - 두음법칙 성씨는 두 소리 모두에서 나온다 (류·유, 림·임, 라·나 등, surnameKey)
 *  - 목록에는 훈 대신 "李 (이씨, 7획)"
 */
import { SURNAME_TABLE } from "./surname-table";

/** 바로 보이는 한자: 그 소리 인구에서 이 비율 이상 (1위는 늘 보인다) */
export const SURNAME_VISIBLE_SHARE = 0.01;

const IY = new Set([2, 3, 6, 7, 12, 17, 20]); // ㅑ ㅒ ㅕ ㅖ ㅛ ㅠ ㅣ
/**
 * 두음법칙 묶음 열쇠: 외자 성의 첫소리 ㄹ·ㄴ을 두음법칙 형태로 (류 → 유, 림 → 임, 라 → 나, 리 → 이, 로 → 노, 녀 → 여).
 * 복성은 그대로
 */
export function surnameKey(sound: string): string {
  if ([...sound].length !== 1) return sound;
  const code = sound.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return sound;
  const initial = Math.floor(code / 588);
  const medial = Math.floor((code % 588) / 28);
  const rest = code % 588;
  const to = (i: number) => String.fromCharCode(0xac00 + i * 588 + rest);
  if (initial === 5) return to(IY.has(medial) ? 11 : 2); // ㄹ
  if (initial === 2 && IY.has(medial)) return to(11); // ㄴ
  return sound;
}

export interface SurnameOption {
  hanja: string;
  population: number;
  /** 글자별 획수 (복성은 두 개) */
  strokes: readonly number[];
  /** 그 소리 인구 중 비율 */
  share: number;
  /** 바로 보이는지 (아니면 "다른 한자 성씨 보기") */
  visible: boolean;
}

/** 소리의 성씨 한자 후보 (인구 많은 순). 표에 없는 소리면 빈 배열 */
export function surnameOptions(sound: string): SurnameOption[] {
  const list = SURNAME_TABLE[surnameKey(sound)] ?? [];
  const sum = list.reduce((s, [, n]) => s + n, 0);
  return list.map(([hanja, population, strokes], i) => {
    const share = sum ? population / sum : 0;
    return { hanja, population, strokes, share, visible: i === 0 || share >= SURNAME_VISIBLE_SHARE };
  });
}

/** 기본 한자 (인구 1위). 표에 없는 소리면 null */
export const defaultSurnameHanja = (sound: string): string | null => surnameOptions(sound)[0]?.hanja ?? null;

/** 성씨 표에 있는 소리·한자인지 */
export const isSurnameHanja = (sound: string, hanja: string): boolean =>
  surnameOptions(sound).some((o) => o.hanja === hanja);

/** 목록 이름표: "李 (이씨, 7획)" / 복성 "南宮 (남궁씨, 南9 + 宮10 = 19획)" */
export function surnameLabel(sound: string, o: SurnameOption): string {
  const sum = o.strokes.reduce((s, n) => s + n, 0);
  const strokes =
    o.strokes.length > 1 ? `${[...o.hanja].map((c, i) => `${c}${o.strokes[i]}`).join(" + ")} = ${sum}획` : `${sum}획`;
  return `${o.hanja} (${sound}씨, ${strokes})`;
}
