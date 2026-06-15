import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../CustomerPortal/portal.module.css";
import { StatusPill } from "../CustomerPortal/Dashboard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function VendorOrders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/portal/vendor/orders`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
        setRows(await res.json());
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <h1 className={styles.pageTitle}>Orders</h1>
      <p className={styles.pageSub}>Test orders the lab has assigned to you.</p>
      <div className={styles.panel}>
        {loading && <p>Loading…</p>}
        {error && <div className={styles.formError}>{error}</div>}
        {!loading && !error && (
          <table className={styles.table}>
            <thead><tr><th>Order</th><th>Customer</th><th>Project</th><th>Status</th><th>Sent</th><th>Lines</th><th>Pending</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((o) => (
                <tr key={o._id} className={styles.rowClickable} onClick={() => navigate(`/vendor/orders/${o._id}`)}>
                  <td><Link to={`/vendor/orders/${o._id}`}>{o.orderCode}</Link></td>
                  <td>{o.customerBpName || "—"}</td>
                  <td>{o.projectName || "—"}</td>
                  <td><StatusPill value={o.status} /></td>
                  <td>{o.sentAt ? new Date(o.sentAt).toLocaleDateString() : "—"}</td>
                  <td>{o.lineCount}</td>
                  <td>{o.pendingLines > 0 ? <span className={styles.actionable}>{o.pendingLines} open</span> : "—"}</td>
                </tr>
              )) : (
                <tr><td colSpan="7"><div className={styles.empty}>No orders yet.</div></td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
