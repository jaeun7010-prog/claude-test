import { firstSoundKey } from "@/lib/naming/priorities";
console.log(["루","누","뢰","뇌","려","녀","여","린","인","렬","라","로","리","니","하","태"].map((s)=>`${s}→${firstSoundKey(s)}`).join(" "));
