"use strict";

/* ===================== 데이터 ===================== */

// [한자, 음, 원획]
const SURNAMES = [
  ["金","김",8],["李","이",7],["朴","박",6],["崔","최",11],["鄭","정",19],["姜","강",9],["趙","조",14],
  ["尹","윤",4],["張","장",11],["林","임",8],["韓","한",17],["吳","오",7],["徐","서",10],["申","신",5],
  ["權","권",22],["黃","황",12],["安","안",6],["宋","송",7],["柳","류",9],["洪","홍",10],["全","전",6],
  ["高","고",10],["文","문",4],["孫","손",10],["梁","양",11],["裵","배",14],["白","백",5],["曺","조",11],
  ["許","허",11],["劉","유",15],["南","남",9],["沈","심",8],["盧","노",16],["河","하",9],["郭","곽",15],
  ["成","성",7],["車","차",7],["朱","주",6],["禹","우",9],["具","구",8],["辛","신",7],["任","임",6],
  ["田","전",5],["閔","민",12],["羅","나",19],["陳","진",16],["池","지",7],["嚴","엄",20],["蔡","채",17],
  ["元","원",4],["千","천",3],["方","방",4],["孔","공",4],["康","강",11],["玄","현",5],["咸","함",9],
  ["卞","변",4],["廉","염",13],["楊","양",13],["邊","변",22],["呂","여",7],["魚","어",11]
];

// [한자, 음, 원획, 뜻]  (원획: 氵=水4, 艹=艸6, 扌=手4, 王=玉5, 礻=示5 등 원형 기준)
const HANJA = [
  ["民","민",5,"백성"],["敏","민",11,"민첩할"],["玟","민",9,"옥돌"],["珉","민",10,"옥돌"],["旻","민",8,"가을하늘"],
  ["俊","준",9,"준걸"],["準","준",14,"법도"],["賢","현",15,"어질"],["炫","현",9,"밝을"],["鉉","현",13,"솥귀"],["絃","현",11,"악기줄"],
  ["秀","수",7,"빼어날"],["洙","수",10,"물가"],["守","수",6,"지킬"],
  ["英","영",11,"꽃부리"],["永","영",5,"길"],["榮","영",14,"영화"],
  ["智","지",12,"지혜"],["知","지",8,"알"],["志","지",7,"뜻"],
  ["勳","훈",16,"공"],["訓","훈",10,"가르칠"],
  ["宇","우",6,"집"],["友","우",4,"벗"],["雨","우",8,"비"],["優","우",17,"넉넉할"],
  ["振","진",11,"떨칠"],["鎭","진",18,"진압할"],["眞","진",10,"참"],["珍","진",10,"보배"],
  ["成","성",7,"이룰"],["星","성",9,"별"],["誠","성",14,"정성"],["聖","성",13,"성인"],
  ["河","하",9,"강"],["夏","하",10,"여름"],["賀","하",12,"하례"],
  ["允","윤",4,"진실로"],["潤","윤",16,"윤택할"],
  ["瑞","서",14,"상서로울"],["書","서",10,"글"],["序","서",7,"차례"],["敍","서",11,"펼"],
  ["恩","은",10,"은혜"],["銀","은",14,"은"],
  ["彬","빈",11,"빛날"],["浩","호",11,"넓을"],["昊","호",8,"하늘"],["鎬","호",18,"호경"],["豪","호",14,"호걸"],
  ["柱","주",9,"기둥"],["珠","주",11,"구슬"],["宰","재",10,"재상"],["在","재",6,"있을"],
  ["勇","용",9,"날랠"],["湧","용",13,"샘솟을"],
  ["煥","환",13,"빛날"],["昌","창",8,"창성할"],["彰","창",14,"드러날"],["燦","찬",17,"빛날"],
  ["世","세",5,"세상"],["美","미",9,"아름다울"],["愛","애",13,"사랑"],["順","순",12,"순할"],["淑","숙",12,"맑을"],
  ["惠","혜",12,"은혜"],["慧","혜",15,"슬기로울"],["姬","희",9,"아가씨"],["熙","희",13,"빛날"],["喜","희",12,"기쁠"],
  ["仁","인",4,"어질"],["義","의",13,"옳을"],["孝","효",7,"효도"],["明","명",8,"밝을"],
  ["慶","경",15,"경사"],["敬","경",13,"공경"],["景","경",12,"볕"],["京","경",8,"서울"],
  ["勝","승",12,"이길"],["承","승",8,"이을"],["昇","승",8,"오를"],
  ["錫","석",16,"주석"],["圭","규",6,"홀"],["奎","규",9,"별"],["基","기",11,"터"],
  ["泰","태",10,"클"],["東","동",8,"동녘"],["植","식",12,"심을"],["哲","철",10,"밝을"],
  ["海","해",11,"바다"],["炳","병",9,"밝을"],["相","상",9,"서로"],["善","선",12,"착할"],["宣","선",9,"베풀"],
  ["昭","소",9,"밝을"],["雅","아",12,"맑을"],["藝","예",21,"재주"],["叡","예",16,"밝을"],
  ["琳","림",13,"아름다운 옥"],["彩","채",11,"채색"],["采","채",8,"풍채"],
  ["貞","정",9,"곧을"],["靜","정",16,"고요할"],["晶","정",12,"맑을"],
  ["鍾","종",17,"쇠북"],["宗","종",8,"마루"],["德","덕",15,"덕"],["大","대",3,"큰"],["端","단",14,"단정할"],
  ["理","리",12,"다스릴"],["範","범",15,"법"],["福","복",14,"복"],["峰","봉",10,"봉우리"],["富","부",12,"부유할"],
  ["雪","설",11,"눈"],["時","시",10,"때"],["始","시",8,"비로소"],["彦","언",9,"선비"],["然","연",12,"그럴"],
  ["姸","연",9,"고울"],["烈","열",10,"매울"],["雲","운",12,"구름"],["元","원",4,"으뜸"],["源","원",14,"근원"],
  ["裕","유",13,"넉넉할"],["柔","유",9,"부드러울"],["益","익",10,"더할"],["慈","자",13,"사랑"],
  ["亨","형",7,"형통할"],["炯","형",9,"빛날"],["和","화",8,"화할"],["多","다",6,"많을"],["道","도",16,"길"]
];

const BY_CHAR = new Map(HANJA.map(h => [h[0], h]));
const BY_READING = new Map();
for (const h of HANJA) {
  if (!BY_READING.has(h[1])) BY_READING.set(h[1], []);
  BY_READING.get(h[1]).push(h);
}

// 81수리: [등급, 풀이]  A 대길 / B 길 / C 반길 / D 흉
const GRADE_LABEL = { A: "대길", B: "길", C: "반길", D: "흉" };
const GRADE_POINT = { A: 100, B: 85, C: 60, D: 20 };
const GRADE_DESC = {
  A: "매우 좋은 수리로, 뜻한 바를 이루고 복이 따르는 기운입니다.",
  B: "좋은 수리로, 꾸준히 노력하면 안정과 발전이 따르는 기운입니다.",
  C: "길흉이 섞인 수리로, 시기에 따라 기복이 있을 수 있습니다.",
  D: "기운이 순탄하지 않은 수리로, 다른 격의 도움이 필요합니다."
};
const SURI = {
  1:["A","만물 시초, 두령운"],2:["D","분리 파괴"],3:["A","명예 번영"],4:["D","파괴 멸망"],5:["A","복덕 번창"],
  6:["A","계승 안락"],7:["B","독립 강건"],8:["B","의지 발전"],9:["D","궁박 불행"],10:["D","공허 단명"],
  11:["A","갱신 번영"],12:["D","박약 고독"],13:["A","지모 총명"],14:["D","이별 파산"],15:["A","복수 겸전"],
  16:["A","덕망 부귀"],17:["B","강건 돌파"],18:["B","발전 융성"],19:["D","고난 병약"],20:["D","공허 몰락"],
  21:["A","두령 명예"],22:["D","중도 좌절"],23:["A","공명 위세"],24:["A","입신 출세"],25:["B","안전 건창"],
  26:["D","파란 변괴"],27:["D","중절 비난"],28:["D","조난 파란"],29:["B","지모 성공"],30:["C","부침 길흉"],
  31:["A","통솔 번영"],32:["A","행운 순풍"],33:["A","왕성 용맹"],34:["D","파멸 재난"],35:["B","온화 평안"],
  36:["D","풍파 파란"],37:["B","권위 인덕"],38:["C","복록 예술"],39:["A","부귀 영화"],40:["D","허무 변화"],
  41:["A","덕망 고결"],42:["D","고생 재난"],43:["D","산재 실패"],44:["D","마장 불행"],45:["A","순풍 대지"],
  46:["D","미혹 불행"],47:["A","출세 개화"],48:["A","덕망 참모"],49:["C","길흉 상반"],50:["C","성패 반복"],
  51:["C","성쇠 부침"],52:["A","승운 선견"],53:["D","겉길 속흉"],54:["D","불구 재난"],55:["D","화려 불안"],
  56:["D","부족 패망"],57:["B","노력 극복"],58:["C","선흉 후길"],59:["D","재화 불성"],60:["D","암흑 동요"],
  61:["B","영화 번영"],62:["D","쇠퇴 고독"],63:["A","순성 발전"],64:["D","침체 고난"],65:["A","행복 장수"],
  66:["D","진퇴 유곡"],67:["A","순탄 영달"],68:["A","명지 공명"],69:["D","불안 정지"],70:["D","적막 쇠운"],
  71:["C","발전 불리"],72:["D","표면 평화"],73:["C","평길 무난"],74:["D","우매 무지"],75:["C","정수 안정"],
  76:["C","선곤 후길"],77:["C","전반길 후반흉"],78:["C","선길 후흉"],79:["D","종말 부정"],80:["D","종말 은둔"],
  81:["A","환원 복귀"]
};

const ELEMENTS = ["木", "火", "土", "金", "水"]; // 상생 순서
const ELEMENT_BY_DIGIT = ["水","木","木","火","火","土","土","金","金","水"];

/* ===================== 계산 ===================== */

const suriOf = n => SURI[((n - 1) % 80) + 1];
const elementOf = n => ELEMENT_BY_DIGIT[n % 10];

// 두 오행의 관계: x → y 방향
function relation(x, y) {
  const i = ELEMENTS.indexOf(x), j = ELEMENTS.indexOf(y);
  if (i === j) return { type: "비화", score: 70, text: `${x}${y} 비화(比和)` };
  if ((i + 1) % 5 === j) return { type: "상생", score: 100, text: `${x}생${y} 상생(相生)` };
  if ((j + 1) % 5 === i) return { type: "역생", score: 80, text: `${y}생${x} 역상생` };
  if ((i + 2) % 5 === j) return { type: "상극", score: 30, text: `${x}극${y} 상극(相克)` };
  return { type: "역극", score: 30, text: `${y}극${x} 역상극` };
}

// S: 성 획수, a: 첫 글자, b: 둘째 글자(없으면 null)
function analyze(S, a, b) {
  const single = b == null;
  const won = single ? a + 1 : a + b;       // 원격(元) 초년
  const hyeong = S + a;                      // 형격(亨) 청년
  const i = single ? S + 1 : S + b;          // 이격(利) 장년
  const jeong = single ? S + a : S + a + b;  // 정격(貞) 말년·총운

  const gyeoks = [
    { key: "원격", hanja: "元格", term: "초년운", n: won, w: .15 },
    { key: "형격", hanja: "亨格", term: "청년운", n: hyeong, w: .25 },
    { key: "이격", hanja: "利格", term: "장년운", n: i, w: .20 },
    { key: "정격", hanja: "貞格", term: "말년·총운", n: jeong, w: .25 }
  ].map(g => {
    const [grade, title] = suriOf(g.n);
    return { ...g, grade, title, el: elementOf(g.n) };
  });

  // 삼재: 천격(성+1) · 인격(성+첫글자) · 지격(원격)
  const heaven = S + 1, human = hyeong, earth = won;
  const sam = {
    heaven: { n: heaven, el: elementOf(heaven) },
    human: { n: human, el: elementOf(human) },
    earth: { n: earth, el: elementOf(earth) }
  };
  const r1 = relation(sam.heaven.el, sam.human.el);
  const r2 = relation(sam.human.el, sam.earth.el);
  const samScore = (r1.score + r2.score) / 2;

  // 음양: 홀수=양, 짝수=음. 모두 같으면 편중.
  const strokes = single ? [S, a] : [S, a, b];
  const yy = strokes.map(n => (n % 2 ? "양" : "음"));
  const balanced = new Set(yy).size > 1;
  const yyScore = balanced ? 100 : 20;

  const gScore = gyeoks.reduce((s, g) => s + GRADE_POINT[g.grade] * g.w, 0);
  const total = Math.round(gScore + yyScore * .05 + samScore * .10);

  return { gyeoks, sam, r1, r2, samScore, yy, balanced, total, single };
}

function verdictOf(score) {
  if (score >= 85) return ["매우 좋은 이름", "A"];
  if (score >= 70) return ["좋은 이름", "B"];
  if (score >= 55) return ["무난한 이름", "C"];
  return ["아쉬운 이름", "D"];
}

/* ===================== 유틸 ===================== */

const $ = id => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const isHangul = s => /^[가-힣]$/.test(s);
const firstChar = s => [...s.trim()][0] || "";

/* ===================== 초기화 ===================== */

function fillSurnames(select) {
  SURNAMES.forEach(([h, r, s], idx) => {
    const o = document.createElement("option");
    o.value = idx;
    o.textContent = `${h}  ${r}  ·  ${s}획`;
    select.appendChild(o);
  });
}
fillSurnames($("surname"));
fillSurnames($("r-surname"));

// 탭
const tabs = { analyze: $("tab-analyze"), recommend: $("tab-recommend") };
function showTab(name) {
  for (const [k, btn] of Object.entries(tabs)) {
    const on = k === name;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on);
    $("panel-" + k).hidden = !on;
  }
}
tabs.analyze.addEventListener("click", () => showTab("analyze"));
tabs.recommend.addEventListener("click", () => showTab("recommend"));

/* ===================== 한자 입력 필드 ===================== */

function setupChar(n) {
  const c = $("c" + n), s = $("s" + n), chips = $("chips" + n), info = $("info" + n);

  function pick(h) {
    c.value = h[0];
    s.value = h[2];
    chips.replaceChildren();
    info.textContent = `${h[0]} ${h[1]} · ${h[3]} · ${h[2]}획`;
  }

  c.addEventListener("input", () => {
    const ch = firstChar(c.value);
    chips.replaceChildren();
    info.textContent = "";
    if (!ch) { s.value = ""; return; }

    if (isHangul(ch)) {
      const list = BY_READING.get(ch);
      if (list) {
        list.forEach(h => {
          const b = el("button", "chip");
          b.type = "button";
          b.append(el("span", "hj", h[0]), document.createTextNode(`${h[3]} `), el("small", null, `${h[2]}획`));
          b.addEventListener("click", () => pick(h));
          chips.appendChild(b);
        });
        info.textContent = "사용할 한자를 선택하세요.";
      } else {
        info.textContent = `'${ch}' 음의 한자가 사전에 없습니다. 한자를 직접 입력하고 획수를 적어주세요.`;
      }
      return;
    }

    const h = BY_CHAR.get(ch);
    if (h) pick(h);
    else info.textContent = "사전에 없는 한자입니다. 원획 기준 획수를 직접 입력하세요.";
  });
}
setupChar(1);
setupChar(2);

/* ===================== 풀이 화면 ===================== */

function readStroke(input) {
  const v = input.value.trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 40 ? n : NaN;
}

function renderResult(sur, c1, a, c2, b) {
  const S = sur[2];
  const r = analyze(S, a, b);
  const root = $("result");
  root.replaceChildren();

  /* 요약 */
  const summary = el("div", "summary");
  const nameView = el("div", "name-view");
  const glyph = (hj, rd, st) => {
    const g = el("div", "glyph");
    g.append(el("span", "hj", hj), el("span", "rd", rd), el("span", "st", `${st}획`));
    return g;
  };
  nameView.append(glyph(sur[0], sur[1], S));
  nameView.append(glyph(c1.hj, c1.rd, a));
  if (b != null) nameView.append(glyph(c2.hj, c2.rd, b));

  const [vText, vGrade] = verdictOf(r.total);
  const wrap = el("div", "score-wrap");
  const ring = el("div", "ring");
  ring.style.setProperty("--pct", r.total);
  ring.style.setProperty("--c", `var(--${{ A: "great", B: "good", C: "half", D: "bad" }[vGrade]})`);
  const sc = el("span", null, String(r.total));
  sc.appendChild(el("small", null, "종합 점수"));
  ring.appendChild(sc);
  const verdict = el("div", "verdict");
  verdict.append(el("h3", null, vText), el("p", null, "4격 수리 · 삼재 오행 · 음양 배열을 종합했습니다."));
  wrap.append(ring, verdict);
  summary.append(nameView, wrap);
  root.appendChild(summary);

  /* 4격 */
  const grid = el("div", "grid4");
  r.gyeoks.forEach(g => {
    const card = el("article", `gyeok g-${g.grade}`);
    const head = el("header");
    const h4 = el("h4", null, g.key);
    h4.appendChild(el("small", null, `${g.hanja} · ${g.term}`));
    head.append(h4, el("span", "badge", GRADE_LABEL[g.grade]));
    const num = el("p", "num");
    num.append(el("b", null, String(g.n)), document.createTextNode(`획 · 오행 ${g.el}`));
    card.append(head, num, el("p", "title", g.title), el("p", "desc", GRADE_DESC[g.grade]));
    grid.appendChild(card);
  });
  root.appendChild(grid);

  /* 삼재 + 음양 */
  const extra = el("section", "extra");
  extra.appendChild(el("h4", null, "삼재 오행 · 음양 배열"));
  const ul = el("ul");
  const li = (k, build) => {
    const item = el("li");
    item.appendChild(el("span", "k", k));
    build(item);
    ul.appendChild(item);
  };
  const elSpan = (n, e) => el("span", "el", `${n}획 ${e}`);
  li("삼재 배치", it => {
    it.append(
      document.createTextNode("天 "), elSpan(r.sam.heaven.n, r.sam.heaven.el),
      document.createTextNode(" · 人 "), elSpan(r.sam.human.n, r.sam.human.el),
      document.createTextNode(" · 地 "), elSpan(r.sam.earth.n, r.sam.earth.el)
    );
  });
  const cls = s => (s >= 80 ? "good" : s >= 60 ? "mid" : "poor");
  li("천 → 인", it => it.append(document.createTextNode(r.r1.text + " "), el("span", cls(r.r1.score), r.r1.score >= 80 ? "좋음" : r.r1.score >= 60 ? "보통" : "나쁨")));
  li("인 → 지", it => it.append(document.createTextNode(r.r2.text + " "), el("span", cls(r.r2.score), r.r2.score >= 80 ? "좋음" : r.r2.score >= 60 ? "보통" : "나쁨")));
  li("음양 배열", it => it.append(
    document.createTextNode(r.yy.join(" ") + " "),
    el("span", r.balanced ? "good" : "poor", r.balanced ? "조화" : "편중")
  ));
  extra.appendChild(ul);
  extra.appendChild(el("p", "note",
    "획수는 원획법(氵=水, 艹=艸 등 원래 글자 기준)이며, 천격은 성+1, 인격은 성+이름 첫 글자, 지격은 이름 획수 합입니다." +
    (r.single ? " 외자 이름은 허수 1을 더해 계산했습니다." : "")));
  root.appendChild(extra);

  root.hidden = false;
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

$("analyze-form").addEventListener("submit", e => {
  e.preventDefault();
  const err = $("form-error");
  err.textContent = "";

  const sur = SURNAMES[Number($("surname").value)];
  const ch1 = firstChar($("c1").value), ch2 = firstChar($("c2").value);
  const a = readStroke($("s1")), b = readStroke($("s2"));

  if (!ch1 && a == null) { err.textContent = "이름 첫 글자를 입력해주세요."; return; }
  if (a == null || Number.isNaN(a)) { err.textContent = "첫 글자의 획수(1~40)를 확인해주세요."; return; }
  if (Number.isNaN(b)) { err.textContent = "둘째 글자의 획수(1~40)를 확인해주세요."; return; }
  if ((ch2 || b != null) && b == null) { err.textContent = "둘째 글자의 획수를 입력해주세요."; return; }

  const info = (ch, st) => {
    const h = BY_CHAR.get(ch);
    return { hj: h ? ch : (ch && !isHangul(ch) ? ch : "○"), rd: h ? h[1] : (isHangul(ch) ? ch : "") };
  };
  renderResult(sur, info(ch1), a, info(ch2), b);
});

$("reset").addEventListener("click", () => {
  ["c1", "s1", "c2", "s2"].forEach(id => ($(id).value = ""));
  ["chips1", "chips2"].forEach(id => $(id).replaceChildren());
  ["info1", "info2", "form-error"].forEach(id => ($(id).textContent = ""));
  $("result").hidden = true;
});

/* ===================== 이름 추천 ===================== */

$("r-min").addEventListener("input", e => ($("r-min-out").textContent = e.target.value));

$("recommend-form").addEventListener("submit", e => {
  e.preventDefault();
  const err = $("r-error"), out = $("r-results");
  err.textContent = "";
  out.replaceChildren();

  const reading = $("r-reading").value.trim();
  const syl = [...reading];
  if (!syl.length || syl.length > 2 || !syl.every(isHangul)) {
    err.textContent = "한글 1~2글자로 입력해주세요. (예: 서연)";
    return;
  }
  const lists = syl.map(s => BY_READING.get(s) || []);
  const missing = syl.filter((s, i) => !lists[i].length);
  if (missing.length) {
    err.textContent = `사전에 '${missing.join("', '")}' 음의 한자가 없습니다. '이름 풀이' 탭에서 한자를 직접 입력해 확인해보세요.`;
    return;
  }

  const sur = SURNAMES[Number($("r-surname").value)];
  const min = Number($("r-min").value);
  const combos = [];
  if (syl.length === 1) {
    lists[0].forEach(x => combos.push([x]));
  } else {
    lists[0].forEach(x => lists[1].forEach(y => combos.push([x, y])));
  }

  const scored = combos
    .map(c => ({ c, r: analyze(sur[2], c[0][2], c[1] ? c[1][2] : null) }))
    .sort((p, q) => q.r.total - p.r.total);
  const shown = scored.filter(x => x.r.total >= min).slice(0, 40);

  if (!shown.length) {
    out.appendChild(el("p", "r-msg", `${min}점 이상인 조합이 없습니다. 최소 점수를 낮춰보세요. (최고 ${scored[0].r.total}점)`));
    return;
  }

  shown.forEach(({ c, r }) => {
    const [, g] = verdictOf(r.total);
    const card = el("button", `r-card g-${g}`);
    card.type = "button";
    const left = el("span", "hj", c.map(h => h[0]).join(""));
    const mid = el("span");
    mid.append(
      el("span", "rd", `${sur[1]}${c.map(h => h[1]).join("")} (${sur[0]}${c.map(h => h[0]).join("")})`),
      el("span", "mn", c.map(h => h[3]).join(" · "))
    );
    const right = el("span", "sc", String(r.total));
    right.appendChild(el("small", null, verdictOf(r.total)[0]));
    card.append(left, mid, right);
    card.addEventListener("click", () => {
      $("surname").value = $("r-surname").value;
      $("c1").value = c[0][0]; $("s1").value = c[0][2];
      $("info1").textContent = `${c[0][0]} ${c[0][1]} · ${c[0][3]} · ${c[0][2]}획`;
      $("chips1").replaceChildren();
      if (c[1]) {
        $("c2").value = c[1][0]; $("s2").value = c[1][2];
        $("info2").textContent = `${c[1][0]} ${c[1][1]} · ${c[1][3]} · ${c[1][2]}획`;
      } else {
        $("c2").value = ""; $("s2").value = ""; $("info2").textContent = "";
      }
      $("chips2").replaceChildren();
      showTab("analyze");
      renderResult(sur, { hj: c[0][0], rd: c[0][1] }, c[0][2],
        c[1] ? { hj: c[1][0], rd: c[1][1] } : {}, c[1] ? c[1][2] : null);
    });
    out.appendChild(card);
  });
});
