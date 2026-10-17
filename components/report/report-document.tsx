import { ELEMENT_LUCKY, lackingElement } from "@/lib/commerce/catalog";
import type { NameHanja } from "@/lib/naming/recommend";
import type { NamingAnalysis } from "@/lib/naming/types";
import { BRANCHES_KO, STEMS_KO, type Pillar } from "@/lib/saju";
import type { analyzeSaju } from "@/lib/saju";

/**
 * 프리미엄 리포트 본문. html2canvas 가 Tailwind 의 `hsl(var(--x))` 색상을 못 읽을 수 있어
 * 이 문서만 CLAUDE.md 테마 색(ivory/navy/sand)의 HEX 값을 인라인으로 쓴다.
 */
const C = { ivory: "#fdfbf7", navy: "#2d3a52", sand: "#f4eae1", muted: "#5d6679", line: "#c9bba8" };
const FONT = 'var(--font-myeongjo), "Nanum Myeongjo", serif';

const ELEMENT_HANJA: Record<string, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const GYEOK = [
  { key: "won", name: "원격(元格)", desc: "초년운 · 타고난 바탕과 유년기의 기운" },
  { key: "hyeong", name: "형격(亨格)", desc: "청년운 · 사회 진출과 성취의 기운" },
  { key: "i", name: "이격(利格)", desc: "중년운 · 대인관계와 가정의 기운" },
  { key: "jeong", name: "정격(貞格)", desc: "총운 · 평생을 아우르는 종합 기운" },
] as const;

export interface ReportData {
  surname: string;
  surnameHanja: string;
  surnameChars: NameHanja[];
  given: NameHanja[];
  analysis: NamingAnalysis;
  saju: ReturnType<typeof analyzeSaju>;
  birthText: string;
  issuedAt: string;
}

const PAGE: React.CSSProperties = {
  width: "794px",
  height: "1123px",
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
  const { pillars, yongsin } = saju;
  const fullHanja = `${data.surnameHanja}${given.map((c) => c.hanja).join("")}`;
  const fullHangul = `${data.surname}${given.map((c) => c.eum).join("")}`;
  const total = Object.values(yongsin.scores).reduce((a, b) => a + b, 0);
  const lacking = lackingElement(yongsin.scores, yongsin.yongsin);
  const chars = [...data.surnameChars, ...given];
  const footer = `이름핏 NameFit · ${fullHangul} 작명 리포트`;

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
        <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.8, color: C.muted }}>
          사주에서 가장 부족한 기운은 {ELEMENT_HANJA[lacking]}({lacking})으로, 행운의 동물은{" "}
          {ELEMENT_LUCKY[lacking].animal}, 행운의 색은 {ELEMENT_LUCKY[lacking].color}입니다.
        </p>
      </Frame>

      {/* 이름 풀이 */}
      <Frame footer={footer}>
        <h2 style={h2}>四. 이름 한자 풀이(姓名解)</h2>
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
                <td style={{ padding: "8px", border: `1px solid ${C.line}`, fontSize: "24px", fontWeight: 700 }}>
                  {c.hanja}
                </td>
                <td style={{ padding: "8px", border: `1px solid ${C.line}` }}>{c.eum}</td>
                <td style={{ padding: "8px", border: `1px solid ${C.line}` }}>{c.hun ?? "-"}</td>
                <td style={{ padding: "8px", border: `1px solid ${C.line}` }}>{c.strokes}</td>
                <td style={{ padding: "8px", border: `1px solid ${C.line}` }}>
                  {c.element ? `${ELEMENT_HANJA[c.element]}(${c.element})` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 style={{ ...h2, marginTop: "34px" }}>五. 수리 81수 사격(四格)</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px" }}>
          <tbody>
            {GYEOK.map((g) => {
              const r = analysis.fourGyeok[g.key];
              return (
                <tr key={g.key}>
                  <td style={{ padding: "9px 8px", border: `1px solid ${C.line}`, width: "130px", fontWeight: 700 }}>
                    {g.name}
                  </td>
                  <td style={{ padding: "9px 8px", border: `1px solid ${C.line}`, width: "90px", textAlign: "center" }}>
                    {r.suri}수 · {r.lucky ? "길(吉)" : "흉(凶)"}
                  </td>
                  <td style={{ padding: "9px 8px", border: `1px solid ${C.line}`, color: C.muted }}>{g.desc}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h2 style={{ ...h2, marginTop: "34px" }}>六. 오행 조화와 종합 평가</h2>
        <p style={{ margin: "0 0 6px", fontSize: "16px", lineHeight: 1.8 }}>
          발음오행 {analysis.pronunciation.elements.join(" → ")} (조화 {analysis.pronunciation.score}점)
        </p>
        {analysis.resource && (
          <p style={{ margin: "0 0 6px", fontSize: "16px", lineHeight: 1.8 }}>
            자원오행 {analysis.resource.elements.join(" → ")} (조화 {analysis.resource.score}점)
            {analysis.resource.needMatched ? " · 용신 오행을 보강합니다." : ""}
            {analysis.resource.tonggwan
              ? " · 가운데 글자가 성씨와 용신 오행을 상생으로 이어 줍니다(통관)."
              : ""}
          </p>
        )}
        <p style={{ margin: "14px 0 0", fontSize: "26px", fontWeight: 800 }}>
          종합 점수 <span style={{ fontSize: "40px" }}>{analysis.totalScore}</span> / 100
          {analysis.grade && <span style={{ marginLeft: "16px" }}>{analysis.grade}등급</span>}
        </p>

        <p style={{ margin: "34px 0 0", fontSize: "12px", lineHeight: 1.7, color: C.muted }}>
          본 리포트는 억부·조후 중심의 단순화된 사주 풀이와 수리 81수·오행 이론에 따른 참고 자료이며, 합·충·형과
          격국은 반영하지 않았습니다. 작명의 최종 결정은 가족의 뜻과 함께 정하시길 권합니다.
        </p>
      </Frame>
    </div>
  );
}
