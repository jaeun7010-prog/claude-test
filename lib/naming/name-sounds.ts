/**
 * 이름 소리 목록과 "소리 먼저" 규칙 (2026-10-22 사용자 결정, 나안 + 가점 10).
 *
 * 한자 후보는 지금처럼 만들되, 이름 소리(한글)를 실제로 쓰는 이름 쪽으로 모은다.
 *   ① 반대 성별 소리는 뺀다 (목록에 있지만 아이 성별에 맞지 않는 소리)
 *   ② 목록에 있는 소리는 기본 순위 점수에 NAME_SOUND_BONUS를 더한다 (요즘 어감 하한에도 걸리지 않음)
 *   ③ 목록에 없는 소리는 각 글자가 그 자리(첫/끝)에 실제로 쓰이는 소리일 때만 남긴다 (뇌·탕·누, 첫 글자 린 등은 빠짐)
 * 성명학 점수(사주 보완·수리·발음오행·자원오행)는 바꾸지 않는다.
 *
 * 소리 목록은 출처(NameSoundSource)로 분리해, 대법원 통계가 들어오면 출생 건수·성비로 만든 목록으로 바꾼다.
 */

export type SoundGender = "female" | "male" | "both";

export interface NameSound {
  /** 이름 소리 (성 제외, 예: 서연) */
  sound: string;
  gender: SoundGender;
}

export interface NameSoundSource {
  /** 검토용 출처 설명 */
  readonly label: string;
  sounds(): readonly NameSound[];
}

/** 목록에 있는 소리에 더하는 기본 순위 점수 (가점 0·5·10·15 시험 후 결정) */
export const NAME_SOUND_BONUS = 10;

// 임시 목록 (초안). 2008~2024년 보도된 인기 이름과 흔히 쓰이는 이름을 기억에 기대어 모은 것으로, 대법원 원자료가 아니다
const F = `서연 서윤 서현 민서 하은 하윤 윤서 지유 채원 수아 지아 하린 서아 아린 예린 이서 다은 은서 예은 소율 시은 유나
예원 민지 지현 지윤 채은 서영 다인 나윤 아윤 예서 시아 나은 연서 소윤 윤아 가은 서은 수연 지은 예나 하연 지율 다연
은채 유주 채윤 서하 이나 아인 리아 로아 서린 수린 채린 유린 다린 예지 혜원 민주 유빈 나연 주아 아영 소은 채아 하영
유하 다윤 시연 서율 은유 루아 지수 혜진 혜린 예진 다현 다빈 소연 소희 소민 수정 은비 은지 은솔 은하 가윤 가연 나경
나리 나영 다예 다희 도희 라희 미소 미나 보은 서희 세아 세은 세린 소아 소이 수하 시하 아라 아름 연주 연희 영서 예솔
예빈 예하 유정 윤슬 윤희 재희 정윤 주하 주희 지나 지희 채연 하나 하니 해인 혜나 혜윤 효주 효린 희원 수희 예림 다솜
초은 채희 하경 아현 지혜 수영 은정 유리 이현아`;

const M = `민준 서준 도윤 예준 시우 하준 주원 지호 지후 준우 준서 도현 건우 현우 우진 선우 서진 유준 정우 승우 승현 시윤
준혁 지환 승민 유찬 윤우 민성 준영 시후 진우 수호 재윤 시현 동현 이준 은찬 태윤 로운 지한 태현 민재 현준 성민 재원
민우 준수 도하 우주 지성 은호 태민 윤호 준호 도겸 태양 시원 하진 윤재 태오 로하 주안 도훈 한결 건호 건희 경민 경준
규민 규현 기현 대현 도진 동건 동욱 동하 동훈 민혁 민호 민석 범준 상현 상우 서후 성준 성현 성우 성훈 세준 세현 승준
승원 승호 시혁 영준 영민 예성 예찬 우현 원준 유건 윤성 윤후 은성 이도 재민 재현 재하 재준 정민 정훈 종현 주호 주환
준희 지완 진호 진혁 찬우 찬영 태경 태하 태준 태호 한울 현서 현수 현진 형준 호준 희찬 강민 강우 도영 태율 지혁 준성`;

const B = `지우 지안 수빈 유진 수민 지민 하율 연우 은우 서우 이안 지원 가온 하람 다온 이현 은재 해솔 시온 리안 하온 이든
수현 예안 도이 하엘 윤슬 은결 주이 다인`;

/** 외자 */
const F1 = "린 별 솔 설 은 윤 율 결 담";
const M1 = "건 준 혁 훈 찬 결 율 윤 담 현";

const split = (s: string) => [...new Set(s.split(/\s+/).filter(Boolean))];

/** 임시 이름 소리 목록 325개 (여 148 · 남 143 · 둘 다 34, 외자 포함). 여자·남자 목록에 함께 있으면 "둘 다" */
export const DRAFT_NAME_SOUNDS: NameSoundSource = {
  label: "임시 목록 (기억에 기댄 표본, 대법원 통계 아님)",
  sounds() {
    const out = new Map<string, SoundGender>();
    const add = (list: string[], g: SoundGender) => {
      for (const s of list) {
        const prev = out.get(s);
        out.set(s, prev && prev !== g ? "both" : g);
      }
    };
    add(split(B), "both");
    // 세 글자(이현아)는 두 글자 이름 후보와 맞지 않아 뺀다
    add(split(F).filter((s) => [...s].length <= 2), "female");
    add(split(M), "male");
    add(split(F1), "female");
    add(split(M1), "male");
    return [...out].map(([sound, gender]) => ({ sound, gender }));
  },
};

export interface SoundRule {
  /** 목록에 있는 소리인가 (가점, 요즘 어감 하한 면제) */
  listed(given: string): boolean;
  /** 후보로 남길 소리인가. fixed는 사용자가 정한 돌림자 음절로, 자리 확인에서 뺀다 */
  allows(given: string, fixed?: ReadonlySet<string>): boolean;
}

/**
 * 아이 성별에 맞는 소리 규칙.
 * 여자아이 = 여 + 둘 다, 남자아이 = 남 + 둘 다, 성별 상관없음 = 전체, "남녀 공용"(neutralOnly) = 둘 다만.
 * checkPosition이 false면 ③ 자리 확인을 하지 않는다 (화면 이름이 모자랄 때 채움용. ①②는 그대로)
 */
export function buildSoundRule(
  gender: "male" | "female" | "neutral",
  neutralOnly: boolean,
  { checkPosition = true, source = DRAFT_NAME_SOUNDS }: { checkPosition?: boolean; source?: NameSoundSource } = {}
): SoundRule {
  const all = source.sounds();
  const allowed = all.filter((s) =>
    neutralOnly ? s.gender === "both" : gender === "neutral" || s.gender === "both" || s.gender === gender
  );
  const listed = new Set(allowed.map((s) => s.sound));
  const opposite = new Set(all.filter((s) => !listed.has(s.sound)).map((s) => s.sound));
  const twoSyllable = allowed.map((s) => [...s.sound]).filter((sy) => sy.length === 2);
  const firstSet = new Set(twoSyllable.map((sy) => sy[0]));
  const lastSet = new Set(twoSyllable.map((sy) => sy[1]));

  return {
    listed: (given) => listed.has(given),
    allows(given, fixed) {
      if (listed.has(given)) return true;
      if (opposite.has(given)) return false;
      if (!checkPosition) return true;
      const sy = [...given];
      const ok = (s: string, set: Set<string>) => set.has(s) || !!fixed?.has(s);
      // 외자는 끝 글자 자리 소리로 본다
      if (sy.length === 1) return ok(sy[0], lastSet);
      if (sy.length === 2) return ok(sy[0], firstSet) && ok(sy[1], lastSet);
      return true;
    },
  };
}
