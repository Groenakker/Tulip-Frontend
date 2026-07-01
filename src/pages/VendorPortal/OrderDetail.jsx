import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "../CustomerPortal/portal.module.css";
import { StatusPill } from "../CustomerPortal/Dashboard";
import Select from "../../components/Select/Select";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const STATUSES = ["Pending", "In Progress", "Done", "Failed"];

export default function VendorOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portal/vendor/orders/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      setOrder(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <div className={styles.formError}>{error}</div>;
  if (!order) return null;

  const isLocked = order.status === "Completed" || order.status === "Cancelled";

  const saveLine = async (lineId, patch) => {
    setSaving(lineId);
    try {
      const res = await fetch(`${API_BASE_URL}/portal/vendor/orders/${id}/lines/${lineId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      const updated = await res.json();
      setOrder(updated);
    } catch (err) {
      alert(err.message || "Failed");
    } finally { setSaving(null); }
  };

  const uploadReport = async (line, file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      saveLine(line._id, { reportFile: { fileName: file.name, fileUrl: reader.result } });
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <h1 className={styles.pageTitle}>{order.orderCode} <StatusPill value={order.status} /></h1>
      <p className={styles.pageSub}>
        Customer: <strong>{order.customerBpName || "—"}</strong> · Project: <strong>{order.projectName || "—"}</strong>
        {order.sentAt && <> · Sent: {new Date(order.sentAt).toLocaleDateString()}</>}
      </p>
      {order.notes && (
        <div className={styles.panel}>
          <div className={styles.panelHead}><h2>Notes from lab</h2></div>
          <p style={{ color: "#374151", marginTop: 0 }}>{order.notes}</p>
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHead}><h2>Lines</h2></div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sample</th><th>Test code</th><th>Status</th><th>Result</th><th>Report</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l._id}>
                <td>{l.sampleCode || "—"}</td>
                <td>{l.testCodeRef || "—"}</td>
                <td>
                  <Select
                    value={l.status}
                    disabled={isLocked || saving === l._id}
                    onChange={(e) => saveLine(l._id, { status: e.target.value })}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </td>
                <td>
                  <input
                    type="text"
                    disabled={isLocked}
                    defaultValue={l.result || ""}
                    placeholder="result"
                    onBlur={(e) => e.target.value !== (l.result || "") && saveLine(l._id, { result: e.target.value })}
                    style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", width: 140 }}
                  />
                </td>
                <td>
                  {l.reportFile?.fileUrl ? (
                    <a href={l.reportFile.fileUrl} download={l.reportFile.fileName} target="_blank" rel="noreferrer">
                      {l.reportFile.fileName || "Report"}
                    </a>
                  ) : "—"}
                  {!isLocked && (
                    <div>
                      <label style={{ fontSize: 12, color: "#456fb6", cursor: "pointer" }}>
                        {l.reportFile?.fileUrl ? "Replace" : "Upload"}
                        <input
                          type="file"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadReport(l, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to="/vendor/orders" className={styles.btnGhost}>← Back to orders</Link>
    </>
  );
}
