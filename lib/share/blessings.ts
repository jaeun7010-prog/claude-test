/**
 * 이름 카드 축원 한 줄 (2026-10-25 사용자 확인). 부모가 아이에게 건네는 말투, 종교적·거창한 표현은 쓰지 않는다.
 * 목록에서만 고른다 (직접 입력 없음). 기본값은 0번.
 * 부르는 이름은 새로 고르는 부분이다 (김박서윤 → 서윤아). 받침이 있으면 "아", 없으면 "야".
 * 문장을 추가·수정·삭제할 때는 사용자에게 표로 먼저 보여 주고 확인받는다.
 * 이미 만든 카드는 문장을 그대로 저장해 두므로(name_shares.blessing) 번호 순서는 바꾸지 않고 뒤에 더한다.
 */

export const BLESSINGS: readonly string[] = [
  "{이름}, 네 이름에 담긴 뜻처럼 자라렴.",
  "{이름}, 우리에게 와 줘서 정말 고마워.",
  "{이름}, 건강하고 씩씩하게만 자라 주렴.",
  "{이름}, 웃는 날이 훨씬 많기를 바라.",
  "{이름}, 너는 있는 그대로 충분히 소중해.",
  "{이름}, 언제나 네 편이 되어 줄게.",
  "{이름}, 천천히, 너의 속도로 자라도 괜찮아.",
  "{이름}, 하고 싶은 일을 마음껏 하며 자라렴.",
  "{이름}, 좋은 사람들과 행복하게 자라렴.",
  "{이름}, 오늘처럼 매일 사랑받으며 자라렴.",
];

export const DEFAULT_BLESSING = 0;

export const isBlessingIndex = (i: number): boolean => Number.isInteger(i) && i >= 0 && i < BLESSINGS.length;

/** 부르는 말: 하린 → 하린아, 보미 → 보미야 */
export function vocative(name: string): string {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  const batchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${name}${batchim ? "아" : "야"}`;
}

export const blessingText = (callName: string, index: number): string =>
  BLESSINGS[index].replace("{이름}", vocative(callName));
