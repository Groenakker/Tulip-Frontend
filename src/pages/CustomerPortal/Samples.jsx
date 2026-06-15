import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./portal.module.css";
import { StatusPill } from "./Dashboard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function CustomerSamples() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/customer/samples`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
        setRows(await res.json());
      } catch (err) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <h1 className={styles.pageTitle}>Samples</h1>
      <p className={styles.pageSub}>All samples we've received or are processing for you.</p>
      <div className={styles.panelHead} style={{ marginBottom: 14 }}>
        <span />
        <Link to="/portal/samples/new" className={styles.btnPrimary}>+ New sample submission</Link>
      </div>
      <div className={styles.panel}>
        {loading && <p>Loading…</p>}
        {error && <div className={styles.formError}>{error}</div>}
        {!loading && !error && (
          <table className={styles.table}>
            <thead><tr><th>Code</th><th>Description</th><th>Project</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((s) => (
                <tr key={s._id} className={styles.rowClickable} onClick={() => navigate(`/portal/samples/${s._id}`)}>
                  <td>
                    {s.sampleCode}
                    {s.submittedByCustomer && <span className={styles.pill + " " + styles.pillBlue} style={{ marginLeft: 6 }}>by you</span>}
                  </td>
                  <td>{s.name || "—"}</td>
                  <td>{s.projectName || "—"}</td>
                  <td><StatusPill value={s.status} /></td>
                  <td>{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}</td>
                  <td>{s.customerActionRequired && <span className={styles.actionable}>Sign</span>}</td>
                </tr>
              )) : (
                <tr><td colSpan="6"><div className={styles.empty}>No samples yet.</div></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
