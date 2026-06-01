import React, { useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styles from "./pm.module.css";
import { STATUS_COLORS, isoDay } from "./pmApi";

// Month calendar. Each task appears as a chip on every day
// between its start and due date (inclusive). Click a chip to
// open the task modal. The "today" cell is highlighted.
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarMonth({ tasks, onOpenTask, initialMonth }) {
  const [cursor, setCursor] = useState(() => {
    const d = initialMonth ? new Date(initialMonth) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Map of dayKey -> tasks that touch that day.
  const byDay = useMemo(() => {
    const m = new Map();
    for (const t of tasks) {
      if (!t.startDate && !t.dueDate) continue;
      const start = t.startDate ? new Date(t.startDate) : new Date(t.dueDate);
      const end = t.dueDate ? new Date(t.dueDate) : new Date(t.startDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = isoDay(d);
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(t);
      }
    }
    return m;
  }, [tasks]);

  const cells = useMemo(() => {
    const first = new Date(cursor);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out = [];
    // Leading days from previous month
    for (let i = 0; i < startWeekday; i++) {
      const d = new Date(cursor);
      d.setDate(d.getDate() - (startWeekday - i));
      out.push({ d, other: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      out.push({ d: new Date(cursor.getFullYear(), cursor.getMonth(), i), other: false });
    }
    // Trailing days to round to a multiple of 7
    while (out.length % 7 !== 0) {
      const last = out[out.length - 1].d;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      out.push({ d, other: true });
    }
    return out;
  }, [cursor]);

  const todayKey = isoDay(new Date());
  const shift = (n) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));

  return (
    <div>
      <div className={styles.calendarHeader}>
        <button className={styles.ghostBtn} onClick={() => shift(-1)}><FaChevronLeft /></button>
        <div className={styles.calendarMonth}>
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={styles.ghostBtn} onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
            Today
          </button>
          <button className={styles.ghostBtn} onClick={() => shift(1)}><FaChevronRight /></button>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        {DOW.map((d) => (
          <div key={d} className={styles.calendarDow}>{d}</div>
        ))}
        {cells.map(({ d, other }, i) => {
          const key = isoDay(d);
          const items = byDay.get(key) || [];
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className={`${styles.calendarCell} ${isToday ? styles.today : ""} ${other ? styles.other : ""}`}
            >
              <div className={styles.calendarDay}>{d.getDate()}</div>
              {items.slice(0, 4).map((t) => {
                const color = STATUS_COLORS[t.status] || "#4570B6";
                return (
                  <div
                    key={t._id + key}
                    className={styles.calendarChip}
                    style={{ borderLeftColor: color, background: `${color}1A`, color }}
                    onClick={() => onOpenTask?.(t)}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                );
              })}
              {items.length > 4 && (
                <div className={styles.calendarChip} style={{ background: "#f3f4f6", color: "#374151", borderLeftColor: "#9ca3af" }}>
                  +{items.length - 4} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
