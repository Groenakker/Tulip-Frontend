import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaSave, FaSyncAlt } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import toast from "../../../components/Toaster/toast";
import {
  getLibraryItem,
  getLibraryFullReport,
  updateLibraryItem,
  refreshLibraryResearch,
} from "./library.api";
import styles from "./LibraryDetail.module.css";

/**
 * Compound library detail page.
 *
 * Three panels — Overview, Notes (editable), and Toxicology profile —
 * with the underlying dossier coming from `/library/:id` and the long-
 * form report from `/library/:id/full-report`. Tulip's app shell
 * (Header + WhiteIsland) provides the page chrome.
 */
export default function LibraryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([
        getLibraryItem(id),
        getLibraryFullReport(id).catch(() => null), // report may not exist yet
      ]);
      setDetail(d);
      setReport(r);
      setNotes(d?.notes ?? "");
    } catch (err) {
      toast.error(err?.message || "Failed to load compound");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const updated = await updateLibraryItem(id, { notes });
      setDetail(updated);
      toast.success("Notes saved");
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updated = await refreshLibraryResearch(id);
      setDetail(updated);
      toast.success("Research refreshed");
      // Re-pull the full report too since it likely changed.
      const r = await getLibraryFullReport(id).catch(() => null);
      setReport(r);
    } catch (err) {
      toast.error(err?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Compound" />
        <WhiteIsland className="WhiteIsland">
          <p className={styles.loading}>Loading compound...</p>
        </WhiteIsland>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <Header title="Compound" />
        <WhiteIsland className="WhiteIsland">
          <p className={styles.loading}>Compound not found.</p>
        </WhiteIsland>
      </>
    );
  }

  return (
    <>
      <Header title={detail.name || "Compound"} />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/Toxicology/Library")}
          >
            <FaArrowLeft />
            <span>Back to library</span>
          </button>

          <div className={styles.toolbarRight}>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FaSyncAlt />
              <span>{refreshing ? "Refreshing..." : "Refresh research"}</span>
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {/* Overview card. */}
          <section className={styles.card}>
            <h3>Overview</h3>
            <dl className={styles.kv}>
              <Field label="Name" value={detail.name} />
              <Field label="CAS Number" value={detail.cas_number} />
              <Field label="ChEMBL ID" value={detail.chembl_id} />
              <Field label="PubChem CID" value={detail.pubchem_cid} />
              <Field label="DTXSID" value={detail.dtxsid} />
              <Field label="Formula" value={detail.molecular_formula} />
              <Field label="Molecular Weight" value={detail.molecular_weight} />
              <Field label="InChI Key" value={detail.inchi_key} />
              <Field label="SMILES" value={detail.smiles} mono />
              <Field label="Overall Risk" value={detail.overall_risk} />
              <Field label="Risk Rationale" value={detail.risk_rationale} />
              <Field
                label="Researched By"
                value={detail.researched_by || "—"}
              />
              <Field
                label="Research Date"
                value={
                  detail.research_date
                    ? new Date(detail.research_date).toLocaleString()
                    : "—"
                }
              />
            </dl>
          </section>

          {/* Editable notes card. */}
          <section className={styles.card}>
            <h3>Notes</h3>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes..."
            />
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSaveNotes}
              disabled={saving}
            >
              <FaSave />
              <span>{saving ? "Saving..." : "Save notes"}</span>
            </button>
          </section>

          {/* Flag chips. */}
          <section className={styles.card}>
            <h3>Regulatory flags</h3>
            <div className={styles.chips}>
              <Chip label="SVHC" active={detail.is_svhc} />
              <Chip label="CMR" active={detail.is_cmr} />
              <Chip label="Endocrine Disruptor" active={detail.is_endocrine_disruptor} />
              <Chip label="Prop 65" active={detail.is_prop65} />
              <Chip label="GRAS" active={detail.is_gras} positive />
            </div>
            {detail.svhc_reason && (
              <p className={styles.flagReason}>
                <strong>SVHC reason:</strong> {detail.svhc_reason}
              </p>
            )}
            {detail.cmr_classification && (
              <p className={styles.flagReason}>
                <strong>CMR classification:</strong> {detail.cmr_classification}
              </p>
            )}
          </section>

          {/* Full report panel. */}
          <section className={`${styles.card} ${styles.span2}`}>
            <h3>Research dossier</h3>
            {report ? (
              <details>
                <summary>Show raw report JSON ({Object.keys(report).length} keys)</summary>
                <pre className={styles.pre}>{JSON.stringify(report, null, 2)}</pre>
              </details>
            ) : (
              <p className={styles.loading}>
                No dossier on file yet. Click <em>Refresh research</em> above to fetch one.
              </p>
            )}
          </section>
        </div>
      </WhiteIsland>
    </>
  );
}

function Field({ label, value, mono }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? styles.mono : undefined}>{value == null || value === "" ? "—" : String(value)}</dd>
    </>
  );
}

function Chip({ label, active, positive }) {
  const className = active
    ? positive
      ? `${styles.chip} ${styles.chipPositive}`
      : `${styles.chip} ${styles.chipNegative}`
    : `${styles.chip} ${styles.chipNeutral}`;
  return <span className={className}>{label}</span>;
}
