import { useState, useEffect, useRef } from "react";
import { X, Search, ChevronRight } from "lucide-react";
import {
  QUICK_START_STEPS,
  USER_GUIDE_SECTIONS,
  GLOSSARY_SECTIONS,
  POLI_RATING_BANDS,
  FAQ_SECTIONS,
  DATA_DICTIONARY,
  type GuideSection,
  type GlossarySection,
  type FaqSection,
} from "@shared/help-content";

// ─── Design tokens (matches settings-panel.tsx) ───────────────────────────────

const MONO: React.CSSProperties = { fontFamily: "JetBrains Mono, monospace" };
const COL = {
  bg: "#0B1019", bg2: "#080D14", panel: "#0F151F",
  border: "#1A2435", border2: "#0F1520",
  accent: "#00BFA5", text: "#D8DEE8", sub: "#7B8EA3",
  dim: "#4A5B6E", green: "#00E676", amber: "#FFB300", red: "#FF5252",
};

function sectionTitle(text: string) {
  return (
    <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${COL.border}` }}>
      {text}
    </div>
  );
}

function prose(text: string, style?: React.CSSProperties) {
  return <p style={{ ...MONO, fontSize: 11, color: COL.text, lineHeight: 1.75, margin: 0, ...style }}>{text}</p>;
}

function ragBadge(rating: string) {
  const color =
    rating === "AAA" || rating === "AA" ? COL.green :
    rating === "A"   || rating === "BBB" ? "#7ED321" :
    rating === "BB"  || rating === "B"   ? COL.amber :
    rating === "CCC" ? "#FF8C00" : COL.red;
  return (
    <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 2, padding: "1px 6px", letterSpacing: "0.06em" }}>
      {rating}
    </span>
  );
}

// ─── Quick Start section ──────────────────────────────────────────────────────

function QuickStartView({ search }: { search: string }) {
  const q = search.toLowerCase();
  const steps = q
    ? QUICK_START_STEPS.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.bullets?.some(b => b.toLowerCase().includes(q)))
    : QUICK_START_STEPS;

  return (
    <div>
      {sectionTitle("Quick Start  -  Operational in 10 Minutes")}
      <p style={{ ...MONO, fontSize: 10, color: COL.sub, marginBottom: 18, lineHeight: 1.6 }}>
        This guide gets you from login to your first supervisory review.
      </p>
      {steps.length === 0 && <p style={{ ...MONO, fontSize: 11, color: COL.dim }}>No results for "{search}"</p>}
      {steps.map(step => (
        <div key={step.num} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${COL.border2}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ ...MONO, fontSize: 18, fontWeight: 800, color: COL.accent, opacity: 0.4, lineHeight: 1, flexShrink: 0, width: 24, textAlign: "right" }}>
              {step.num}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...MONO, fontSize: 11, fontWeight: 700, color: COL.text, marginBottom: 6, letterSpacing: "0.04em" }}>{step.title}</div>
              {prose(step.body)}
              {step.bullets && (
                <ul style={{ margin: "8px 0 0 0", padding: 0, listStyle: "none" }}>
                  {step.bullets.map((b, i) => (
                    <li key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                      <span style={{ ...MONO, fontSize: 11, color: COL.accent, flexShrink: 0 }}>›</span>
                      <span style={{ ...MONO, fontSize: 11, color: COL.sub, lineHeight: 1.65 }}>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── User Guide section ───────────────────────────────────────────────────────

function UserGuideView({ search }: { search: string }) {
  const [activePage, setActivePage] = useState("overview");
  const q = search.toLowerCase();

  const filtered: GuideSection[] = q
    ? USER_GUIDE_SECTIONS.map(sec => ({
        ...sec,
        subsections: sec.subsections.filter(s =>
          s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q)),
      })).filter(sec => sec.subsections.length > 0 || sec.title.toLowerCase().includes(q))
    : USER_GUIDE_SECTIONS;

  const activeSection = filtered.find(s => s.id === activePage) ?? filtered[0];

  return (
    <div>
      {sectionTitle("User Guide  -  Comprehensive Platform Documentation")}

      {/* Page nav */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
        {filtered.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActivePage(sec.id)}
            style={{
              ...MONO, fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase",
              padding: "4px 8px", borderRadius: 2, cursor: "pointer", border: "none",
              background: activePage === sec.id ? COL.accent : COL.panel,
              color: activePage === sec.id ? COL.bg : COL.sub,
              fontWeight: activePage === sec.id ? 700 : 400,
            }}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {activeSection && (
        <div>
          <div style={{ ...MONO, fontSize: 12, fontWeight: 700, color: COL.text, marginBottom: 14 }}>
            {activeSection.title}
          </div>
          {activeSection.subsections.map(sub => (
            <div key={sub.id} style={{ marginBottom: 18, padding: "12px 14px", background: COL.panel, border: `1px solid ${COL.border}`, borderRadius: 2 }}>
              <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, letterSpacing: "0.08em", marginBottom: 7 }}>{sub.title}</div>
              {prose(sub.body)}
            </div>
          ))}

          {/* PoLi rating table inline in User Guide PoLi section */}
          {activeSection.id === "poli-pomi" && (
            <div style={{ marginTop: 4 }}>
              <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, letterSpacing: "0.08em", marginBottom: 8 }}>PoLi Rating Bands</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Score", "Rating", "Interpretation"].map(h => (
                      <th key={h} style={{ ...MONO, fontSize: 9, color: COL.dim, textAlign: "left", padding: "4px 8px", borderBottom: `1px solid ${COL.border}`, letterSpacing: "0.10em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {POLI_RATING_BANDS.map((row, i) => (
                    <tr key={row.rating} style={{ background: i % 2 === 0 ? "transparent" : `${COL.panel}88` }}>
                      <td style={{ ...MONO, fontSize: 10, color: COL.sub, padding: "5px 8px" }}>{row.range}</td>
                      <td style={{ padding: "5px 8px" }}>{ragBadge(row.rating)}</td>
                      <td style={{ ...MONO, fontSize: 10, color: COL.text, padding: "5px 8px", lineHeight: 1.5 }}>{row.interpretation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Glossary section ─────────────────────────────────────────────────────────

function GlossaryView({ search }: { search: string }) {
  const [activeCategory, setActiveCategory] = useState("metrics");
  const q = search.toLowerCase();

  const filtered: GlossarySection[] = q
    ? GLOSSARY_SECTIONS.map(sec => ({
        ...sec,
        terms: sec.terms.filter(t => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)),
      })).filter(sec => sec.terms.length > 0)
    : GLOSSARY_SECTIONS;

  const activeSection = filtered.find(s => s.id === activeCategory) ?? filtered[0];

  return (
    <div>
      {sectionTitle("Glossary  -  Metrics, Indicators, and Terminology")}

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
        {filtered.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveCategory(sec.id)}
            style={{
              ...MONO, fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase",
              padding: "4px 8px", borderRadius: 2, cursor: "pointer", border: "none",
              background: activeCategory === sec.id ? COL.accent : COL.panel,
              color: activeCategory === sec.id ? COL.bg : COL.sub,
              fontWeight: activeCategory === sec.id ? 700 : 400,
            }}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {activeSection && (
        <div>
          {activeSection.terms.length === 0
            ? <p style={{ ...MONO, fontSize: 11, color: COL.dim }}>No results for "{search}"</p>
            : activeSection.terms.map((t, i) => (
              <div
                key={t.term}
                style={{
                  marginBottom: 0, padding: "10px 12px",
                  background: i % 2 === 0 ? COL.panel : "transparent",
                  border: `1px solid ${i % 2 === 0 ? COL.border : "transparent"}`,
                  borderRadius: 2, marginTop: 4,
                }}
              >
                <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, marginBottom: 5, letterSpacing: "0.06em" }}>{t.term}</div>
                <p style={{ ...MONO, fontSize: 10, color: COL.sub, lineHeight: 1.7, margin: 0 }}>{t.definition}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── FAQ section ──────────────────────────────────────────────────────────────

function FaqView({ search }: { search: string }) {
  const [activeCategory, setActiveCategory] = useState("general");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const q = search.toLowerCase();

  const filtered: FaqSection[] = q
    ? FAQ_SECTIONS.map(sec => ({
        ...sec,
        items: sec.items.filter(it => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
      })).filter(sec => sec.items.length > 0)
    : FAQ_SECTIONS;

  const activeSection = filtered.find(s => s.id === activeCategory) ?? filtered[0];

  return (
    <div>
      {sectionTitle("FAQ  -  Frequently Asked Questions")}

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
        {filtered.map(sec => (
          <button
            key={sec.id}
            onClick={() => { setActiveCategory(sec.id); setOpenIdx(null); }}
            style={{
              ...MONO, fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase",
              padding: "4px 8px", borderRadius: 2, cursor: "pointer", border: "none",
              background: activeCategory === sec.id ? COL.accent : COL.panel,
              color: activeCategory === sec.id ? COL.bg : COL.sub,
              fontWeight: activeCategory === sec.id ? 700 : 400,
            }}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {activeSection && (
        <div>
          {activeSection.items.length === 0
            ? <p style={{ ...MONO, fontSize: 11, color: COL.dim }}>No results for "{search}"</p>
            : activeSection.items.map((item, i) => (
              <div key={i} style={{ marginBottom: 4, border: `1px solid ${COL.border}`, borderRadius: 2, overflow: "hidden" }}>
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", background: openIdx === i ? COL.panel : "transparent",
                    border: "none", cursor: "pointer", padding: "10px 12px",
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
                  }}
                >
                  <span style={{ ...MONO, fontSize: 11, fontWeight: 600, color: COL.text, lineHeight: 1.5, flex: 1 }}>{item.q}</span>
                  <ChevronRight
                    size={12}
                    style={{ flexShrink: 0, color: COL.dim, marginTop: 2, transition: "transform 0.15s", transform: openIdx === i ? "rotate(90deg)" : "rotate(0deg)" }}
                  />
                </button>
                {openIdx === i && (
                  <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${COL.border}` }}>
                    <p style={{ ...MONO, fontSize: 10, color: COL.sub, lineHeight: 1.75, margin: "10px 0 0 0" }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Data Dictionary section ──────────────────────────────────────────────────

function DataDictView({ search }: { search: string }) {
  const [activeSec, setActiveSec] = useState("flow");
  const q = search.toLowerCase();

  const filtered = DATA_DICTIONARY.filter(sec =>
    !q ||
    sec.title.toLowerCase().includes(q) ||
    sec.intro?.toLowerCase().includes(q) ||
    sec.rows.some(r => r.metric.toLowerCase().includes(q) || r.computation.toLowerCase().includes(q))
  );

  const activeSection = filtered.find(s => s.id === activeSec) ?? filtered[0];

  const venueSection = activeSection?.id === "venues";

  return (
    <div>
      {sectionTitle("Data Dictionary  -  Lineage, Computation & Update Frequency")}

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
        {filtered.map(sec => (
          <button
            key={sec.id}
            onClick={() => setActiveSec(sec.id)}
            style={{
              ...MONO, fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase",
              padding: "4px 8px", borderRadius: 2, cursor: "pointer", border: "none",
              background: activeSec === sec.id ? COL.accent : COL.panel,
              color: activeSec === sec.id ? COL.bg : COL.sub,
              fontWeight: activeSec === sec.id ? 700 : 400,
            }}
          >
            {sec.title}
          </button>
        ))}
      </div>

      {activeSection && (
        <div>
          {activeSection.intro && (
            <div style={{ marginBottom: 16, padding: "10px 12px", background: COL.panel, border: `1px solid ${COL.border}`, borderRadius: 2 }}>
              {prose(activeSection.intro)}
            </div>
          )}

          {activeSection.rows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: venueSection ? 380 : 320 }}>
                <thead>
                  <tr style={{ background: COL.panel }}>
                    <th style={{ ...MONO, fontSize: 9, color: COL.dim, textAlign: "left", padding: "5px 8px", borderBottom: `1px solid ${COL.border}`, letterSpacing: "0.10em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {venueSection ? "Venue" : "Metric"}
                    </th>
                    <th style={{ ...MONO, fontSize: 9, color: COL.dim, textAlign: "left", padding: "5px 8px", borderBottom: `1px solid ${COL.border}`, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                      Source
                    </th>
                    <th style={{ ...MONO, fontSize: 9, color: COL.dim, textAlign: "left", padding: "5px 8px", borderBottom: `1px solid ${COL.border}`, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                      {venueSection ? "Data Modules" : "Computation"}
                    </th>
                    {(activeSection.rows.some(r => r.frequency) || activeSection.rows.some(r => r.thresholds)) && (
                      <th style={{ ...MONO, fontSize: 9, color: COL.dim, textAlign: "left", padding: "5px 8px", borderBottom: `1px solid ${COL.border}`, letterSpacing: "0.10em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {activeSection.rows.some(r => r.thresholds) ? "Thresholds" : "Frequency"}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activeSection.rows
                    .filter(r =>
                      !q ||
                      r.metric.toLowerCase().includes(q) ||
                      r.computation.toLowerCase().includes(q) ||
                      r.source.toLowerCase().includes(q)
                    )
                    .map((row, i) => (
                    <tr key={row.metric} style={{ background: i % 2 === 0 ? "transparent" : `${COL.panel}77`, borderBottom: `1px solid ${COL.border2}` }}>
                      <td style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, padding: "6px 8px", whiteSpace: "nowrap" }}>{row.metric}</td>
                      <td style={{ ...MONO, fontSize: 10, color: COL.sub, padding: "6px 8px", whiteSpace: "nowrap" }}>{row.source}</td>
                      <td style={{ ...MONO, fontSize: 10, color: COL.text, padding: "6px 8px", lineHeight: 1.5 }}>{row.computation}</td>
                      {(row.frequency || row.thresholds) && (
                        <td style={{ ...MONO, fontSize: 9, color: COL.amber, padding: "6px 8px", whiteSpace: "nowrap", lineHeight: 1.5 }}>
                          {row.thresholds ?? row.frequency}
                        </td>
                      )}
                      {!(row.frequency || row.thresholds) && activeSection.rows.some(r => r.frequency || r.thresholds) && (
                        <td style={{ padding: "6px 8px" }} />
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "quickstart",  label: "QUICK\nSTART"  },
  { id: "userguide",   label: "USER\nGUIDE"   },
  { id: "glossary",    label: "GLOSSARY"      },
  { id: "faq",         label: "FAQ"           },
  { id: "datadict",    label: "DATA\nDICT"    },
] as const;

type SectionId = typeof NAV_ITEMS[number]["id"];

interface HelpPanelProps {
  onClose: () => void;
  initialSection?: SectionId;
}

export function HelpPanel({ onClose, initialSection = "quickstart" }: HelpPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    // Focus search on mount
    setTimeout(() => searchRef.current?.focus(), 80);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 999 }} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Help"
        data-testid="help-panel"
        style={{
          position: "fixed", top: 0, right: 0, width: 540, height: "100vh",
          zIndex: 1000, background: COL.bg, borderLeft: `1px solid ${COL.border}`,
          display: "flex", flexDirection: "column",
          animation: "help-slide-in 0.2s ease-out",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px 0", borderBottom: `1px solid ${COL.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ ...MONO, fontSize: 12, fontWeight: 700, color: COL.accent, letterSpacing: "0.12em" }}>HELP</span>
              <span style={{ ...MONO, fontSize: 9, color: COL.dim, letterSpacing: "0.10em" }}>TILT · STRATALINK LABS</span>
            </div>
            <button onClick={onClose} data-testid="button-close-help" style={{ background: "none", border: "none", cursor: "pointer", color: COL.dim, padding: 2 }}>
              <X size={14} />
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={11} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: COL.dim, pointerEvents: "none" }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documentation…"
              data-testid="input-help-search"
              style={{
                width: "100%", background: COL.panel, border: `1px solid ${COL.border}`,
                borderRadius: 2, color: COL.text, ...MONO, fontSize: 11,
                padding: "6px 10px 6px 28px", outline: "none", boxSizing: "border-box",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: COL.dim, padding: 0 }}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left nav */}
          <div style={{ width: 80, flexShrink: 0, borderRight: `1px solid ${COL.border}`, paddingTop: 8, overflowY: "auto" }}>
            {NAV_ITEMS.map(item => {
              const isActive = activeSection === item.id;
              const lines = item.label.split("\n");
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  data-testid={`help-nav-${item.id}`}
                  style={{
                    width: "100%", textAlign: "center", background: isActive ? "#0F1520" : "none",
                    border: "none", borderLeft: isActive ? `2px solid ${COL.accent}` : "2px solid transparent",
                    padding: "12px 6px", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center",
                  }}
                >
                  {lines.map((l, i) => (
                    <span
                      key={i}
                      style={{
                        ...MONO, fontSize: 9, fontWeight: isActive ? 700 : 400,
                        color: isActive ? COL.accent : COL.sub,
                        letterSpacing: "0.10em", lineHeight: 1.4,
                        display: "block",
                      }}
                    >
                      {l}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 24px" }}>
            {activeSection === "quickstart" && <QuickStartView search={search} />}
            {activeSection === "userguide"  && <UserGuideView  search={search} />}
            {activeSection === "glossary"   && <GlossaryView   search={search} />}
            {activeSection === "faq"        && <FaqView        search={search} />}
            {activeSection === "datadict"   && <DataDictView   search={search} />}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${COL.border}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ ...MONO, fontSize: 9, color: COL.dim }}>TILT v1.2.0 · Stratalink Labs Ltd</span>
          <span style={{ ...MONO, fontSize: 9, color: COL.dim }}>Pilot documentation · Confidential</span>
        </div>
      </div>

      <style>{`
        @keyframes help-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
