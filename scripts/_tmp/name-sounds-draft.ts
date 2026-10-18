/**
 * 임시 이름 소리 목록 (초안). 2008~2024년 보도된 인기 이름과 흔히 쓰이는 이름을 기억에 기대어 모은 것으로,
 * 대법원 원자료가 아니다. 통계가 들어오면 실제 출생신고 건수·성비로 다시 만든다.
 * gender: female 여 / male 남 / both 둘 다
 */
export type SoundGender = "female" | "male" | "both";

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

const F1 = "린 별 솔 설 은 윤 율 결 담";
const M1 = "건 준 혁 훈 찬 결 율 윤 담 현";

const split = (s: string) => [...new Set(s.split(/\s+/).filter(Boolean))];

export function buildSounds(): { sound: string; gender: SoundGender }[] {
  const out = new Map<string, SoundGender>();
  const add = (list: string[], g: SoundGender) => {
    for (const s of list) {
      const prev = out.get(s);
      out.set(s, prev && prev !== g ? "both" : g);
    }
  };
  add(split(B), "both");
  add(split(F).filter((s) => [...s].length <= 2), "female");
  add(split(M), "male");
  add(split(F1), "female");
  add(split(M1), "male");
  return [...out].map(([sound, gender]) => ({ sound, gender }));
}
