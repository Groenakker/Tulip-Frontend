import React, { useState } from "react";
import { FaSearch, FaExternalLinkAlt } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import { tox } from "../../../lib/toxApi";
import { saveFromResearch } from "../Library/library.api";
import toast from "../../../components/Toaster/toast";
import styles from "./CompoundSearch.module.css";
import { useNavigate } from "react-router-dom";

/**
 * Compound Search page.
 *
 * Fans the same query out to three upstream sources in parallel and
 * renders each result set in its own tab. Each row has a "Save to
 * library" action that routes through /api/tox/v1/library/save-from-
 * research to produce a dossier we can pin into the local library.
 */
const TABS = [
  { id: "pubchem", label: "PubChem", endpoint: "/pubchem/search" },
  { id: "comptox", label: "EPA CompTox", endpoint: "/comptox/search" },
  { id: "chembl", label: "ChEMBL", endpoint: "/compounds/search" },
];

const EMPTY_STATE = {
  pubchem: { loading: false, error: null, rows: [] },
  comptox: { loading: false, error: null, rows: [] },
  chembl: { loading: false, error: null, rows: [] },
};

export default function CompoundSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("pubchem");
  const [state, setState] = useState(EMPTY_STATE);
  const [savingId, setSavingId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setState({
      pubchem: { loading: true, error: null, rows: [] },
      comptox: { loading: true, error: null, rows: [] },
      chembl: { loading: true, error: null, rows: [] },
    });

    // Fire all three in parallel; one failing doesn't block the others.
    const settled = await Promise.allSettled(
      TABS.map((t) => tox.get(t.endpoint, { query: q, limit: 25 })),
    );

    setState({
      pubchem: extract(settled[0], "pubchem"),
      comptox: extract(settled[1], "comptox"),
      chembl: extract(settled[2], "chembl"),
    });
  };

  const handleSave = async (tabId, row) => {
    // Build a query string the dossier builder can resolve. For PubChem
    // we prefer InChIKey, for CompTox the DTXSID, for ChEMBL the
    // ChEMBL id. Falls back to display name.
    const seed =
      tabId === "pubchem"
        ? row.inchi_key || row.cid || row.name
        : tabId === "comptox"
          ? row.dtxsid || row.casrn || row.name
          : row.chembl_id || row.name;
    if (!seed) return;
    setSavingId(`${tabId}:${seed}`);
    try {
      const created = await saveFromResearch({ query: String(seed) });
      toast.success(`Saved "${created?.name || seed}" to library`);
      navigate(`/Toxicology/Library/${created.id}`);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const current = state[active];

  return (
    <>
      <Header title="Compound Search" />
      <WhiteIsland className="WhiteIsland">
        <form onSubmit={handleSearch} className={styles.searchRow}>
          <div className={styles.searchInputWrapper}>
            <FaSearch className={styles.icon} />
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              placeholder="Enter compound name, CAS, or SMILES..."
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.primaryButton} disabled={!query.trim()}>
            Search
          </button>
        </form>

        <div className={styles.tabs}>
          {TABS.map((t) => {
            const s = state[t.id];
            const count = s.rows.length;
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
                <span className={styles.tabBadge}>
                  {s.loading ? "..." : count}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.results}>
          {current.loading && <p className={styles.empty}>Searching {active}...</p>}
          {!current.loading && current.error && (
            <p className={styles.error}>Error: {current.error}</p>
          )}
          {!current.loading && !current.error && current.rows.length === 0 && (
            <p className={styles.empty}>
              {query
                ? "No results — try another query."
                : "Type a compound name, CAS, or SMILES and press Search."}
            </p>
          )}
          {!current.loading && current.rows.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Identifier</th>
                  <th>Name</th>
                  <th>Formula</th>
                  <th>MW</th>
                  <th>Extra</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {current.rows.map((row, idx) => {
                  const idKey = `${active}:${row.id || idx}`;
                  return (
                    <tr key={idKey}>
                      <td className={styles.mono}>{row.id || "—"}</td>
                      <td>{row.name || "—"}</td>
                      <td>{row.formula || "—"}</td>
                      <td>{row.mw || "—"}</td>
                      <td>{row.extra || "—"}</td>
                      <td className={styles.actionsCell}>
                        {row.url && (
                          <a
                            className={styles.iconLink}
                            href={row.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            title="Open source"
                          >
                            <FaExternalLinkAlt />
                          </a>
                        )}
                        <button
                          type="button"
                          className={styles.smallButton}
                          disabled={savingId === `${active}:${row.saveSeed}`}
                          onClick={() => handleSave(active, row.raw)}
                        >
                          {savingId === `${active}:${row.saveSeed}`
                            ? "Saving..."
                            : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </WhiteIsland>
    </>
  );
}

/**
 * Normalise the three upstream payload shapes into a single row format
 * so the JSX above stays simple.
 */
function extract(settled, tabId) {
  if (settled.status === "rejected") {
    return { loading: false, error: settled.reason?.message || "Failed", rows: [] };
  }
  const data = settled.value || {};
  const rows = (data.compounds || []).map((c) => mapRow(c, tabId));
  return { loading: false, error: null, rows };
}

function mapRow(c, tabId) {
  if (tabId === "pubchem") {
    const p = c.properties || {};
    return {
      id: c.cid ? `CID ${c.cid}` : "",
      name: c.name || c.iupac_name,
      formula: p.MolecularFormula,
      mw: p.MolecularWeight ? Number(p.MolecularWeight).toFixed(2) : null,
      extra: c.synonyms?.slice(0, 2).join(", "),
      url: c.cid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}` : null,
      inchi_key: p.InChIKey,
      saveSeed: c.inchi_key || c.cid || c.name,
      raw: c,
    };
  }
  if (tabId === "comptox") {
    return {
      id: c.dtxsid || c.casrn || "",
      name: c.preferred_name || c.name,
      formula: c.molecular_formula,
      mw: c.average_mass || c.monoisotopic_mass,
      extra: c.casrn || c.dtxsid,
      url: c.dtxsid
        ? `https://comptox.epa.gov/dashboard/chemical/${c.dtxsid}`
        : null,
      saveSeed: c.dtxsid || c.casrn || c.preferred_name || c.name,
      raw: c,
    };
  }
  // ChEMBL via /compounds/search
  return {
    id: c.chembl_id || "",
    name: c.name || c.pref_name,
    formula: null,
    mw: c.molecular_weight ? Number(c.molecular_weight).toFixed(2) : null,
    extra: c.molecule_type,
    url: c.chembl_id
      ? `https://www.ebi.ac.uk/chembl/compound_report_card/${c.chembl_id}/`
      : null,
    saveSeed: c.chembl_id || c.name,
    raw: c,
  };
}
