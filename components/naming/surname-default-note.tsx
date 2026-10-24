import type { NamingParams } from "@/lib/naming/params";

/** 받침이 없거나 ㄹ 받침이면 "로", 그 밖의 받침이면 "으로" (한자는 읽는 소리 기준) */
function ro(word: string): string {
  const coda = (word.charCodeAt(word.length - 1) - 0xac00) % 28;
  return coda === 0 || coda === 8 ? "로" : "으로";
}

/** 주소의 성씨 한자가 비어 있거나 성씨 표에 없어 기본 한자로 계산했을 때 알린다 (params.ts의 defaultedSurnames) */
export function SurnameDefaultNote({ p }: { p: NamingParams }) {
  if (p.defaultedSurnames.length === 0) return null;
  const hanjaOf = (hangul: string) => (hangul === p.surname ? p.surnameHanja : p.parentSurname?.hanja ?? "");
  return (
    <p role="status" className="rounded-md bg-secondary p-3 text-sm break-keep">
      성씨 한자를 확인할 수 없어 {p.defaultedSurnames.map((s) => `${s}씨는 ${hanjaOf(s)}${ro(s)}`).join(", ")} 계산했어요. 다른 한자라면 다시 입력해 주세요.
    </p>
  );
}
