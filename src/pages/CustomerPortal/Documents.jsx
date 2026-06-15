import React, { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import styles from "./portal.module.css";
import { StatusPill } from "./Dashboard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function CustomerDocuments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);
  const [mode, setMode] = useState("approve"); // 'approve' | 'reject'
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actError, setActError] = useState("");
  const sigRef = useRef();

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portal/customer/documents/pending`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      setRows(await res.json());
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const submit = async () => {
    setSubmitting(true);
    setActError("");
    try {
      if (mode === "approve") {
        const sig = sigRef.current && !sigRef.current.isEmpty() ? sigRef.current.toDataURL("image/png") : null;
        const res = await fetch(`${API_BASE_URL}/portal/customer/documents/${acting.versionId}/approve`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature: sig }),
        });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      } else {
        const res = await fetch(`${API_BASE_URL}/portal/customer/documents/${acting.versionId}/reject`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      }
      setActing(null);
      setReason("");
      await reload();
    } catch (err) {
      setActError(err.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>Documents</h1>
      <p className={styles.pageSub}>Items waiting for your review or approval.</p>
      <div className={styles.panel}>
        {loading && <p>Loading…</p>}
        {error && <div className={styles.formError}>{error}</div>}
        {!loading && !error && (
          <table className={styles.table}>
            <thead><tr><th>Document</th><th>Version</th><th>Role</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((r) => (
                <tr key={r.versionId}>
                  <td>
                    {r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer">{r.documentName}</a> : r.documentName}
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{r.documentCode}</div>
                  </td>
                  <td>{r.version}</td>
                  <td>{r.role}</td>
                  <td><StatusPill value={r.myStatus} /></td>
                  <td>{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</td>
                  <td>
                    {r.myStatus === "Pending" ? (
                      <>
                        <button className={styles.btnPrimary} onClick={() => { setActing(r); setMode("approve"); setActError(""); }}>Approve</button>
                        <button className={styles.btnGhost} style={{ marginLeft: 6 }} onClick={() => { setActing(r); setMode("reject"); setActError(""); }}>Reject</button>
                      </>
                    ) : <span style={{ color: "#6b7280", fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6"><div className={styles.empty}>No documents pending your action.</div></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {acting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 22, width: 520, maxWidth: "92vw" }}>
            <h3 style={{ marginTop: 0 }}>
              {mode === "approve" ? "Approve document" : "Reject document"}
            </h3>
            <p style={{ color: "#6b7280" }}>{acting.documentName} · v{acting.version}</p>
            {mode === "approve" ? (
              <>
                <p style={{ fontSize: 13 }}>Sign below to record your approval (optional).</p>
                <div className={styles.sigBox}>
                  <SignatureCanvas ref={sigRef} canvasProps={{ width: 460, height: 140, style: { width: "100%", background: "#fff", borderRadius: 6 } }} />
                </div>
              </>
            ) : (
              <div className={styles.formField}>
                <label>Reason</label>
                <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: 10 }} />
              </div>
            )}
            {actError && <div className={styles.formError}>{actError}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className={styles.btnGhost} onClick={() => setActing(null)}>Cancel</button>
              <button className={styles.btnPrimary} disabled={submitting} onClick={submit}>
                {submitting ? "Submitting…" : mode === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
