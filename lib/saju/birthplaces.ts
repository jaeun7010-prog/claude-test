/**
 * 출생지 → 시간대 + 경도. 일주·시주를 출생지 경도 기준 평균태양시로 보정할 때 쓴다.
 * 국내는 시도청 소재지, 해외는 도시 중심 좌표 기준이다. 목록 밖 해외 출생은 "기타"로 직접 입력받는다.
 */
export interface Birthplace {
  id: string;
  label: string;
  group: "국내" | "해외";
  /** IANA 시간대 */
  timeZone: string;
  /** 동경 +, 서경 − (도) */
  longitude: number;
}

export const DEFAULT_BIRTHPLACE_ID = "seoul";
/** 목록 밖 해외 출생 (시간대·경도 직접 입력) */
export const CUSTOM_BIRTHPLACE_ID = "etc";

const KR = "Asia/Seoul";

export const BIRTHPLACES: readonly Birthplace[] = [
  { id: "seoul", label: "서울", group: "국내", timeZone: KR, longitude: 126.978 },
  { id: "busan", label: "부산", group: "국내", timeZone: KR, longitude: 129.075 },
  { id: "daegu", label: "대구", group: "국내", timeZone: KR, longitude: 128.601 },
  { id: "incheon", label: "인천", group: "국내", timeZone: KR, longitude: 126.705 },
  { id: "gwangju", label: "광주", group: "국내", timeZone: KR, longitude: 126.851 },
  { id: "daejeon", label: "대전", group: "국내", timeZone: KR, longitude: 127.385 },
  { id: "ulsan", label: "울산", group: "국내", timeZone: KR, longitude: 129.311 },
  { id: "sejong", label: "세종", group: "국내", timeZone: KR, longitude: 127.289 },
  { id: "gyeonggi", label: "경기", group: "국내", timeZone: KR, longitude: 127.009 },
  { id: "gangwon", label: "강원", group: "국내", timeZone: KR, longitude: 127.73 },
  { id: "chungbuk", label: "충북", group: "국내", timeZone: KR, longitude: 127.491 },
  { id: "chungnam", label: "충남", group: "국내", timeZone: KR, longitude: 126.672 },
  { id: "jeonbuk", label: "전북", group: "국내", timeZone: KR, longitude: 127.108 },
  { id: "jeonnam", label: "전남", group: "국내", timeZone: KR, longitude: 126.463 },
  { id: "gyeongbuk", label: "경북", group: "국내", timeZone: KR, longitude: 128.505 },
  { id: "gyeongnam", label: "경남", group: "국내", timeZone: KR, longitude: 128.692 },
  { id: "jeju", label: "제주", group: "국내", timeZone: KR, longitude: 126.498 },

  { id: "tokyo", label: "일본 도쿄", group: "해외", timeZone: "Asia/Tokyo", longitude: 139.692 },
  { id: "osaka", label: "일본 오사카", group: "해외", timeZone: "Asia/Tokyo", longitude: 135.502 },
  { id: "beijing", label: "중국 베이징", group: "해외", timeZone: "Asia/Shanghai", longitude: 116.407 },
  { id: "shanghai", label: "중국 상하이", group: "해외", timeZone: "Asia/Shanghai", longitude: 121.474 },
  { id: "hongkong", label: "홍콩", group: "해외", timeZone: "Asia/Hong_Kong", longitude: 114.169 },
  { id: "taipei", label: "대만 타이베이", group: "해외", timeZone: "Asia/Taipei", longitude: 121.565 },
  { id: "ulaanbaatar", label: "몽골 울란바토르", group: "해외", timeZone: "Asia/Ulaanbaatar", longitude: 106.906 },
  { id: "hanoi", label: "베트남 하노이", group: "해외", timeZone: "Asia/Ho_Chi_Minh", longitude: 105.834 },
  { id: "hochiminh", label: "베트남 호찌민", group: "해외", timeZone: "Asia/Ho_Chi_Minh", longitude: 106.63 },
  { id: "bangkok", label: "태국 방콕", group: "해외", timeZone: "Asia/Bangkok", longitude: 100.502 },
  { id: "manila", label: "필리핀 마닐라", group: "해외", timeZone: "Asia/Manila", longitude: 120.984 },
  { id: "singapore", label: "싱가포르", group: "해외", timeZone: "Asia/Singapore", longitude: 103.82 },
  { id: "jakarta", label: "인도네시아 자카르타", group: "해외", timeZone: "Asia/Jakarta", longitude: 106.846 },
  { id: "dubai", label: "아랍에미리트 두바이", group: "해외", timeZone: "Asia/Dubai", longitude: 55.271 },
  { id: "sydney", label: "호주 시드니", group: "해외", timeZone: "Australia/Sydney", longitude: 151.209 },
  { id: "melbourne", label: "호주 멜버른", group: "해외", timeZone: "Australia/Melbourne", longitude: 144.963 },
  { id: "auckland", label: "뉴질랜드 오클랜드", group: "해외", timeZone: "Pacific/Auckland", longitude: 174.763 },
  { id: "london", label: "영국 런던", group: "해외", timeZone: "Europe/London", longitude: -0.128 },
  { id: "paris", label: "프랑스 파리", group: "해외", timeZone: "Europe/Paris", longitude: 2.352 },
  { id: "berlin", label: "독일 베를린", group: "해외", timeZone: "Europe/Berlin", longitude: 13.405 },
  { id: "frankfurt", label: "독일 프랑크푸르트", group: "해외", timeZone: "Europe/Berlin", longitude: 8.682 },
  { id: "newyork", label: "미국 뉴욕", group: "해외", timeZone: "America/New_York", longitude: -74.006 },
  { id: "boston", label: "미국 보스턴", group: "해외", timeZone: "America/New_York", longitude: -71.059 },
  { id: "washington", label: "미국 워싱턴 D.C.", group: "해외", timeZone: "America/New_York", longitude: -77.037 },
  { id: "atlanta", label: "미국 애틀랜타", group: "해외", timeZone: "America/New_York", longitude: -84.388 },
  { id: "chicago", label: "미국 시카고", group: "해외", timeZone: "America/Chicago", longitude: -87.63 },
  { id: "houston", label: "미국 휴스턴", group: "해외", timeZone: "America/Chicago", longitude: -95.37 },
  { id: "losangeles", label: "미국 로스앤젤레스", group: "해외", timeZone: "America/Los_Angeles", longitude: -118.244 },
  { id: "sanfrancisco", label: "미국 샌프란시스코", group: "해외", timeZone: "America/Los_Angeles", longitude: -122.419 },
  { id: "seattle", label: "미국 시애틀", group: "해외", timeZone: "America/Los_Angeles", longitude: -122.332 },
  { id: "honolulu", label: "미국 호놀룰루", group: "해외", timeZone: "Pacific/Honolulu", longitude: -157.858 },
  { id: "toronto", label: "캐나다 토론토", group: "해외", timeZone: "America/Toronto", longitude: -79.383 },
  { id: "vancouver", label: "캐나다 밴쿠버", group: "해외", timeZone: "America/Vancouver", longitude: -123.121 },
  { id: "saopaulo", label: "브라질 상파울루", group: "해외", timeZone: "America/Sao_Paulo", longitude: -46.633 },
];

const BY_ID = new Map(BIRTHPLACES.map((b) => [b.id, b]));

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * 출생지 id(+ 기타 입력) → Birthplace. id가 비어 있으면 서울(예전 링크 호환).
 * 알 수 없는 id나 잘못된 직접 입력이면 null.
 */
export function resolveBirthplace(
  id: string,
  custom?: { timeZone: string; longitude: string }
): Birthplace | null {
  if (!id) return BY_ID.get(DEFAULT_BIRTHPLACE_ID)!;
  if (id !== CUSTOM_BIRTHPLACE_ID) return BY_ID.get(id) ?? null;

  const timeZone = custom?.timeZone.trim() ?? "";
  const lonText = custom?.longitude.trim() ?? "";
  const longitude = Number(lonText);
  if (!isValidTimeZone(timeZone) || !lonText || !Number.isFinite(longitude)) return null;
  if (longitude < -180 || longitude > 180) return null;
  return {
    id: CUSTOM_BIRTHPLACE_ID,
    label: `기타 해외 (${timeZone})`,
    group: "해외",
    timeZone,
    longitude,
  };
}
