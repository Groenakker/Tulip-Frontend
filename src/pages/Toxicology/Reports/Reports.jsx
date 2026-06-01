import React, { useState } from "react";
import { FaSearch, FaFilePdf } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import toast from "../../../components/Toaster/toast";
import { tox } from "../../../lib/toxApi";
import ReportPDFView from "./ReportsPDFView";
import styles from "./Reports.module.css";

/**
 * Reports page.
 *
 * Two passes per the integration plan:
 *   Pass 1 — HTML view of /report/generate sections, in-page.
 *   Pass 2 — Download-as-PDF button that lazy-imports
 *            ReportsPDFView (built on @react-pdf/renderer).
 *
 * The backend response shape is the same demonstration payload the
 * original ToxIntelligence ComprehensiveReport.jsx consumed, but we
 * render only the top-level sections that are useful out of the box.
 * Section-by-section parity with the full pdf*.jsx tree can be added
 * incrementally without changing this page's contract.
 */
const SCOPES = [
  { id: "compound", label: "Compound" },
  { id: "family", label: "Family" },
  { id: "tra_project", label: "TRA project" },
];

const ROUTES = [
  { id: "", label: "Auto-select" },
  { id: "dermal", label: "Dermal" },
  { id: "oral", label: "Oral" },
  { id: "inhalation", label: "Inhalation" },
  { id: "intravenous", label: "Intravenous" },
  { id: "systemic", label: "Systemic" },
];

export default function Reports() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("compound");
  const [route, setRoute] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setShowPdf(false);
    try {
      const data = await tox.get("/report/generate", {
        query,
        evaluation_scope: scope,
        target_route: route || undefined,
      });
      setReport(data);
    } catch (err) {
      toast.error(err?.message || "Report generation failed");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Reports" />
      <WhiteIsland className="WhiteIsland">
        <form onSubmit={handleGenerate} className={styles.searchRow}>
          <div className={styles.searchInputWrapper}>
            <FaSearch className={styles.icon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Compound name, CAS, family, or TRA project"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className={styles.select}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            {SCOPES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={route}
            onChange={(e) => setRoute(e.target.value)}
          >
            {ROUTES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <button type="submit" className={styles.primaryButton} disabled={loading || !query.trim()}>
            {loading ? "Generating..." : "Generate"}
          </button>
        </form>

        {!report && (
          <p className={styles.empty}>
            Pick a scope and run a generation to see the dossier here. The
            HTML version renders inline; click <em>Download PDF</em> to get a
            printable copy.
          </p>
        )}

        {report && (
          <>
            <div className={styles.actionBar}>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setShowPdf((s) => !s)}
              >
                <FaFilePdf />
                <span>{showPdf ? "Hide PDF download" : "Download PDF"}</span>
              </button>
            </div>

            {showPdf && <ReportPDFView report={report} query={query} />}

            <ReportHTML report={report} />
          </>
        )}
      </WhiteIsland>
    </>
  );
}

/**
 * Inline HTML rendering of the most useful report sections.
 * Each card guards against missing data so a thinly populated
 * payload still renders without crashing.
 */
function ReportHTML({ report }) {
  if (!report) return null;
  const compound = report.compounds?.primary || report.compound || {};
  const sources = report.data_sources || {};
  const ai = report.ai_summary || {};
  const hazards = report.hazards || report.hazard_summary || {};

  return (
    <article className={styles.reportPaper}>
      <header className={styles.reportHeader}>
        <h2>{compound?.name || report.query || "Report"}</h2>
        <p className={styles.muted}>
          Scope: {report.evaluation_scope || "compound"}
          {report.target_route ? ` • Route: ${report.target_route}` : ""}
        </p>
      </header>

      <Section title="Compound profile">
        {compound?.name ? (
          <dl className={styles.kv}>
            <Field label="Name" value={compound.name} />
            <Field label="CAS" value={compound.cas_number} />
            <Field label="ChEMBL ID" value={compound.chembl_id} />
            <Field label="PubChem CID" value={compound.pubchem_cid} />
            <Field label="Formula" value={compound.molecular_formula} />
            <Field label="Molecular weight" value={compound.molecular_weight} />
            <Field label="SMILES" value={compound.smiles} mono />
            <Field label="InChI Key" value={compound.inchi_key} />
          </dl>
        ) : (
          <p className={styles.muted}>No compound profile in payload.</p>
        )}
      </Section>

      <Section title="AI / narrative summary">
        {ai.summary ? (
          <p className={styles.body}>{ai.summary}</p>
        ) : ai.error ? (
          <p className={styles.muted}>{ai.error}{ai.note ? ` (${ai.note})` : ""}</p>
        ) : (
          <p className={styles.muted}>No AI summary in payload.</p>
        )}
      </Section>

      <Section title="Hazard endpoints">
        {Object.keys(hazards).length === 0 ? (
          <p className={styles.muted}>No hazard data attached.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(hazards).map(([k, v]) => (
                <tr key={k}>
                  <td>{prettify(k)}</td>
                  <td>{typeof v === "object" ? JSON.stringify(v) : String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Source coverage">
        {Object.keys(sources).length === 0 ? (
          <p className={styles.muted}>No source coverage data.</p>
        ) : (
          <ul className={styles.sourceList}>
            {Object.entries(sources).map(([k, v]) => (
              <li key={k}>
                <strong>{prettify(k)}</strong>
                <span className={styles.muted}>
                  {typeof v === "object"
                    ? v?.status || `${Object.keys(v).length} keys`
                    : String(v)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Raw payload">
        <details>
          <summary>Show entire response ({Object.keys(report).length} keys)</summary>
          <pre className={styles.pre}>{JSON.stringify(report, null, 2)}</pre>
        </details>
      </Section>
    </article>
  );
}

function Section({ title, children }) {
  return (
    <section className={styles.reportSection}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value, mono }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? styles.mono : undefined}>
        {value == null || value === "" ? "—" : String(value)}
      </dd>
    </>
  );
}

function prettify(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
