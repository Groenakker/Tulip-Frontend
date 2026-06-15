import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import styles from "./portal.module.css";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Lightweight customer-side intake form. The internal sample form has
// dozens of fields — for the portal we keep it short and let staff
// fill in the rest after the sample physically arrives. The fields
// we collect here are the ones the customer is best positioned to
// know.

export default function CustomerSampleNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    projectID: params.get("projectId") || "",
    name: "",
    sampleDescription: "",
    partNumber: "",
    lotNumber: "",
    manufacturer: "",
  });
  const [printedName, setPrintedName] = useState("");
  const sigRef = useRef();

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE_URL}/portal/customer/projects`, { credentials: "include" });
      if (res.ok) setProjects(await res.json());
    })();
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.projectID) return setError("Select a project");
    if (!printedName.trim()) return setError("Please print your name to sign");
    if (!sigRef.current || sigRef.current.isEmpty()) return setError("Please sign in the box");
    setSubmitting(true);
    try {
      const signatureImage = sigRef.current.toDataURL("image/png");
      const res = await fetch(`${API_BASE_URL}/portal/customer/samples`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, signatureImage, customerApprovalName: printedName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed");
      navigate(`/portal/samples/${data._id}`);
    } catch (err) {
      setError(err.message || "Failed to create sample");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>New sample submission</h1>
      <p className={styles.pageSub}>Tell us what you're sending. Our team will receive it on arrival and update the rest of the record.</p>
      <form onSubmit={submit}>
        <div className={styles.panel}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Project</label>
              <select required value={form.projectID} onChange={set("projectID")}>
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.projectID} · {p.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label>Sample name</label>
              <input value={form.name} onChange={set("name")} required />
            </div>
            <div className={styles.formField}>
              <label>Description</label>
              <input value={form.sampleDescription} onChange={set("sampleDescription")} />
            </div>
            <div className={styles.formField}>
              <label>Part #</label>
              <input value={form.partNumber} onChange={set("partNumber")} />
            </div>
            <div className={styles.formField}>
              <label>Lot #</label>
              <input value={form.lotNumber} onChange={set("lotNumber")} />
            </div>
            <div className={styles.formField}>
              <label>Manufacturer</label>
              <input value={form.manufacturer} onChange={set("manufacturer")} />
            </div>
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHead}><h2>Sign &amp; submit</h2></div>
          <div className={styles.formField} style={{ maxWidth: 320 }}>
            <label>Printed name</label>
            <input value={printedName} onChange={(e) => setPrintedName(e.target.value)} required />
          </div>
          <div className={styles.sigBox} style={{ maxWidth: 480 }}>
            <SignatureCanvas ref={sigRef} canvasProps={{ width: 460, height: 140, style: { width: "100%", background: "#fff", borderRadius: 6 } }} />
          </div>
          {error && <div className={styles.formError}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={styles.btnGhost} onClick={() => sigRef.current && sigRef.current.clear()}>Clear signature</button>
            <button type="submit" className={styles.btnPrimary} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
