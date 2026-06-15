import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaClipboardList, FaCheckCircle, FaFlask, FaFileAlt } from "react-icons/fa";
import styles from "../CustomerPortal/portal.module.css";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function VendorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/vendor/dashboard/summary`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSub}>All your active orders at a glance.</p>
      {loading && <p>Loading…</p>}
      {error && <div className={styles.formError}>{error}</div>}
      {data && (
        <div className={styles.cardGrid}>
          <DCard icon={<FaClipboardList />} label="Open orders" value={data.openOrders} to="/vendor/orders" />
          <DCard icon={<FaFlask />} label="In progress" value={data.inProgress} />
          <DCard icon={<FaFileAlt />} label="Awaiting reports" value={data.awaitingReports} actionable />
          <DCard icon={<FaCheckCircle />} label="Completed" value={data.completed} />
        </div>
      )}
    </>
  );
}

function DCard({ icon, label, value, to, actionable }) {
  const W = to ? Link : "div";
  return (
    <W to={to} style={{ textDecoration: "none", color: "inherit" }}>
      <div className={`${styles.card} ${actionable && value > 0 ? styles.cardActionable : ""}`}>
        <div className={styles.cardLabel}>{icon} {label}</div>
        <div className={styles.cardValue}>{value}</div>
      </div>
    </W>
  );
}
