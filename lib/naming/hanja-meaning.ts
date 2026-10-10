/**
 * 한자 뜻풀이(Unihan 영문 gloss) 기반 후보 선별.
 *
 * 교육용 여부와 무관하게, 인명용 한자 전체에서 뜻이 부정적이거나 불분명한 글자를 빼고
 * 나머지를 같은 조건으로 조합한다. 불용한자 목록(is_forbidden)에 오르지 않은 글자도 여기서 한 번 더 거른다.
 */

/** 슬픔·병·죽음·흉함·범죄·불쾌한 대상 등 이름에 쓰기 꺼려지는 뜻 */
const NEGATIVE_GLOSS =
  /\b(die|dies|died|dying|dead|death|deceased|corpse|kill|killing|murder|slaughter|sick|sickness|disease|illness|ill|plague|leprosy|disabled|crippled|blind|deaf|mute|evil|wicked|vicious|cruel|violent|fierce|ghost|demon|devil|monster|prison|jail|imprison|poor|poverty|beggar|weep|weeping|cry|crying|sad|sadness|sorrow|sorrowful|grief|mourn|mourning|lament|bitter|lonely|miserable|grave|tomb|funeral|coffin|decay|rot|rotten|stink|stench|filthy|dirty|ugly|vulgar|disaster|calamity|misfortune|unlucky|inauspicious|ominous|punish|punishment|crime|criminal|slave|servant|bandit|thief|steal|rob|cheat|deceive|false|lie|hate|hatred|anger|angry|rage|fear|afraid|terror|pain|painful|suffer|suffering|trouble|worry|anxiety|dull|stupid|fool|foolish|lazy|widow|orphan|toilet|vomit|urine|dung|excrement|pig|dog|rat|snake|worm|insect|lice|flea|fall|ruin|destroy|destruction|broken|wound|injure|injury|bleed|blood|curse|poison|drown|hang|execute|abandon|lose|loss|defeat|fail|failure)\b/i;

/** 변체자·고자 등 뜻이 불분명한 글자 */
const UNCLEAR_GLOSS =
  /\b(variant|variants|old form|ancient form|archaic|obsolete|non-classical|erroneous|mistaken|corrupt|same as|radical)\b/i;

/** 긍정적인 뜻 — 순위를 소폭 올리는 가산점에만 쓴다 */
const POSITIVE_GLOSS =
  /\b(bright|brightness|brilliant|shine|shining|light|luminous|wise|wisdom|clever|intelligent|virtue|virtuous|benevolent|benevolence|kind|kindness|gentle|graceful|elegant|refined|beautiful|beauty|pretty|lovely|jade|gem|jewel|pearl|precious|fortune|fortunate|auspicious|lucky|happy|happiness|joy|joyful|peace|peaceful|harmony|harmonious|prosper|prosperous|abundant|flourish|flourishing|noble|honor|honour|honest|sincere|faithful|loyal|talent|talented|excellent|outstanding|great|grand|lofty|high|vast|spring|dawn|sun|moon|star|cloud|flower|blossom|orchid|bamboo|pine|jade|rain|sky|heaven|sea|ocean|river|clear|pure|fragrant|fragrance|sweet|warm|gentle|soft)\b/i;

/** 이름에 쓸 수 있는 뜻인지 (뜻풀이가 없으면 판단할 수 없어 제외) */
export function hasAcceptableMeaning(meaning: string | null): boolean {
  if (!meaning || !meaning.trim()) return false;
  return !NEGATIVE_GLOSS.test(meaning) && !UNCLEAR_GLOSS.test(meaning);
}

/** 뜻이 긍정적이면 true */
export const hasPositiveMeaning = (meaning: string | null) =>
  !!meaning && POSITIVE_GLOSS.test(meaning);
