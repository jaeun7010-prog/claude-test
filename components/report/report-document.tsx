import { ELEMENT_LUCKY } from "@/lib/commerce/catalog";
import type { ReportSnapshot } from "@/lib/commerce/report-snapshot";
import { BRANCHES_KO, STEMS_KO, type Pillar } from "@/lib/saju";

/**
 * 프리미엄 리포트 본문. html2canvas 가 Tailwind 의 `hsl(var(--x))` 색상을 못 읽을 수 있어
 * 이 문서만 CLAUDE.md 테마 색(ivory/navy/sand)의 HEX 값을 인라인으로 쓴다.
 */
const C = { ivory: "#fdfbf7", navy: "#2d3a52", sand: "#f4eae1", muted: "#5d6679", line: "#c9bba8" };
const FONT = 'var(--font-myeongjo), "Nanum Myeongjo", serif';

const NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const GYEOK = [
  { key: "won", name: "원격(元格)", desc: "초년운 · 타고난 바탕과 유년기의 기운" },
  { key: "hyeong", name: "형격(亨格)", desc: "청년운 · 사회 진출과 성취의 기운" },
  { key: "i", name: "이격(利格)", desc: "중년운 · 대인관계와 가정의 기운" },
  { key: "jeong", name: "정격(貞格)", desc: "총운 · 평생을 아우르는 종합 기운" },
] as const;

/** 주문에 고정된 분석 결과 + 작성일 */
export type ReportData = Omit<ReportSnapshot, "version" | "createdAt"> & { issuedAt: string };

const PAGE: React.CSSProperties = {
  width: "794px",
  // html2pdf는 A4 한 쪽을 1122px로 보고, break-after 뒤에 "1122 - (끝 위치 % 1122)"만큼 빈칸을 넣는다.
  // 쪽 높이가 1122px 이상이면 이 빈칸이 거의 한 쪽이 되어 쪽마다 빈 쪽이 생기므로 1px 작게 둔다.
  height: "1121px",
  boxSizing: "border-box",
  padding: "48px",
  backgroundColor: C.ivory,
  color: C.navy,
  fontFamily: FONT,
  breakAfter: "page",
  overflow: "hidden",
};

function Frame({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <section className="report-page" style={PAGE}>
      <div
        style={{
          height: "100%",
          boxSizing: "border-box",
          border: `3px double ${C.navy}`,
          padding: "40px 44px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1 }}>{children}</div>
        <p style={{ margin: 0, textAlign: "center", fontSize: "12px", color: C.muted }}>{footer}</p>
      </div>
    </section>
  );
}

const h2: React.CSSProperties = {
  margin: "0 0 18px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${C.navy}`,
  fontSize: "22px",
  fontWeight: 700,
};

function PillarBox({ label, pillar }: { label: string; pillar: Pillar | null }) {
  return (
    <div style={{ backgroundColor: C.sand, textAlign: "center", padding: "14px 6px" }}>
      <div style={{ fontSize: "12px", color: C.muted }}>{label}</div>
      {pillar ? (
        <>
          <div style={{ fontSize: "34px", fontWeight: 700, lineHeight: 1.3 }}>{pillar.hanja}</div>
          <div style={{ fontSize: "12px", color: C.muted }}>
            {STEMS_KO[pillar.stem]}
            {BRANCHES_KO[pillar.branch]}
          </div>
        </>
      ) : (
        <div style={{ padding: "18px 0", fontSize: "13px", color: C.muted }}>미상</div>
      )}
    </div>
  );
}

export function ReportDocument({ data }: { data: ReportData }) {
  const { saju, analysis, given } = data;
  const legal = data.legalAnalysis ?? null;
  const { pillars, yongsin } = saju;
  const fullHanja = `${data.surnameHanja}${given.map((c) => c.hanja).join("")}`;
  const fullHangul = `${data.surname}${given.map((c) => c.eum).join("")}`;
  const total = Object.values(yongsin.scores).reduce((a, b) => a + b, 0);
  const lacking = data.texts.lacking;
  const chars = [...data.surnameChars, ...given];
  // 복성·부모 성 함께 쓰기로 글자가 4자 이상이면 3쪽이 A4를 넘지 않도록 한자 표를 줄인다
  const compact = chars.length >= 4;
  const cellPad = chars.length >= 5 ? "2px 8px" : compact ? "4px 8px" : "8px";
  const hanjaSize = chars.length >= 5 ? "18px" : compact ? "20px" : "24px";
  const gyeokPad = compact ? "4px 8px" : "9px 8px";
  const sectionGap = compact ? "18px" : "30px";
  const footer = `이름핏 NameFit · ${fullHangul} 작명 리포트`;
  // 一~六은 늘 있고, 뒤쪽 쪽(글자 풀이 version 7 · 사격 풀이 version 6 · 법적 기준 · 조합 진단)은 있는 것만 차례로 번호를 붙인다
  const hanjaItems = data.texts.hanja?.some((x) => x.text) ? data.texts.hanja : null;
  const suriItems = data.texts.suri && data.texts.suri.length > 0 ? data.texts.suri : null;
  const hasCombination = !!legal && !!data.texts.combination && data.texts.combination.length > 0;
  const later = [hanjaItems && "hanja", suriItems && "suri", legal && "legal", hasCombination && "combination"].filter(Boolean);
  const num = (k: string) => NUMERALS[6 + later.indexOf(k)];

  return (
    <div id="report-root" style={{ width: "794px" }}>
      {/* 표지 */}
      <Frame footer={footer}>
        <div style={{ textAlign: "center", paddingTop: "150px" }}>
          <p style={{ margin: 0, letterSpacing: "0.6em", fontSize: "16px", color: C.muted }}>
            四柱 命名 報告書
          </p>
          <h1 style={{ margin: "36px 0 0", fontSize: "64px", fontWeight: 800, letterSpacing: "0.15em" }}>
            命名書
          </h1>
          <div style={{ margin: "70px auto", width: "80px", borderTop: `2px solid ${C.navy}` }} />
          <p style={{ margin: 0, fontSize: "72px", fontWeight: 800, letterSpacing: "0.2em" }}>{fullHanja}</p>
          <p style={{ margin: "18px 0 0", fontSize: "30px" }}>{fullHangul}</p>
          {data.texts.registration && (
            <p style={{ margin: "18px 0 0", fontSize: "14px", color: C.muted }}>{data.texts.registration}</p>
          )}
          <p style={{ margin: "90px 0 0", fontSize: "15px", color: C.muted }}>생년월일시 {data.birthText}</p>
          <p style={{ margin: "6px 0 0", fontSize: "15px", color: C.muted }}>작성일 {data.issuedAt}</p>
        </div>
      </Frame>

      {/* 사주 풀이 */}
      <Frame footer={footer}>
        <h2 style={h2}>一. 사주 원국(四柱原局)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          <PillarBox label="시주(時)" pillar={pillars.hour} />
          <PillarBox label="일주(日)" pillar={pillars.day} />
          <PillarBox label="월주(月)" pillar={pillars.month} />
          <PillarBox label="연주(年)" pillar={pillars.year} />
        </div>

        <h2 style={{ ...h2, marginTop: "36px" }}>二. 오행 분포(五行分布)</h2>
        {(["목", "화", "토", "금", "수"] as const).map((e) => {
          const pct = total > 0 ? Math.round((yongsin.scores[e] / total) * 100) : 0;
          return (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: "12px", margin: "9px 0" }}>
              <span style={{ width: "56px", fontSize: "16px" }}>
                {ELEMENT_HANJA[e]}({e})
              </span>
              <div style={{ flex: 1, height: "10px", backgroundColor: C.sand }}>
                <div style={{ width: `${pct}%`, height: "10px", backgroundColor: C.navy }} />
              </div>
              <span style={{ width: "44px", textAlign: "right", fontSize: "14px" }}>{pct}%</span>
            </div>
          );
        })}

        <h2 style={{ ...h2, marginTop: "36px" }}>三. 용신(用神) 풀이</h2>
        <p style={{ margin: "0 0 8px", fontSize: "17px", lineHeight: 1.8 }}>
          일간은 <b>{ELEMENT_HANJA[yongsin.dayMaster.element]}({yongsin.dayMaster.element})</b>이며{" "}
          <b>{yongsin.strength}</b>한 사주입니다. 용신은{" "}
          <b>{ELEMENT_HANJA[yongsin.yongsin]}({yongsin.yongsin})</b>, 희신은{" "}
          <b>{ELEMENT_HANJA[yongsin.huisin]}({yongsin.huisin})</b>이며 {yongsin.gisin} 기운은 이름에서 피하는 것이
          좋습니다.
        </p>
        <p style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: 1.8, color: C.muted }}>{yongsin.reason}</p>
        {yongsin.relations.length > 0 && (
          <p style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: 1.8, color: C.muted }}>
            합·충·형:{" "}
            {yongsin.relations
              .map((r) => `${r.chars} ${r.kind}${r.status === "성립" && r.element ? `(${r.element})` : ""}${r.status === "묶임" ? "(묶임)" : ""}`)
              .join(", ")}
            {" — "}
            {[...new Set(yongsin.relations.filter((r) => r.status !== "표시만").map((r) => r.easy))].join(" ")}
          </p>
        )}
        {yongsin.geokguk && (
          <p style={{ margin: "0 0 8px", fontSize: "15px", lineHeight: 1.8, color: C.muted }}>
            격국(格局): {yongsin.geokguk.name}
            {yongsin.geokguk.sangsin
              ? ` · 상신 ${yongsin.geokguk.sangsin.group}(${yongsin.geokguk.sangsin.element})`
              : ""}
            {` · ${yongsin.geokguk.status}`}
            {" — "}
            {data.texts.geokguk}
          </p>
        )}
        <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.8, color: C.muted }}>
          사주에서 가장 부족한 기운은 {ELEMENT_HANJA[lacking]}({lacking})으로, 행운의 동물은{" "}
          {ELEMENT_LUCKY[lacking].animal}, 행운의 색은 {ELEMENT_LUCKY[lacking].color}입니다.
        </p>
      </Frame>

      {/* 이름 풀이 */}
      <Frame footer={footer}>
        <h2 style={h2}>四. 이름 한자 풀이(姓名解)</h2>
        {data.texts.registration && (
          <p style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: 1.7, color: C.muted }}>
            {data.texts.registration}
            {legal
              ? ` 아래 사격·점수는 새로 고르는 부분 기준이며, 법적 이름 전체 기준은 ${num("legal")}에 실었습니다.`
              : " 수리·오행은 이 등록 기준으로 풀이했습니다."}
          </p>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
          <thead>
            <tr style={{ backgroundColor: C.sand }}>
              {["한자", "음", "훈", "획수", "자원오행"].map((t) => (
                <th key={t} style={{ padding: "8px", border: `1px solid ${C.line}`, fontWeight: 700 }}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chars.map((c, i) => (
              <tr key={`${c.hanja}-${i}`} style={{ textAlign: "center" }}>
                <td style={{ padding: cellPad, border: `1px solid ${C.line}`, fontSize: hanjaSize, fontWeight: 700 }}>
                  {c.hanja}
                </td>
                <td style={{ padding: cellPad, border: `1px solid ${C.line}` }}>{c.eum}</td>
                <td style={{ padding: cellPad, border: `1px solid ${C.line}` }}>{c.hun ?? "-"}</td>
                <td style={{ padding: cellPad, border: `1px solid ${C.line}` }}>{c.strokes}</td>
                <td style={{ padding: cellPad, border: `1px solid ${C.line}` }}>
                  {c.element ? `${ELEMENT_HANJA[c.element]}(${c.element})` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.texts.nameMeaning && (
          <p style={{ margin: compact ? "8px 0 0" : "14px 0 0", fontSize: "15px", lineHeight: 1.7 }}>
            <span style={{ color: C.muted }}>이름 뜻 · {data.texts.nameMeaning.chars} →</span>{" "}
            {data.texts.nameMeaning.sentence}
          </p>
        )}

        <h2 style={{ ...h2, marginTop: sectionGap }}>五. 수리 81수 사격(四格)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
          <tbody>
            {GYEOK.map((g) => {
              const r = analysis.fourGyeok[g.key];
              return (
                <tr key={g.key}>
                  <td style={{ padding: gyeokPad, border: `1px solid ${C.line}`, width: "130px", fontWeight: 700 }}>
                    {g.name}
                  </td>
                  <td style={{ padding: gyeokPad, border: `1px solid ${C.line}`, width: "120px", textAlign: "center", whiteSpace: "nowrap" }}>
                    {r.suri}수 · {r.lucky ? "길(吉)" : "흉(凶)"}
                  </td>
                  <td style={{ padding: gyeokPad, border: `1px solid ${C.line}`, color: C.muted }}>{g.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2 style={{ ...h2, marginTop: sectionGap }}>六. 오행 조화와 종합 평가</h2>
        <p style={{ margin: "0 0 6px", fontSize: "16px", lineHeight: 1.8 }}>
          발음오행 {analysis.pronunciation.elements.join(" → ")} (조화 {analysis.pronunciation.score}점)
        </p>
        {analysis.resource && (
          <p style={{ margin: "0 0 6px", fontSize: "16px", lineHeight: 1.8 }}>
            자원오행 {analysis.resource.elements.join(" → ")} (조화 {analysis.resource.score}점)
            {analysis.resource.needMatched ? " · 용신 오행을 보강합니다." : ""}
            {analysis.resource.arrangement === "통관"
              ? " · 가운데 글자가 성씨와 용신 오행을 상생으로 이어 줍니다(통관)."
              : analysis.resource.arrangement === "희신 배치"
                ? " · 가운데 글자가 성씨와 끝 글자의 용신 오행을 함께 생해 줍니다."
                : ""}
          </p>
        )}
        {analysis.resource && data.texts.surnameElementNote && (
          <p style={{ margin: "0 0 4px", fontSize: "12px", lineHeight: 1.5, color: C.muted }}>
            {data.texts.surnameElementNote}
          </p>
        )}
        <p style={{ margin: "14px 0 0", fontSize: "26px", fontWeight: 800 }}>
          종합 점수 <span style={{ fontSize: "40px" }}>{analysis.totalScore}</span> / 100
          {analysis.grade && <span style={{ marginLeft: "16px" }}>{analysis.grade}등급</span>}
        </p>

        <p style={{ margin: `${sectionGap} 0 0`, fontSize: "12px", lineHeight: 1.7, color: C.muted }}>
          사주의 강약, 계절 균형, 합충, 격국을 기준으로 아이에게 필요한 기운을 찾았습니다. 학파에 따라 해석이 다를 수
          있습니다. 이름 풀이는 수리 81수·오행 이론에 따른 참고 자료이며, 작명의 최종 결정은 가족의 뜻과 함께 정하시길
          권합니다.
        </p>
      </Frame>

      {/* 글자 풀이 (version 7부터). 문구가 없는 글자는 훈음·획수·자원오행만 */}
      {hanjaItems && (
        <Frame footer={footer}>
          <h2 style={h2}>{num("hanja")}. 글자 풀이(漢字 解說)</h2>
          {hanjaItems.map((x, i) => (
            <div
              key={`${x.hanja}-${i}`}
              style={{ display: "flex", gap: "22px", marginBottom: "18px", paddingBottom: "16px", borderBottom: `1px dotted ${C.line}` }}
            >
              <div style={{ width: "64px", flexShrink: 0, textAlign: "center", fontSize: "44px", fontWeight: 700, lineHeight: 1.2 }}>
                {x.hanja}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                  {x.hun ? `${x.hun} ${x.eum}` : x.eum}
                  <span style={{ marginLeft: "10px", fontSize: "13px", fontWeight: 400, color: C.muted }}>
                    {x.strokes}획{x.element ? ` · ${ELEMENT_HANJA[x.element]}(${x.element})` : ""}
                  </span>
                </p>
                {x.summary && <p style={{ margin: "6px 0 0", fontSize: "16px", fontWeight: 700 }}>{x.summary}</p>}
                {x.text && <p style={{ margin: "4px 0 0", fontSize: "15px", lineHeight: 1.8 }}>{x.text}</p>}
              </div>
            </div>
          ))}
          <p style={{ margin: "4px 0 0", fontSize: "12px", lineHeight: 1.7, color: C.muted }}>
            글자 풀이는 이름에 담는 뜻을 중심으로 쓴 참고 자료이며, 사전과 책에 따라 풀이가 조금씩 다릅니다.
          </p>
        </Frame>
      )}

      {/* 사격 풀이 (version 6부터). 3쪽에 자리가 없어 따로 한 쪽 */}
      {suriItems && (
        <Frame footer={footer}>
          <h2 style={h2}>{num("suri")}. 사격 풀이(四格 解說)</h2>
          {suriItems.map((x) => {
            const g = GYEOK.find((y) => y.key === x.key)!;
            return (
              <div key={x.key} style={{ marginBottom: "22px", paddingBottom: "18px", borderBottom: `1px dotted ${C.line}` }}>
                <p style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                  {g.name} · {x.suri}수 {x.name}({x.hanja}) · {x.lucky ? "길(吉)" : "흉(凶)"}
                  <span style={{ marginLeft: "10px", fontSize: "13px", fontWeight: 400, color: C.muted }}>
                    {g.desc.split(" · ")[0]}
                  </span>
                </p>
                <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: 700 }}>{x.summary}</p>
                <p style={{ margin: "6px 0 0", fontSize: "15px", lineHeight: 1.8 }}>
                  {x.sameAs ? `${GYEOK.find((y) => y.key === x.sameAs)!.name.slice(0, 2)}과 같은 수입니다.` : x.text}
                </p>
                {x.female && (
                  <p style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: 1.6, color: C.muted }}>{x.female}</p>
                )}
              </div>
            );
          })}
          <p style={{ margin: "4px 0 0", fontSize: "12px", lineHeight: 1.7, color: C.muted }}>
            81수 격 이름과 풀이는 전통 성명학에 따른 참고 자료이며, 책과 학파에 따라 이름과 풀이가 조금씩 다릅니다.
          </p>
        </Frame>
      )}

      {/* 부모 성 함께 쓰기: 법적 이름 전체 기준(참고)과 조합 진단 */}
      {legal && (
        <Frame footer={footer}>
          <h2 style={h2}>{num("legal")}. 법적 이름 전체 기준 (참고)</h2>
          {data.texts.registration && (
            <p style={{ margin: "0 0 12px", fontSize: "15px", lineHeight: 1.7 }}>{data.texts.registration}</p>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
            <tbody>
              {GYEOK.map((g) => {
                const r = legal.fourGyeok[g.key];
                return (
                  <tr key={g.key}>
                    <td style={{ padding: "9px 8px", border: `1px solid ${C.line}`, width: "130px", fontWeight: 700 }}>
                      {g.name}
                    </td>
                    <td style={{ padding: "9px 8px", border: `1px solid ${C.line}`, width: "120px", textAlign: "center", whiteSpace: "nowrap" }}>
                      {r.suri}수 · {r.lucky ? "길(吉)" : "흉(凶)"}
                    </td>
                    <td style={{ padding: "9px 8px", border: `1px solid ${C.line}`, color: C.muted }}>{g.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ margin: "14px 0 6px", fontSize: "16px", lineHeight: 1.8 }}>
            발음오행 {legal.pronunciation.elements.join(" → ")} (조화 {legal.pronunciation.score}점)
            {legal.resource && ` · 자원오행 ${legal.resource.elements.join(" → ")} (조화 ${legal.resource.score}점)`}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 700 }}>
            법적 이름 전체 기준 {legal.totalScore} / 100 · {legal.grade}등급
          </p>

          {hasCombination && (
            <>
              <h2 style={{ ...h2, marginTop: "34px" }}>{num("combination")}. 조합 진단(組合診斷)</h2>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "15px", lineHeight: 1.8 }}>
                {data.texts.combination!.map((x) => (
                  <li key={x.text} style={{ color: x.tone === "weak" ? C.navy : C.muted }}>
                    {x.tone === "weak" ? "참고 · " : ""}
                    {x.text}
                  </li>
                ))}
              </ul>
              <p style={{ margin: "14px 0 0", fontSize: "13px", lineHeight: 1.7, color: C.muted }}>
                어떤 이름을 골라도 똑같이 들어가는 부분(성 + 함께 쓰는 부모 성)을 따로 살펴본 것입니다. 함께 쓰기를
                원하시면 이 점을 참고하세요.
              </p>
            </>
          )}
        </Frame>
      )}
    </div>
  );
}
