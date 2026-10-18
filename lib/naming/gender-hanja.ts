import type { NamingParams } from "./params";
import type { NameHanja } from "./recommend";

/**
 * 뜻에 성별이 뚜렷한 한자를 아이 성별에 맞게 처리한다 (2026-10-18 사용자 확인). 한자 기준이라 읽기가 여럿이어도 같다.
 *  - 남성 뜻: 남자아이면 뜻 점수를 "애매"(0.2)로 낮추고, 여자아이·성별 무관이면 후보에서 뺀다
 *  - 여성 뜻: 남자아이·성별 무관이면 후보에서 빼고, 여자아이면 그대로 (허용 목록의 姬·媛도 이 규칙을 따른다)
 * 가족 관계·동물 암수 뜻(아비·아내·암컷 등)은 성별과 관계없이 hanja-suitability.ts에서 뺀다.
 * 雄(수컷 웅)·子(아들 자)·丁(장정 정)은 이름에 널리 쓰는 뜻(영웅·자식·튼튼함)이 있어 넣지 않는다.
 */
const MALE_HANJA = new Set([..."男郞"]);

const FEMALE_HANJA = new Set([
  ..."女娘妃嬅姬姫媛娃姝姁娙嫭",
  // 애매 등급 중 성별 뜻만 있는 글자: 궁녀·계집아이·색시·항아·여자 이름·왕후·여승 등
  ..."嬙孃閨姮婐嫄嫈后尼㛄㛅",
]);

export function applyGender(pool: NameHanja[], gender: NamingParams["gender"]): NameHanja[] {
  return pool.flatMap((c) => {
    if (FEMALE_HANJA.has(c.hanja)) return gender === "female" ? [c] : [];
    if (MALE_HANJA.has(c.hanja)) return gender === "male" ? [{ ...c, suitability: "obscure" as const }] : [];
    return [c];
  });
}
