import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import styles from "./pm.module.css";
import { pm, STATUS_COLORS, PRIORITY_COLORS } from "./pmApi";

// Aggregate dashboard for a single project. Uses recharts (
// already in package.json) so the bundle stays the same.
//
// Cards on top: total tasks / overdue / hours estimated vs
// logged. Charts below: status pie, priority bar,
// completion-by-assignee bar, simple 30-day burndown line.
export default function Insights({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    pm.getInsights(projectId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className={styles.emptyState}>Loading insights…</div>;
  if (!data) return <div className={styles.emptyState}>No insights available.</div>;

  const pieData = Object.entries(data.byStatus || {}).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(data.byPriority || {}).map(([name, value]) => ({ name, value }));
  const assigneeData = (data.byAssignee || []).map((a) => ({ name: a.name, Done: a.done, Open: a.open }));

  return (
    <div>
      <div className={styles.kpiGrid}>
        <Kpi label="Total tasks" value={data.total} />
        <Kpi label="Overdue" value={data.overdue} accent="#dc2626" />
        <Kpi label="Hours estimated" value={`${data.totalEstimated}h`} />
        <Kpi label="Hours logged" value={`${data.totalActual}h`} hint={data.totalEstimated > 0 ? `${Math.round((data.totalActual / data.totalEstimated) * 100)}% of estimate` : ""} />
      </div>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>By status</div>
          {pieData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={88} label>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={STATUS_COLORS[d.name] || "#4570B6"} />
                  ))}
                </Pie>
                <ReTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>By priority</div>
          {priorityData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <ReTooltip />
                <Bar dataKey="value">
                  {priorityData.map((d) => (
                    <Cell key={d.name} fill={PRIORITY_COLORS[d.name] || "#4570B6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Completion by assignee</div>
          {assigneeData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={assigneeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                <ReTooltip />
                <Legend />
                <Bar dataKey="Done" stackId="a" fill="#16a34a" />
                <Bar dataKey="Open" stackId="a" fill="#4570B6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>Burndown (tasks remaining)</div>
          {(data.burndown || []).length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.burndown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ReTooltip />
                <Line type="monotone" dataKey="remaining" stroke="#4570B6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={accent ? { color: accent } : undefined}>{value}</div>
      {hint && <div className={styles.kpiHint}>{hint}</div>}
    </div>
  );
}

function Empty() {
  return <div className={styles.emptyState} style={{ padding: 16 }}>Not enough data yet.</div>;
}
