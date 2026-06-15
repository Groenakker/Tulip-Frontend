import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import styles from "./portal.module.css";
import { StatusPill } from "./Dashboard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function CustomerProjectDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/customer/projects/${id}`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
        setData(await res.json());
      } catch (err) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Build epic/story/task progress for charts.
  const taskStats = useMemo(() => {
    const tasks = data?.tasks || [];
    const byStatus = tasks.reduce((acc, t) => {
      const k = t.status || "To Do";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byStatus);
  }, [data]);

  if (loading) return <p>Loading…</p>;
  if (error) return <div className={styles.formError}>{error}</div>;
  if (!data) return null;

  const { project, samples, tasks } = data;

  return (
    <>
      <h1 className={styles.pageTitle}>{project.projectID} · {project.name}</h1>
      <p className={styles.pageSub}>{project.description}</p>

      <div className={styles.cardGrid}>
        <Card label="Status" value={<StatusPill value={project.status} />} />
        <Card label="Start date" value={project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"} />
        <Card label="Est. completion" value={project.estDate ? new Date(project.estDate).toLocaleDateString() : "—"} />
        <Card label="Samples" value={samples.length} />
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h2>Task progress</h2></div>
        {taskStats.length ? (
          <table className={styles.table}>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {taskStats.map(([k, v]) => (
                <tr key={k}><td><StatusPill value={k} /></td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
        ) : <div className={styles.empty}>No tasks tracked yet.</div>}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Samples</h2>
          <Link to={`/portal/samples/new?projectId=${project._id}`} className={styles.btnPrimary}>+ New sample</Link>
        </div>
        {samples.length ? (
          <table className={styles.table}>
            <thead><tr><th>Code</th><th>Description</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s._id}>
                  <td><Link to={`/portal/samples/${s._id}`}>{s.sampleCode}</Link></td>
                  <td>{s.name || s.sampleDescription || "—"}</td>
                  <td><StatusPill value={s.status} /></td>
                  <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                  <td>{s.customerActionRequired && <span className={styles.actionable}>Action required</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className={styles.empty}>No samples for this project.</div>}
      </div>
    </>
  );
}

function Card({ label, value }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.cardValue} style={{ fontSize: 20 }}>{value}</div>
    </div>
  );
}
