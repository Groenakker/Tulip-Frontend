import React, { useMemo } from "react";
import styles from "./pm.module.css";
import Avatar from "./Avatar";
import { isoDay } from "./pmApi";

// Per-day, per-person workload heatmap. Each row is a user;
// each cell is one calendar day. Background opacity scales with
// (booked / capacity); cells that exceed capacity are flagged
// red so the manager can spot overload at a glance before
// assigning anything new.
const DAYS_BACK = 0;
const DAYS_FWD = 27;

export default function WorkloadHeatmap({ rows = [], from, to }) {
  // Build the day axis once.
  const days = useMemo(() => {
    const start = from ? new Date(from) : new Date();
    const end = to ? new Date(to) : new Date(start.getTime() + DAYS_FWD * 86400000);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const out = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(new Date(d));
    }
    return out;
  }, [from, to]);

  if (rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        No team members to show. Add people to the project first.
      </div>
    );
  }

  return (
    <div className={styles.heatmapWrap}>
      <div style={{ minWidth: "max-content" }}>
      {/* Day axis */}
      <div className={styles.heatmapRow} style={{ marginBottom: 4 }}>
        <div className={styles.heatmapName}>&nbsp;</div>
        {days.map((d, i) => {
          const isMonday = d.getDay() === 1;
          return (
            <div
              key={i}
              style={{
                width: 28,
                textAlign: "center",
                fontSize: 9,
                color: "#6b7280",
                fontWeight: isMonday ? 700 : 500,
              }}
            >
              {isMonday || i === 0 ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : d.getDate()}
            </div>
          );
        })}
      </div>

      <div className={styles.heatmap}>
        {rows.map((r) => (
          <div key={r.user._id} className={styles.heatmapRow}>
            <div className={styles.heatmapName}>
              <Avatar size="sm" user={r.user} />
              <span>{r.user.name}</span>
            </div>
            {days.map((d, i) => {
              const k = isoDay(d);
              const hours = r.booked?.[k] || 0;
              const cap = r.user.dailyCapacityHours || r.user.capacity || 8;
              const ratio = cap > 0 ? hours / cap : 0;
              const over = hours > cap + 0.001;
              const bg = over
                ? "#dc2626"
                : ratio === 0
                ? "#f3f4f6"
                : `rgba(69, 112, 182, ${0.15 + 0.7 * Math.min(1, ratio)})`;
              const fg = ratio > 0.55 || over ? "white" : "#374151";
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  className={styles.heatmapCell}
                  style={{
                    background: isWeekend && hours === 0 ? "#fafafa" : bg,
                    color: fg,
                    opacity: isWeekend && hours === 0 ? 0.4 : 1,
                  }}
                  title={`${r.user.name} - ${d.toDateString()}: ${hours.toFixed(1)}h / ${cap}h`}
                >
                  {hours > 0 ? hours.toFixed(hours >= 10 ? 0 : 1) : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      </div>
      {/* Legend */}
      <div className={styles.heatmapLegend}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className={styles.heatmapCell} style={{ width: 14, height: 14, background: "#f3f4f6" }} /> Free
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className={styles.heatmapCell} style={{ width: 14, height: 14, background: "rgba(69,112,182,0.55)" }} /> Booked
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className={styles.heatmapCell} style={{ width: 14, height: 14, background: "#dc2626" }} /> Over capacity
        </span>
      </div>
    </div>
  );
}
