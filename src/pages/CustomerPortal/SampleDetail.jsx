import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import styles from "./portal.module.css";
import { StatusPill } from "./Dashboard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Read-only view of the sample submission form for the customer side.
// Mirrors the relevant SSDetails fields and (when the customer hasn't
// signed yet) lets them apply their approval signature.

const FIELDS = [
  ["sampleCode", "Sample code"],
  ["projectName", "Project"],
  ["sampleDescription", "Description"],
  ["partNumber", "Part #"],
  ["lotNumber", "Lot #"],
  ["batchNumber", "Batch #"],
  ["manufacturer", "Manufacturer"],
  ["countryOrigin", "Country of origin"],
  ["sampleMass", "Mass"],
  ["sampleSterile", "Sterility"],
  ["sterilizationMethod", "Sterilization method"],
  ["shippingCondition", "Shipping condition"],
  ["sampleStorage", "Storage"],
  ["sampleDisposition", "Disposition"],
  ["specialInstructions", "Special instructions"],
];

export default function CustomerSampleDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [printedName, setPrintedName] = useState("");
  const sigRef = useRef();

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portal/customer/samples/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      setData(await res.json());
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <div className={styles.formError}>{error}</div>;
  if (!data) return null;

  const { sample, testOrderLines } = data;
  const needsSig = !sample.customerSignatureImage && sample.recordStatus !== "Closed";

  const submitSig = async () => {
    setSignError("");
    if (!printedName.trim()) return setSignError("Please print your name.");
    if (!sigRef.current || sigRef.current.isEmpty()) return setSignError("Please sign in the box.");
    setSigning(true);
    try {
      const signatureImage = sigRef.current.toDataURL("image/png");
      const res = await fetch(`${API_BASE_URL}/portal/customer/samples/${id}/sign`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureImage, name: printedName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      await reload();
    } catch (err) {
      setSignError(err.message || "Failed to submit");
    } finally {
      setSigning(false);
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>{sample.sampleCode} <StatusPill value={sample.status} /></h1>
      <p className={styles.pageSub}>{sample.name || sample.sampleDescription || "Sample submission form"}</p>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h2>Submission details</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {FIELDS.map(([k, label]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
              <div style={{ fontSize: 14, color: "#1f2937" }}>{sample[k] || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h2>Your approval</h2></div>
        {sample.customerSignatureImage ? (
          <div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>
              Approved by <strong>{sample.customerApprovalName || "—"}</strong>
              {sample.customerApprovalDate ? ` on ${new Date(sample.customerApprovalDate).toLocaleString()}` : ""}
            </div>
            <div className={styles.sigBox}><img src={sample.customerSignatureImage} alt="Customer signature" className={styles.sigImg} /></div>
          </div>
        ) : needsSig ? (
          <>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              Please review the submission above and sign to approve. Once you sign, the lab can proceed.
            </p>
            <div className={styles.formField} style={{ maxWidth: 320 }}>
              <label>Printed name</label>
              <input value={printedName} onChange={(e) => setPrintedName(e.target.value)} />
            </div>
            <div className={styles.sigBox} style={{ maxWidth: 480 }}>
              <SignatureCanvas ref={sigRef} canvasProps={{ width: 460, height: 140, style: { width: "100%", background: "#fff", borderRadius: 6 } }} />
            </div>
            {signError && <div className={styles.formError}>{signError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={styles.btnGhost} onClick={() => sigRef.current && sigRef.current.clear()}>Clear</button>
              <button type="button" className={styles.btnPrimary} disabled={signing} onClick={submitSig}>
                {signing ? "Submitting…" : "Approve & sign"}
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: "#6b7280" }}>Signature not required at this time.</p>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h2>Test status</h2></div>
        {testOrderLines?.length ? (
          <table className={styles.table}>
            <thead><tr><th>Test</th><th>Vendor</th><th>Status</th><th>Completed</th><th>Report</th></tr></thead>
            <tbody>
              {testOrderLines.map((l, i) => (
                <tr key={i}>
                  <td>{l.testCode || "—"}</td>
                  <td>{l.vendorBpName || "—"}</td>
                  <td><StatusPill value={l.status} /></td>
                  <td>{l.completedAt ? new Date(l.completedAt).toLocaleDateString() : "—"}</td>
                  <td>{l.reportFileUrl ? <a href={l.reportFileUrl} target="_blank" rel="noreferrer">{l.reportFileName || "Download"}</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className={styles.empty}>No tests have been ordered yet.</div>}
      </div>
    </>
  );
}
