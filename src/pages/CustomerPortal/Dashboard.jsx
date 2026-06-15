import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaProjectDiagram, FaFlask, FaFileSignature, FaPenNib } from "react-icons/fa";
import styles from "./portal.module.css";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function CustomerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/customer/dashboard/summary`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
        setData(await res.json());
      } catch (err) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSub}>A quick view of everything happening on your projects.</p>

      {loading && <p>Loading…</p>}
      {error && <div className={styles.formError}>{error}</div>}

      {data && (
        <>
          <div className={styles.cardGrid}>
            <DashCard icon={<FaProjectDiagram />} label="Active projects" value={data.projectsActive} to="/portal/projects" />
            <DashCard icon={<FaFlask />} label="Samples in progress" value={data.samplesInProgress} to="/portal/samples" />
            <DashCard icon={<FaPenNib />} label="Samples awaiting your approval" value={data.samplesNeedSig} to="/portal/samples" actionable />
            <DashCard icon={<FaFileSignature />} label="Documents awaiting your approval" value={data.docsNeedApproval} to="/portal/documents" actionable />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}><h2>Recent samples</h2><Link to="/portal/samples">View all →</Link></div>
            {data.recentSamples?.length ? (
              <table className={styles.table}>
                <thead><tr><th>Sample</th><th>Status</th><th>Updated</th><th></th></tr></thead>
                <tbody>
                  {data.recentSamples.map((s) => (
                    <tr key={s._id}>
                      <td><Link to={`/portal/samples/${s._id}`}>{s.sampleCode || s.name}</Link></td>
                      <td><StatusPill value={s.status} /></td>
                      <td>{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}</td>
                      <td>{s.customerActionRequired && <span className={styles.actionable}>Action required</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>No samples yet.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function DashCard({ icon, label, value, to, actionable }) {
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} style={{ textDecoration: "none", color: "inherit" }}>
      <div className={`${styles.card} ${actionable && value > 0 ? styles.cardActionable : ""}`}>
        <div className={styles.cardLabel}>{icon} {label}</div>
        <div className={styles.cardValue}>{value}</div>
      </div>
    </Wrapper>
  );
}

export function StatusPill({ value }) {
  const v = (value || "").toLowerCase();
  let cls = styles.pillGray;
  if (v.includes("submitt") || v.includes("review")) cls = styles.pillBlue;
  else if (v.includes("accept") || v.includes("complete") || v.includes("approv")) cls = styles.pillGreen;
  else if (v.includes("hold") || v.includes("update") || v.includes("draft")) cls = styles.pillAmber;
  else if (v.includes("reject") || v.includes("cancel")) cls = styles.pillRed;
  return <span className={`${styles.pill} ${cls}`}>{value || "—"}</span>;
}
