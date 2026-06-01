import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { FaSearch } from "react-icons/fa";
import { FaDatabase, FaDiagramProject } from "react-icons/fa6";
import { IoLibrary } from "react-icons/io5";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import { tox } from "../../../lib/toxApi";
import toast from "../../../components/Toaster/toast";
import styles from "./ToxDashboard.module.css";

/**
 * Toxicology Dashboard.
 *
 * Aggregates a handful of /api/tox/v1/* endpoints into a single
 * landing page. Each widget calls one endpoint in parallel and
 * surfaces three KPIs + an activity chart driven by `recharts`.
 *
 * The card fade/slide uses `framer-motion` to keep visual parity
 * with the original toxintelligence-mern dashboard while staying
 * inside Tulip's CSS / plain-component conventions.
 */
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: "easeOut" },
  }),
};

export default function ToxDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    library: 0,
    families: 0,
    projects: 0,
    sources: 0,
  });
  const [recent, setRecent] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [lib, families, projects, sources] = await Promise.all([
          tox.get("/library/", { page: 1, page_size: 50 }),
          tox.get("/compound-families/", { page: 1, page_size: 1 }),
          tox.get("/tra-projects", { page: 1, page_size: 50 }),
          tox.get("/sources/reference-registry"),
        ]);
        if (cancelled) return;
        setStats({
          library: lib?.total ?? 0,
          families: families?.total ?? 0,
          projects: projects?.total ?? 0,
          sources: sources?.total_sources ?? 0,
        });
        const recentProjects = (projects?.items || []).slice(0, 5);
        setRecent(recentProjects);
        setChartData(buildActivityChart(lib?.items || [], projects?.items || []));
      } catch (err) {
        toast.error(err?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const kpis = [
    {
      label: "Library compounds",
      value: stats.library,
      icon: <IoLibrary />,
      onClick: () => navigate("/Toxicology/Library"),
    },
    {
      label: "TRA projects",
      value: stats.projects,
      icon: <FaDiagramProject />,
      onClick: () => navigate("/Toxicology/TRA"),
    },
    {
      label: "Compound families",
      value: stats.families,
      icon: <FaSearch />,
      onClick: () => navigate("/Toxicology/Families"),
    },
    {
      label: "Reference sources",
      value: stats.sources,
      icon: <FaDatabase />,
      onClick: null,
    },
  ];

  return (
    <>
      <Header title="Toxicology Dashboard" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.kpiGrid}>
          {kpis.map((kpi, idx) => (
            <motion.button
              key={kpi.label}
              type="button"
              className={styles.kpiCard}
              onClick={kpi.onClick}
              disabled={!kpi.onClick}
              custom={idx}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <span className={styles.kpiIcon}>{kpi.icon}</span>
              <div className={styles.kpiBody}>
                <div className={styles.kpiValue}>{loading ? "…" : kpi.value}</div>
                <div className={styles.kpiLabel}>{kpi.label}</div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className={styles.bottomGrid}>
          <motion.section
            className={styles.card}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            custom={4}
          >
            <h3>Activity over the last 30 days</h3>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="library" name="Library" fill="rgb(69 112 182)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projects" name="Projects" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          <motion.section
            className={styles.card}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            custom={5}
          >
            <h3>Recent TRA projects</h3>
            {loading ? (
              <p className={styles.muted}>Loading...</p>
            ) : recent.length === 0 ? (
              <p className={styles.muted}>No projects yet.</p>
            ) : (
              <ul className={styles.list}>
                {recent.map((p) => (
                  <li key={p.id} onClick={() => navigate(`/Toxicology/TRA/${p.id}`)}>
                    <strong>{p.name}</strong>
                    <span className={styles.muted}>
                      {p.project_code} • {p.compound_count ?? 0} compounds
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>
      </WhiteIsland>
    </>
  );
}

/**
 * Build a 30-bucket date series from raw library + project records.
 * Each record's `research_date` / `created_date` is bucketed by day
 * relative to today; missing buckets get zeros so the bar chart
 * lays out evenly.
 */
function buildActivityChart(libraryItems, projectItems) {
  const days = 30;
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      stamp: d.getTime(),
      library: 0,
      projects: 0,
    });
  }
  const buckets = new Map(out.map((b) => [b.stamp, b]));
  const startStamp = out[0].stamp;
  for (const c of libraryItems) {
    const ts = Date.parse(c.research_date || c.created_at || "");
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < startStamp) continue;
    const b = buckets.get(d.getTime());
    if (b) b.library += 1;
  }
  for (const p of projectItems) {
    const ts = Date.parse(p.created_date || p.created_at || "");
    if (!Number.isFinite(ts)) continue;
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() < startStamp) continue;
    const b = buckets.get(d.getTime());
    if (b) b.projects += 1;
  }
  return out;
}
