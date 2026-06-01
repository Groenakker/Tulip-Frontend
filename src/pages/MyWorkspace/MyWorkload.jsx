import React, { useCallback, useEffect, useState } from "react";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";
import styles from "../../components/PM/pm.module.css";
import { pm, isoDay } from "../../components/PM/pmApi";
import WorkloadHeatmap from "../../components/PM/WorkloadHeatmap";
import { useAuth } from "../../context/AuthContext";
import toast from "../../components/Toaster/toast";

// Personal workload page. Shows the user's hours-per-day across
// the next 4 weeks (heatmap), plus a per-day breakdown table
// listing the tasks contributing to each day's load. Also lets
// the user adjust their own daily capacity, which is the same
// number the project-manager assignment guard uses.
const DAYS_FWD = 27;

export default function MyWorkload() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [capacity, setCapacity] = useState(8);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?._id) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const to = new Date(today); to.setDate(to.getDate() + DAYS_FWD);
    try {
      const w = await pm.getWorkload({
        user: user._id,
        from: isoDay(today),
        to: isoDay(to),
      });
      setData(w);
      setCapacity(w.user.dailyCapacityHours || 8);
    } catch (err) {
      toast.error(err.message || "Failed to load workload");
    }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

  const saveCapacity = async () => {
    setSaving(true);
    try {
      await pm.updateCapacity(user._id, capacity);
      toast.success("Capacity updated");
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to update capacity");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <>
        <Header title="My Workload" />
        <WhiteIsland><div className={styles.emptyState}>Loading…</div></WhiteIsland>
      </>
    );
  }

  // Build heatmap row shape.
  const rows = [
    {
      user: { _id: user._id, name: user.name, dailyCapacityHours: capacity, profilePicture: user.profilePicture },
      booked: Object.fromEntries(Object.entries(data.byDay).map(([k, v]) => [k, v.hours])),
    },
  ];

  // Per-day breakdown.
  const sortedDays = Object.keys(data.byDay).sort();
  const totalBooked = sortedDays.reduce((s, k) => s + data.byDay[k].hours, 0);
  const totalCapacity = capacity * sortedDays.filter((k) => {
    const d = new Date(k); return d.getDay() !== 0 && d.getDay() !== 6;
  }).length;

  return (
    <>
      <Header title="My Workload" />
      <WhiteIsland>
        <div className={styles.kpiGrid}>
          <Kpi label="Booked (next 4 weeks)" value={`${totalBooked.toFixed(1)}h`} />
          <Kpi label="Available" value={`${Math.max(0, totalCapacity - totalBooked).toFixed(1)}h`} accent="#16a34a" />
          <Kpi label="Capacity / day" value={`${capacity}h`} />
          <Kpi label="Open tasks" value={data.events.filter((e) => e.status !== "Done").length} />
        </div>

        <div className={styles.toolbarSingle}>
          <strong style={{ fontSize: 14 }}>Daily heatmap</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>My daily capacity</span>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              className={styles.input}
              style={{ width: 90 }}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
            <button className={styles.primaryBtn} onClick={saveCapacity} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className={styles.workloadPanel} style={{ marginTop: 0, padding: 12 }}>
          <WorkloadHeatmap rows={rows} />
        </div>

        <div style={{ marginTop: 18 }}>
          <strong style={{ fontSize: 14 }}>Day-by-day breakdown</strong>
          <table className={styles.dataTable} style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ width: 130 }}>Date</th>
                <th style={{ width: 90 }}>Hours</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {sortedDays.length === 0 && (
                <tr><td colSpan={3} style={{ color: "#6b7280", textAlign: "center" }}>No bookings in this window.</td></tr>
              )}
              {sortedDays.map((k) => {
                const e = data.byDay[k];
                const d = new Date(k);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const over = e.hours > capacity + 0.001;
                return (
                  <tr key={k}>
                    <td style={{ opacity: isWeekend ? 0.55 : 1 }}>
                      {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </td>
                    <td style={{ color: over ? "#dc2626" : "inherit", fontWeight: over ? 700 : 500 }}>
                      {e.hours.toFixed(1)}h
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {e.tasks.map((t) => (
                          <span
                            key={t._id + k}
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              background: "#e9f0fe",
                              color: "#1e3a8a",
                              borderRadius: 6,
                              border: "1px solid #c7d2fe",
                            }}
                            title={`${t.hours}h on this day`}
                          >
                            {t.title} <span style={{ opacity: 0.6 }}>({t.hours}h)</span>
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WhiteIsland>
    </>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}
