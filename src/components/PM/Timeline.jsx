import React, { useMemo } from "react";
import styles from "./pm.module.css";
import { STATUS_COLORS, fmtDateLong } from "./pmApi";
import { AvatarStack } from "./Avatar";
import { PriorityBadge } from "./Badges";

// Vertical timeline grouped by month. Lighter weight than the
// Gantt - good for a quick "what's coming up?" read, especially
// on narrow screens where the Gantt overflows.
export default function Timeline({ tasks, onOpenTask }) {
  const groups = useMemo(() => {
    const sorted = tasks
      .filter((t) => t.startDate || t.dueDate)
      .sort((a, b) => new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate));
    const out = new Map();
    for (const t of sorted) {
      const d = new Date(t.startDate || t.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!out.has(key)) out.set(key, { label, items: [] });
      out.get(key).items.push(t);
    }
    return Array.from(out.values());
  }, [tasks]);

  if (groups.length === 0) {
    return (
      <div className={styles.emptyState}>
        No scheduled tasks yet. Set start or due dates to see the timeline.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: 30 }}>
      <div style={{ position: "absolute", left: 12, top: 6, bottom: 6, width: 2, background: "#e5e7eb", borderRadius: 2 }} />
      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 18 }}>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <span style={{
              position: "absolute",
              left: -23,
              top: 6,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#4570B6",
              border: "2px solid white",
              boxShadow: "0 0 0 2px #4570B6",
            }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{g.label}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.items.map((t) => {
              const color = STATUS_COLORS[t.status] || "#4570B6";
              return (
                <div
                  key={t._id}
                  onClick={() => onOpenTask?.(t)}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderLeft: `4px solid ${color}`,
                    borderRadius: 10,
                    padding: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {fmtDateLong(t.startDate)} → {fmtDateLong(t.dueDate)}
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <AvatarStack users={t.assignees || []} max={3} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
