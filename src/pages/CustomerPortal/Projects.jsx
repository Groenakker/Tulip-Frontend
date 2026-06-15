import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./portal.module.css";
import { StatusPill } from "./Dashboard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function CustomerProjects() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/customer/projects`, { credentials: "include" });
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
      <h1 className={styles.pageTitle}>Projects</h1>
      <p className={styles.pageSub}>Every project we're running for you.</p>
      <div className={styles.panel}>
        {loading && <p>Loading…</p>}
        {error && <div className={styles.formError}>{error}</div>}
        {!loading && !error && (
          <table className={styles.table}>
            <thead>
              <tr><th>Project</th><th>Name</th><th>Status</th><th>Samples</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((p) => (
                <tr key={p._id} className={styles.rowClickable} onClick={() => navigate(`/portal/projects/${p._id}`)}>
                  <td><Link to={`/portal/projects/${p._id}`}>{p.projectID}</Link></td>
                  <td>{p.name}</td>
                  <td><StatusPill value={p.status} /></td>
                  <td>{p.sampleCount}</td>
                  <td>{p.actionRequired && <span className={styles.actionable}>Action required</span>}</td>
                </tr>
              )) : (
                <tr><td colSpan="5"><div className={styles.empty}>No projects yet.</div></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
