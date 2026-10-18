/**
 * 순우리말 이름 목록 (2026-10-18 사용자 검토·확정, 표준국어대사전 오픈 API 확인: scripts/check-stdict.ts).
 * - dictionary(사전 등재어): 표준국어대사전 표제어. meaning은 사전 뜻을 짧게 적고, 더 좋은 뜻이 있으면 "사전에는 '…'이라는 뜻도 있어요"를 덧붙였다.
 * - coined(이름용 조어): 사전에 없거나 사전 뜻과 이름 뜻이 다른 말. "~에서 따온 이름"으로 쓰고 "순우리말 단어"라고 단정하지 않는다.
 * - popular(널리 쓰이는 이름): 뜻 근거는 약하지만 실제 이름으로 많이 쓰이는 말. 알려진 뜻과 근거 상황을 함께 쓰고 뜻 등급은 보통.
 *   대법원 이름 통계가 들어오면 실제 사용 빈도로 다시 확인한다.
 * 확인되지 않은 옛 글자 표기는 넣지 않는다. 뜻이 확실하지 않은 이름, 종교 용어와 겹치는 이름, 이름보다 브랜드·놀림말이 먼저 떠오르는 이름은 뺐다.
 * 이름을 추가·수정·삭제할 때는 사용자에게 표로 먼저 보여 주고 확인받는다.
 */

export type NativeNameCategory = "dictionary" | "coined" | "popular";

export interface NativeName {
  name: string;
  category: NativeNameCategory;
  /** 화면에 보여 줄 뜻 한 줄 */
  meaning: string;
  /** 어울리는 성별. neutral은 성별 무관 */
  gender: "male" | "female" | "neutral";
  /** 우리말 이름 점수의 뜻 항목: good 1 / normal 0.6 */
  meaningGrade: "good" | "normal";
}

const N = (
  name: string,
  category: NativeNameCategory,
  gender: NativeName["gender"],
  meaningGrade: NativeName["meaningGrade"],
  meaning: string
): NativeName => ({ name, category, gender, meaningGrade, meaning });

export const NATIVE_NAMES: readonly NativeName[] = [
  // 사전 등재어
  N("별", "dictionary", "neutral", "good", "밤하늘에 반짝이는 별"),
  N("솔", "dictionary", "neutral", "normal", "늘 푸른 소나무"),
  N("봄", "dictionary", "neutral", "good", "한 해를 여는 첫 계절"),
  N("빛", "dictionary", "neutral", "good", "어둠을 밝히는 빛"),
  N("결", "dictionary", "neutral", "normal", "나무·살결에 고르게 드러난 무늬. 사전에는 '성품의 바탕'이라는 뜻도 있어요"),
  N("온", "dictionary", "neutral", "normal", "'전부의·모든'을 뜻하는 말"),
  N("참", "dictionary", "neutral", "good", "거짓이 없고 바름"),
  N("샘", "dictionary", "neutral", "good", "물이 솟아나는 곳"),
  N("꿈", "dictionary", "neutral", "good", "이루고 싶은 바람"),
  N("하늘", "dictionary", "neutral", "good", "땅 위로 펼쳐진 넓은 하늘"),
  N("슬기", "dictionary", "neutral", "good", "사리를 바르게 판단하는 재능"),
  N("보람", "dictionary", "neutral", "good", "한 일에 대한 좋은 결과나 만족"),
  N("누리", "dictionary", "neutral", "good", "세상"),
  N("마루", "dictionary", "neutral", "normal", "산등성이의 꼭대기·일의 고비"),
  N("바다", "dictionary", "neutral", "normal", "넓고 큰 바다"),
  N("구름", "dictionary", "neutral", "normal", "하늘에 떠 있는 구름"),
  N("바람", "dictionary", "neutral", "good", "바라는 일(소망)"),
  N("여울", "dictionary", "neutral", "normal", "강물이 얕고 빠르게 흐르는 곳"),
  N("아람", "dictionary", "neutral", "normal", "밤 따위가 충분히 익은 상태"),
  N("믿음", "dictionary", "neutral", "good", "믿는 마음"),
  N("샛별", "dictionary", "neutral", "good", "새벽 동쪽 하늘에 뜨는 금성. 사전에는 '장래에 큰 발전을 이룩할 만한 사람'이라는 뜻도 있어요"),
  N("새봄", "dictionary", "neutral", "good", "새로 맞는 봄"),
  N("가을", "dictionary", "neutral", "normal", "결실의 계절"),
  N("여름", "dictionary", "neutral", "normal", "한 해의 셋째 계절"),
  N("이레", "dictionary", "neutral", "normal", "일곱 날"),
  N("이랑", "dictionary", "neutral", "normal", "갈아 놓은 밭의 두둑과 고랑"),
  N("나라", "dictionary", "neutral", "normal", "나라"),
  N("보름", "dictionary", "neutral", "normal", "음력 보름날(보름달)"),
  N("새벽", "dictionary", "neutral", "normal", "날이 밝을 무렵"),
  N("아침", "dictionary", "neutral", "normal", "하루가 시작되는 때"),
  N("햇살", "dictionary", "neutral", "good", "해가 내쏘는 빛"),
  N("겨레", "dictionary", "male", "normal", "같은 핏줄을 이어받은 민족"),
  N("한길", "dictionary", "male", "normal", "넓고 큰 길"),
  N("나래", "dictionary", "female", "good", "'날개'를 문학적으로 이르는 말"),
  N("이슬", "dictionary", "female", "good", "맑은 이슬"),
  N("단비", "dictionary", "female", "good", "꼭 필요할 때 알맞게 내리는 비"),
  N("노을", "dictionary", "female", "normal", "해 질 무렵 붉게 물든 하늘"),
  N("윤슬", "dictionary", "female", "good", "햇빛·달빛에 반짝이는 잔물결"),
  N("다래", "dictionary", "female", "normal", "다래나무의 열매"),
  N("보라", "dictionary", "female", "normal", "보랏빛"),
  N("나비", "dictionary", "female", "normal", "나비"),
  N("하나", "dictionary", "female", "normal", "하나뿐인"),
  N("송이", "dictionary", "female", "normal", "꽃·열매의 송이"),
  N("사랑", "dictionary", "female", "good", "아끼고 귀하게 여기는 마음"),
  N("기쁨", "dictionary", "female", "good", "기쁜 마음"),
  N("버들", "dictionary", "female", "normal", "버드나무"),
  N("별빛", "dictionary", "female", "good", "별의 반짝이는 빛"),
  N("달빛", "dictionary", "female", "good", "달에서 비치는 빛"),
  N("소리", "dictionary", "female", "normal", "소리"),
  N("하늘빛", "dictionary", "female", "good", "하늘의 빛깔"),
  N("하늬", "dictionary", "female", "normal", "서쪽에서 부는 바람(하늬바람)"),
  N("산들", "dictionary", "neutral", "normal", "사늘한 바람이 가볍고 보드랍게 부는 모양"),
  N("가득", "dictionary", "neutral", "normal", "넘치도록 꽉 찬 모양"),
  N("고요", "dictionary", "neutral", "normal", "조용하고 잠잠한 상태"),
  N("고니", "dictionary", "neutral", "normal", "희고 우아한 물새(백조)"),
  N("꽃길", "dictionary", "neutral", "good", "꽃이 피어 있거나 꽃으로 장식된 길"),
  N("숨결", "dictionary", "neutral", "normal", "숨 쉬는 결·살아 있는 기운"),
  N("물결", "dictionary", "neutral", "normal", "물이 움직여 이루는 결"),
  N("새날", "dictionary", "neutral", "good", "새로 밝아 오는 날. 사전에는 '새롭게 다가올 앞날'이라는 뜻도 있어요"),
  N("나무", "dictionary", "neutral", "normal", "곧게 자라는 나무"),
  N("벼리", "dictionary", "neutral", "good", "일이나 글의 뼈대가 되는 줄거리"),
  N("한마음", "dictionary", "neutral", "good", "여럿이 하나로 합친 마음"),
  N("한뜻", "dictionary", "neutral", "good", "같은 뜻"),
  N("바위", "dictionary", "male", "normal", "크고 단단한 바위"),
  N("범", "dictionary", "male", "normal", "호랑이"),
  N("구슬", "dictionary", "female", "normal", "동글고 고운 보석 구슬. 사전에는 '아름답거나 귀중한 것'이라는 뜻도 있어요"),
  N("꿈결", "dictionary", "female", "normal", "꿈을 꾸는 듯 어렴풋한 동안"),
  N("꽃송이", "dictionary", "female", "normal", "꽃자루 끝의 꽃 한 송이. 사전에는 '앞날이 기대되는 어린 사람'이라는 뜻도 있어요"),
  // 이름용 조어
  N("나눔", "coined", "neutral", "good", "'나누다'에서 따온 이름"),
  N("초롱", "coined", "female", "normal", "'초롱초롱(눈빛이 맑고 또렷한 모양)'에서 따온 이름"),
  N("온누리", "coined", "neutral", "good", "'온(모든)'과 '누리(세상)'에서 따온 이름"),
  N("한아름", "coined", "female", "good", "'한 아름(두 팔로 안을 만큼)'에서 따온 이름"),
  N("아름", "coined", "female", "good", "'아름답다'에서 따온 이름"),
  N("다솜", "coined", "female", "good", "'사랑하다'를 뜻하는 옛말에서 따온 이름"),
  N("가람", "coined", "neutral", "good", "'강'을 뜻하는 옛말에서 따온 이름"),
  N("미르", "coined", "male", "good", "'용'을 뜻하는 옛말 '미르'에서 따온 이름"),
  N("한결", "coined", "male", "good", "'한결같다'에서 따온 이름"),
  N("새롬", "coined", "female", "good", "'새롭다'에서 따온 이름"),
  N("소담", "coined", "female", "good", "'소담하다(탐스럽다)'에서 따온 이름"),
  N("보미", "coined", "female", "good", "'봄'에서 따온 이름"),
  N("고운", "coined", "female", "good", "'곱다'에서 따온 이름"),
  N("빛나", "coined", "female", "good", "'빛나다'에서 따온 이름"),
  N("우람", "coined", "male", "good", "'우람하다'에서 따온 이름"),
  N("힘찬", "coined", "male", "good", "'힘차다'에서 따온 이름"),
  N("한뫼", "coined", "male", "good", "'한(크다)'과 '뫼(산)'에서 따온 이름"),
  N("찬솔", "coined", "male", "good", "'차다'와 '솔(소나무)'에서 따온 이름"),
  N("새힘", "coined", "male", "good", "'새'와 '힘'에서 따온 이름"),
  N("한빛", "coined", "neutral", "good", "'한(크다)'과 '빛'에서 따온 이름"),
  N("한별", "coined", "neutral", "good", "'한(크다)'과 '별'에서 따온 이름"),
  N("한솔", "coined", "neutral", "good", "'한(크다)'과 '솔(소나무)'에서 따온 이름"),
  N("해솔", "coined", "neutral", "good", "'해'와 '솔(소나무)'에서 따온 이름"),
  N("늘봄", "coined", "neutral", "good", "'늘'과 '봄'에서 따온 이름"),
  N("바름", "coined", "neutral", "good", "'바르다'에서 따온 이름"),
  N("어진", "coined", "neutral", "good", "'어질다'에서 따온 이름"),
  N("해든", "coined", "neutral", "good", "'해가 들다'에서 따온 이름"),
  N("이루", "coined", "neutral", "good", "'이루다'에서 따온 이름"),
  N("이룸", "coined", "neutral", "good", "'이루다'에서 따온 이름"),
  N("푸름", "coined", "neutral", "good", "'푸르다'에서 따온 이름"),
  N("도담", "coined", "neutral", "good", "'도담도담(탈 없이 잘 자라는 모양)'에서 따온 이름"),
  N("한가람", "coined", "neutral", "good", "'한(크다)'과 '가람(강)'에서 따온 이름"),
  N("큰솔", "coined", "male", "good", "'크다'와 '솔(소나무)'에서 따온 이름"),
  N("큰별", "coined", "male", "good", "'크다'와 '별'에서 따온 이름"),
  N("굳센", "coined", "male", "good", "'굳세다'에서 따온 이름"),
  N("곧은", "coined", "male", "good", "'곧다'에서 따온 이름"),
  N("너른", "coined", "male", "good", "'너르다(넓다)'에서 따온 이름"),
  N("한누리", "coined", "male", "good", "'한(크다)'과 '누리(세상)'에서 따온 이름"),
  N("늘찬", "coined", "male", "good", "'늘'과 '차다'에서 따온 이름"),
  N("해찬", "coined", "male", "good", "'해'와 '차다'에서 따온 이름"),
  N("가꿈", "coined", "neutral", "good", "'가꾸다'에서 따온 이름"),
  N("바른", "coined", "neutral", "good", "'바르다'에서 따온 이름"),
  // 널리 쓰이는 이름
  N("미리내", "popular", "female", "normal", "'은하수'라는 뜻으로 널리 알려진 이름이에요. 사전 근거는 확인되지 않았어요"),
  N("라온", "popular", "neutral", "normal", "'즐거운'이라는 뜻으로 널리 알려진 이름이에요. 옛 문헌 근거는 확인되지 않았어요"),
  N("아라", "popular", "female", "normal", "'바다'라는 뜻으로 널리 알려진 이름이에요. 옛 문헌 근거는 확인되지 않았어요"),
  N("다온", "popular", "neutral", "normal", "'좋은 일이 다 온다'는 뜻으로 널리 알려진 이름이에요. 낱말 근거는 확인되지 않았어요"),
  N("가온", "popular", "neutral", "normal", "'가운데·중심'이라는 뜻으로 널리 알려진 이름이에요. '가온'이라는 형태의 옛 문헌 근거는 확인되지 않았어요"),
  N("해밀", "popular", "neutral", "normal", "비가 갠 뒤 맑은 하늘이라는 뜻으로 널리 알려진 이름이에요. 사전·옛 문헌 근거는 확인되지 않았어요"),
  N("하람", "popular", "neutral", "normal", "'하늘이 내린 사람'이라는 뜻으로 널리 알려진 이름이에요. 낱말 근거는 확인되지 않았어요"),
  N("나린", "popular", "female", "normal", "'하늘에서 내린'이라는 뜻으로 널리 알려진 이름이에요. 낱말 근거는 확인되지 않았어요"),
  N("로운", "popular", "male", "normal", "'슬기로운·향기로운'의 '-로운'에서 따왔다고 알려진 이름이에요. 뜻 풀이는 출처마다 조금씩 달라요"),
  N("아리", "popular", "female", "normal", "'아리땁다'에서 따왔다고 알려진 이름이에요. '물'의 옛말이라는 풀이도 있지만 근거는 확인되지 않았어요"),
  N("이든", "popular", "male", "normal", "'착하고 어진'이라는 뜻으로 널리 알려진 이름이에요. 옛말에서 왔다는 풀이가 있지만 이름 형태의 근거는 확인되지 않았어요"),
  N("하랑", "popular", "neutral", "normal", "'하늘처럼 넓고 높게'라는 뜻으로 알려진 이름이에요. 뜻 풀이는 출처마다 조금씩 달라요"),
  N("다올", "popular", "neutral", "normal", "'하는 일마다 복이 온다'는 뜻으로 널리 알려진 이름이에요. 낱말 근거는 확인되지 않았어요"),
  N("초아", "popular", "female", "normal", "'초처럼 자신을 태워 세상을 밝히는 사람'이라는 뜻으로 널리 알려진 이름이에요. 낱말 근거는 확인되지 않았어요"),
];
