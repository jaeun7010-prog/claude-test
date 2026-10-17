/**
 * 자주 쓰는 이름 한자 허용 목록.
 *
 * 한자 뜻 등급(hanja-suitability.ts)은 영문 뜻풀이·훈·교육용 여부로 자동 판정하는데, 이 방식으로는
 * 이름에 널리 쓰이는 글자가 감점·제외되는 경우가 있다 (예: 鉉 "솥귀"가 사물로, 洙가 강 이름으로,
 * 允·胤이 교육용 아님 + 영문 뜻풀이 평범으로 분류됨). 여기 있는 글자는 자동 판정과 상관없이 "좋음"으로 본다
 * (displayOnly 항목은 풀이만 바꾸고 등급은 자동 판정을 따른다).
 * 불용한자(is_forbidden)는 이 목록과 상관없이 제외된다.
 *
 * 같은 한자라도 음에 따라 다른 글자로 보므로 한자와 음을 함께 적는다.
 *
 * nameHun(이름용 대표 풀이)이 있으면 화면과 PDF에서 사전 훈(hanja_dict.hun) 대신 보여 준다.
 * 사전 훈이 옛말·오타이거나 이름 뜻으로 어색할 때 쓴다. 사전 데이터는 바꾸지 않는다.
 */

export interface AllowedNameHanja {
  hanja: string;
  eum: string;
  /** 목록에 넣은 이유 (검토용) */
  reason: string;
  /** 이름용 대표 풀이의 훈 부분 (예: 景 → "볕"). 화면에는 "볕 경"으로 보인다 */
  nameHun?: string;
  /** true면 풀이만 바꾸고 뜻 등급은 자동 판정을 따른다 ("좋음"으로 올리지 않음) */
  displayOnly?: boolean;
}

const POPULAR = "인기 이름에 널리 쓰는 글자";
const GEM = "옥·빛 등 이름에 좋은 뜻이지만 자동 판정으로는 평범하게 분류됨";
const PLACE = "지명·강 이름 뜻풀이로 걸리지만 이름에 흔히 쓰는 글자";
const OBJECT = "사물 뜻풀이로 걸리지만 이름에 전통적으로 쓰는 글자";
const DISPLAY = "사전 훈이 이름 뜻으로 어색해 풀이만 바꾸는 글자 (등급은 자동 판정)";

export const NAME_HANJA_ALLOWLIST: readonly AllowedNameHanja[] = [
  // ㄱ
  { hanja: "建", eum: "건", reason: POPULAR },
  { hanja: "健", eum: "건", reason: POPULAR },
  { hanja: "京", eum: "경", reason: POPULAR },
  { hanja: "景", eum: "경", reason: POPULAR, nameHun: "볕" },
  { hanja: "慶", eum: "경", reason: POPULAR },
  { hanja: "璟", eum: "경", reason: GEM, nameHun: "옥빛" },
  { hanja: "炅", eum: "경", reason: GEM },
  { hanja: "圭", eum: "규", reason: OBJECT },
  { hanja: "奎", eum: "규", reason: POPULAR },
  { hanja: "珪", eum: "규", reason: OBJECT },
  { hanja: "揆", eum: "규", reason: POPULAR },
  // ㄴ·ㄷ
  { hanja: "娜", eum: "나", reason: POPULAR },
  { hanja: "多", eum: "다", reason: POPULAR },
  { hanja: "道", eum: "도", reason: POPULAR },
  { hanja: "燾", eum: "도", reason: POPULAR },
  { hanja: "東", eum: "동", reason: POPULAR },
  // ㄹ·ㅁ
  { hanja: "璘", eum: "린", reason: GEM },
  { hanja: "潾", eum: "린", reason: POPULAR },
  { hanja: "律", eum: "율", reason: POPULAR },
  { hanja: "民", eum: "민", reason: POPULAR },
  { hanja: "敏", eum: "민", reason: POPULAR },
  { hanja: "旻", eum: "민", reason: POPULAR },
  { hanja: "玟", eum: "민", reason: GEM },
  { hanja: "珉", eum: "민", reason: GEM, nameHun: "옥돌" },
  { hanja: "岷", eum: "민", reason: PLACE, nameHun: "산 이름" },
  // ㅂ
  { hanja: "範", eum: "범", reason: POPULAR },
  { hanja: "彬", eum: "빈", reason: POPULAR },
  { hanja: "斌", eum: "빈", reason: POPULAR },
  // ㅅ
  { hanja: "尙", eum: "상", reason: POPULAR, nameHun: "숭상할" },
  { hanja: "瑞", eum: "서", reason: POPULAR, nameHun: "상서로울" },
  { hanja: "書", eum: "서", reason: POPULAR },
  { hanja: "舒", eum: "서", reason: POPULAR },
  { hanja: "敍", eum: "서", reason: POPULAR },
  { hanja: "錫", eum: "석", reason: OBJECT, nameHun: "베풀" },
  { hanja: "碩", eum: "석", reason: POPULAR },
  { hanja: "晳", eum: "석", reason: POPULAR },
  { hanja: "成", eum: "성", reason: POPULAR },
  { hanja: "誠", eum: "성", reason: POPULAR, nameHun: "정성" },
  { hanja: "星", eum: "성", reason: POPULAR },
  { hanja: "聖", eum: "성", reason: POPULAR },
  { hanja: "晟", eum: "성", reason: POPULAR },
  { hanja: "昭", eum: "소", reason: POPULAR, nameHun: "밝을" },
  { hanja: "炤", eum: "소", reason: POPULAR },
  { hanja: "素", eum: "소", reason: POPULAR, nameHun: "본디" },
  { hanja: "韶", eum: "소", reason: POPULAR },
  { hanja: "秀", eum: "수", reason: POPULAR },
  { hanja: "洙", eum: "수", reason: PLACE },
  { hanja: "修", eum: "수", reason: POPULAR },
  { hanja: "壽", eum: "수", reason: POPULAR, nameHun: "오래 살" },
  { hanja: "守", eum: "수", reason: POPULAR },
  { hanja: "承", eum: "승", reason: POPULAR },
  { hanja: "昇", eum: "승", reason: POPULAR, nameHun: "오를" },
  { hanja: "勝", eum: "승", reason: POPULAR },
  { hanja: "時", eum: "시", reason: POPULAR },
  { hanja: "是", eum: "시", reason: POPULAR, nameHun: "옳을" },
  { hanja: "詩", eum: "시", reason: POPULAR, nameHun: "시" },
  { hanja: "始", eum: "시", reason: POPULAR, nameHun: "처음" },
  // ㅇ
  { hanja: "雅", eum: "아", reason: POPULAR, nameHun: "우아할" },
  { hanja: "娥", eum: "아", reason: POPULAR },
  { hanja: "亞", eum: "아", reason: POPULAR },
  { hanja: "姸", eum: "연", reason: POPULAR, nameHun: "고울" },
  { hanja: "娟", eum: "연", reason: POPULAR },
  { hanja: "延", eum: "연", reason: POPULAR, nameHun: "늘일" },
  { hanja: "然", eum: "연", reason: POPULAR, nameHun: "그럴" },
  { hanja: "蓮", eum: "연", reason: POPULAR },
  { hanja: "淵", eum: "연", reason: POPULAR, nameHun: "깊을" },
  { hanja: "沇", eum: "연", reason: PLACE },
  { hanja: "英", eum: "영", reason: POPULAR, nameHun: "뛰어날" },
  { hanja: "榮", eum: "영", reason: POPULAR },
  { hanja: "瑛", eum: "영", reason: GEM },
  { hanja: "映", eum: "영", reason: POPULAR },
  { hanja: "永", eum: "영", reason: POPULAR },
  { hanja: "藝", eum: "예", reason: POPULAR },
  { hanja: "睿", eum: "예", reason: POPULAR },
  { hanja: "叡", eum: "예", reason: POPULAR },
  { hanja: "譽", eum: "예", reason: POPULAR },
  { hanja: "宇", eum: "우", reason: POPULAR },
  { hanja: "祐", eum: "우", reason: POPULAR },
  { hanja: "佑", eum: "우", reason: POPULAR },
  { hanja: "雨", eum: "우", reason: POPULAR },
  { hanja: "友", eum: "우", reason: POPULAR },
  { hanja: "瑀", eum: "우", reason: GEM },
  { hanja: "元", eum: "원", reason: POPULAR },
  { hanja: "源", eum: "원", reason: POPULAR },
  { hanja: "媛", eum: "원", reason: POPULAR, nameHun: "미인" },
  { hanja: "瑗", eum: "원", reason: GEM, nameHun: "구슬" },
  { hanja: "苑", eum: "원", reason: POPULAR, nameHun: "동산" },
  { hanja: "圓", eum: "원", reason: POPULAR },
  { hanja: "柔", eum: "유", reason: POPULAR },
  { hanja: "侑", eum: "유", reason: POPULAR },
  { hanja: "裕", eum: "유", reason: POPULAR },
  { hanja: "有", eum: "유", reason: POPULAR },
  { hanja: "維", eum: "유", reason: POPULAR, nameHun: "이을" },
  { hanja: "宥", eum: "유", reason: POPULAR },
  { hanja: "允", eum: "윤", reason: POPULAR, nameHun: "진실로" },
  { hanja: "胤", eum: "윤", reason: POPULAR },
  { hanja: "潤", eum: "윤", reason: POPULAR, nameHun: "윤택할" },
  { hanja: "玧", eum: "윤", reason: GEM, nameHun: "옥빛" },
  { hanja: "昀", eum: "윤", reason: GEM, nameHun: "햇빛" },
  { hanja: "恩", eum: "은", reason: POPULAR },
  { hanja: "銀", eum: "은", reason: POPULAR },
  { hanja: "垠", eum: "은", reason: POPULAR },
  { hanja: "殷", eum: "은", reason: POPULAR, nameHun: "성할" },
  { hanja: "誾", eum: "은", reason: POPULAR, nameHun: "온화할" },
  // 利는 사전 훈이 "날카로울"이라 풀이만 바꾼다. 등급까지 올리면 상위 추천이 利 이름으로 몰린다
  { hanja: "利", eum: "리", reason: DISPLAY, nameHun: "이로울", displayOnly: true },
  { hanja: "利", eum: "이", reason: DISPLAY, nameHun: "이로울", displayOnly: true },
  { hanja: "仁", eum: "인", reason: POPULAR },
  { hanja: "寅", eum: "인", reason: POPULAR, nameHun: "셋째 지지" },
  // 이름 뜻 한 줄(name-meaning.ts)의 문구와 화면 훈을 맞추려고 풀이만 바꾼다 (2026-10-18 사용자 승인)
  { hanja: "燃", eum: "연", reason: DISPLAY, nameHun: "타오를", displayOnly: true },
  { hanja: "淡", eum: "담", reason: DISPLAY, nameHun: "맑을", displayOnly: true },
  { hanja: "璐", eum: "로", reason: DISPLAY, nameHun: "아름다운 옥", displayOnly: true },
  // ㅈ
  { hanja: "在", eum: "재", reason: POPULAR },
  { hanja: "載", eum: "재", reason: POPULAR },
  { hanja: "宰", eum: "재", reason: POPULAR },
  { hanja: "才", eum: "재", reason: POPULAR },
  { hanja: "正", eum: "정", reason: POPULAR },
  { hanja: "貞", eum: "정", reason: POPULAR },
  { hanja: "晶", eum: "정", reason: POPULAR, nameHun: "맑을" },
  { hanja: "廷", eum: "정", reason: POPULAR },
  { hanja: "姃", eum: "정", reason: POPULAR, nameHun: "단정할" },
  { hanja: "周", eum: "주", reason: POPULAR },
  { hanja: "柱", eum: "주", reason: OBJECT },
  { hanja: "宙", eum: "주", reason: POPULAR },
  { hanja: "珠", eum: "주", reason: GEM },
  { hanja: "俊", eum: "준", reason: POPULAR, nameHun: "뛰어날" },
  { hanja: "埈", eum: "준", reason: POPULAR, nameHun: "높을" },
  { hanja: "峻", eum: "준", reason: POPULAR },
  { hanja: "晙", eum: "준", reason: POPULAR },
  { hanja: "濬", eum: "준", reason: POPULAR, nameHun: "깊을" },
  { hanja: "準", eum: "준", reason: POPULAR, nameHun: "법도" },
  { hanja: "竣", eum: "준", reason: POPULAR },
  { hanja: "智", eum: "지", reason: POPULAR },
  { hanja: "志", eum: "지", reason: POPULAR },
  { hanja: "知", eum: "지", reason: POPULAR },
  { hanja: "祉", eum: "지", reason: POPULAR },
  { hanja: "芝", eum: "지", reason: POPULAR },
  { hanja: "址", eum: "지", reason: POPULAR },
  { hanja: "眞", eum: "진", reason: POPULAR },
  { hanja: "鎭", eum: "진", reason: POPULAR },
  { hanja: "珍", eum: "진", reason: GEM },
  { hanja: "辰", eum: "진", reason: POPULAR, nameHun: "별" },
  // ㅊ
  { hanja: "燦", eum: "찬", reason: POPULAR },
  { hanja: "讚", eum: "찬", reason: POPULAR },
  { hanja: "璨", eum: "찬", reason: GEM },
  { hanja: "采", eum: "채", reason: POPULAR, nameHun: "풍채" },
  { hanja: "彩", eum: "채", reason: POPULAR, nameHun: "채색" },
  { hanja: "埰", eum: "채", reason: POPULAR },
  // ㅌ·ㅎ
  { hanja: "泰", eum: "태", reason: POPULAR },
  { hanja: "太", eum: "태", reason: POPULAR },
  { hanja: "兌", eum: "태", reason: POPULAR },
  { hanja: "河", eum: "하", reason: POPULAR },
  { hanja: "夏", eum: "하", reason: POPULAR },
  { hanja: "昰", eum: "하", reason: POPULAR },
  { hanja: "霞", eum: "하", reason: POPULAR, nameHun: "노을" },
  { hanja: "韓", eum: "한", reason: "교육용 글자 중 지명 뜻풀이로 걸리지만 이름에 흔히 쓰는 글자", nameHun: "한국" },
  { hanja: "漢", eum: "한", reason: POPULAR, nameHun: "은하수" },
  { hanja: "翰", eum: "한", reason: POPULAR },
  { hanja: "賢", eum: "현", reason: POPULAR },
  { hanja: "鉉", eum: "현", reason: OBJECT },
  { hanja: "炫", eum: "현", reason: POPULAR },
  { hanja: "玹", eum: "현", reason: GEM, nameHun: "옥돌" },
  { hanja: "顯", eum: "현", reason: POPULAR },
  { hanja: "泫", eum: "현", reason: POPULAR },
  { hanja: "晛", eum: "현", reason: POPULAR, nameHun: "햇살" },
  { hanja: "赫", eum: "혁", reason: POPULAR, nameHun: "빛날" },
  { hanja: "爀", eum: "혁", reason: POPULAR },
  { hanja: "惠", eum: "혜", reason: POPULAR },
  { hanja: "慧", eum: "혜", reason: POPULAR },
  { hanja: "浩", eum: "호", reason: POPULAR, nameHun: "넓을" },
  { hanja: "昊", eum: "호", reason: POPULAR },
  { hanja: "晧", eum: "호", reason: POPULAR },
  { hanja: "皓", eum: "호", reason: POPULAR, nameHun: "밝을" },
  { hanja: "鎬", eum: "호", reason: PLACE, nameHun: "빛날" },
  { hanja: "祜", eum: "호", reason: POPULAR },
  { hanja: "勳", eum: "훈", reason: POPULAR },
  { hanja: "薰", eum: "훈", reason: POPULAR, nameHun: "향풀" },
  { hanja: "熙", eum: "희", reason: POPULAR },
  { hanja: "姬", eum: "희", reason: POPULAR, nameHun: "여자" },
  { hanja: "希", eum: "희", reason: POPULAR },
  { hanja: "喜", eum: "희", reason: POPULAR, nameHun: "기쁠" },
  { hanja: "禧", eum: "희", reason: POPULAR },
];

const BY_KEY = new Map(NAME_HANJA_ALLOWLIST.map((c) => [`${c.hanja}|${c.eum}`, c]));

/** 뜻 등급을 "좋음"으로 보는 글자인가 (풀이만 바꾸는 displayOnly 항목은 제외) */
export const isAllowedNameHanja = (hanja: string, eum: string) => {
  const c = BY_KEY.get(`${hanja}|${eum}`);
  return !!c && !c.displayOnly;
};

/** 이름용 대표 풀이의 훈. 지정되지 않았으면 null (사전 훈을 쓴다) */
export const nameHunOf = (hanja: string, eum: string) => BY_KEY.get(`${hanja}|${eum}`)?.nameHun ?? null;
