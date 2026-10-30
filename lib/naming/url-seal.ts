import { createCipheriv, createDecipheriv, createHmac } from "node:crypto";

import { redirect } from "next/navigation";

/**
 * 주소의 입력 조건 암호화. 생년월일·시각·출생지 같은 조건을 `c=암호문` 하나로 묶어 주소·방문 기록·서버 로그에 보이지 않게 한다.
 * 서버 전용 (키는 NAMING_URL_KEY, base64 32바이트). DB에는 지금처럼 평문 조건(filters.qs, item_options.qs)을 둔다.
 * 키를 바꾸면 예전 암호화 주소는 열리지 않는다 (저장한 이름·주문은 평문이라 그대로). 키가 없으면 평문 주소로 동작한다.
 */

export const SEALED_PARAM = "c";

/** parseNamingParams가 읽는 조건. 탭·이름·저장 표시처럼 화면에만 쓰는 값은 암호문 밖에 그대로 둔다 */
const SEALED_KEYS = new Set([
  "surname", "sh", "ps", "psh", "date", "time", "late", "place", "tz", "lon",
  "gender", "len", "dol", "dolpos", "glob", "neutral", "rarity",
]);

const VERSION = "v1.";
const IV_BYTES = 12;
const TAG_BYTES = 16;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

let warned = false;
function urlKey(): Buffer | null {
  const value = process.env.NAMING_URL_KEY;
  const key = value ? Buffer.from(value, "base64") : null;
  if (key?.length === 32) return key;
  if (!warned) {
    warned = true;
    console.error("[url-seal] NAMING_URL_KEY가 없거나 32바이트가 아니라 주소를 암호화하지 않습니다");
  }
  return null;
}

/** 같은 조건이면 같은 주소가 나오도록 IV를 평문에서 만든다 (같은 평문끼리만 IV가 겹친다) */
function encrypt(plain: string, key: Buffer): string {
  const iv = createHmac("sha256", key).update(plain).digest().subarray(0, IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return VERSION + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function decrypt(token: string, key: Buffer): string | null {
  if (!token.startsWith(VERSION)) return null;
  const data = Buffer.from(token.slice(VERSION.length), "base64url");
  if (data.length <= IV_BYTES + TAG_BYTES) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, IV_BYTES));
    decipher.setAuthTag(data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(data.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** 쿼리스트링의 입력 조건을 암호문으로 묶는다. 이미 묶였거나 조건이 없으면 그대로 */
export function sealQuery(qs: string): string {
  const key = urlKey();
  if (!key) return qs;
  const inner = new URLSearchParams();
  const rest = new URLSearchParams();
  new URLSearchParams(qs).forEach((v, k) => (SEALED_KEYS.has(k) ? inner : rest).append(k, v));
  if (!inner.size) return qs;
  const outer = rest.toString();
  return `${SEALED_PARAM}=${encrypt(inner.toString(), key)}${outer ? `&${outer}` : ""}`;
}

/** 주소 값 → 평문 조건. 예전 평문 주소는 그대로이고, 풀 수 없는 암호문은 조건이 없는 것으로 본다 (입력 화면으로 안내됨) */
export function openSearch(raw: Raw): Raw {
  const token = one(raw[SEALED_PARAM]);
  if (!token) return raw;
  const rest = { ...raw };
  delete rest[SEALED_PARAM];
  const key = urlKey();
  const plain = key && decrypt(token, key);
  return plain ? { ...Object.fromEntries(new URLSearchParams(plain)), ...rest } : rest;
}

/** 쿼리스트링 → 평문 쿼리스트링 (주문에 조건을 남길 때, 같은 아이인지 비교할 때) */
export function openQuery(qs: string): string {
  const opened = openSearch(Object.fromEntries(new URLSearchParams(qs)));
  return new URLSearchParams(opened as Record<string, string>).toString();
}

/** 예전 평문 주소로 들어오면 암호화 주소로 옮긴다. 키가 없으면 그대로 연다 */
export function redirectIfPlain(path: string, raw: Raw) {
  if (!one(raw.date) || !urlKey()) return;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(openSearch(raw))) if (v !== undefined) q.set(k, one(v));
  redirect(`${path}?${sealQuery(q.toString())}`);
}
