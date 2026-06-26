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

  // Build an Epic -> Story hierarchy for the customer-facing progress
  // panel. The lab tracks three levels (Epic / Story / Task) on the
  // internal Kanban + Hierarchy views, but customers only need the top
  // two: Epics are the project phases / milestones the lab agreed to
  // deliver, Stories are the individual deliverables inside each phase.
  // Leaf "task" rows are internal execution detail and intentionally
  // hidden here so the customer isn't drowned in operational noise.
  const progress = useMemo(() => {
    const items = data?.tasks || [];
    const epics = items.filter((t) => t.workItemType === "epic");
    const storiesByEpic = items
      .filter((t) => t.workItemType === "story")
      .reduce((acc, s) => {
        const key = s.parent ? String(s.parent) : "__orphan__";
        (acc[key] = acc[key] || []).push(s);
        return acc;
      }, {});

    const epicRows = epics.map((e) => {
      const stories = storiesByEpic[String(e._id)] || [];
      const done = stories.filter((s) => s.status === "Done").length;
      const pct = stories.length ? Math.round((done / stories.length) * 100) : null;
      return { ...e, stories, doneStories: done, progressPct: pct };
    });

    const orphanStories = storiesByEpic.__orphan__ || [];
    const allStories = [
      ...epicRows.flatMap((e) => e.stories),
      ...orphanStories,
    ];
    const totalStories = allStories.length;
    const doneStoriesTotal = allStories.filter((s) => s.status === "Done").length;
    const overallPct = totalStories
      ? Math.round((doneStoriesTotal / totalStories) * 100)
      : null;

    return {
      epics: epicRows,
      orphanStories,
      totalStories,
      doneStories: doneStoriesTotal,
      overallPct,
      hasAnything: epicRows.length > 0 || orphanStories.length > 0,
    };
  }, [data]);

  if (loading) return <p>Loading…</p>;
  if (error) return <div className={styles.formError}>{error}</div>;
  if (!data) return null;

  const { project, samples } = data;

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
        <div className={styles.panelHead}>
          <h2>Project progress</h2>
          {progress.totalStories > 0 && (
            <span className={styles.cardSub}>
              {progress.doneStories} of {progress.totalStories} deliverables complete
              {progress.overallPct !== null ? ` (${progress.overallPct}%)` : ""}
            </span>
          )}
        </div>

        {progress.overallPct !== null && (
          <div className={styles.progressBar} aria-hidden="true">
            <div
              className={styles.progressFill}
              style={{ width: `${progress.overallPct}%` }}
            />
          </div>
        )}

        {!progress.hasAnything ? (
          <div className={styles.empty}>No milestones to display yet.</div>
        ) : (
          <ul className={styles.phaseList}>
            {progress.epics.map((e) => (
              <li key={e._id} className={styles.phaseItem}>
                <div className={styles.phaseHead}>
                  <div className={styles.phaseTitleWrap}>
                    <span className={styles.phaseBadge}>Phase</span>
                    <span className={styles.phaseTitle}>{e.title}</span>
                  </div>
                  <div className={styles.phaseMeta}>
                    {e.stories.length > 0 && (
                      <span className={styles.phaseCount}>
                        {e.doneStories}/{e.stories.length}
                      </span>
                    )}
                    <StatusPill value={e.status} />
                  </div>
                </div>

                {e.progressPct !== null && (
                  <div className={styles.progressBarThin} aria-hidden="true">
                    <div
                      className={styles.progressFill}
                      style={{ width: `${e.progressPct}%` }}
                    />
                  </div>
                )}

                {e.stories.length > 0 ? (
                  <ul className={styles.storyList}>
                    {e.stories.map((s) => (
                      <li key={s._id} className={styles.storyItem}>
                        <span className={styles.storyTitle}>{s.title}</span>
                        <div className={styles.storyMeta}>
                          {s.dueDate && (
                            <span className={styles.storyDue}>
                              Due {new Date(s.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <StatusPill value={s.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.storyEmpty}>
                    No deliverables defined for this phase yet.
                  </div>
                )}
              </li>
            ))}

            {progress.orphanStories.length > 0 && (
              <li className={styles.phaseItem}>
                <div className={styles.phaseHead}>
                  <div className={styles.phaseTitleWrap}>
                    <span className={`${styles.phaseBadge} ${styles.phaseBadgeNeutral}`}>
                      Other
                    </span>
                    <span className={styles.phaseTitle}>Additional deliverables</span>
                  </div>
                </div>
                <ul className={styles.storyList}>
                  {progress.orphanStories.map((s) => (
                    <li key={s._id} className={styles.storyItem}>
                      <span className={styles.storyTitle}>{s.title}</span>
                      <div className={styles.storyMeta}>
                        {s.dueDate && (
                          <span className={styles.storyDue}>
                            Due {new Date(s.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <StatusPill value={s.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        )}
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
