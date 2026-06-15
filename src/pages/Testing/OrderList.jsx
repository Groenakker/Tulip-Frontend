import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function TestOrderList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/test-orders`, { credentials: "include" });
        if (!res.ok) throw new Error((await res.json())?.message || "Failed");
        setRows(await res.json());
      } catch (err) {
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <Header title="Test Orders" />
      <WhiteIsland className="WhiteIsland">
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Test Orders</h2>
            <button className="addButton" style={{ display: "flex", alignItems: "center", gap: 6, background: "#456fb6", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer" }} onClick={() => navigate("/Testing/Orders/add")}>
              <FaPlus /> New order
            </button>
          </div>

          {error && <div style={{ color: "#b91c1c" }}>{error}</div>}

          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={th}>Order</th>
                <th style={th}>Vendor</th>
                <th style={th}>Customer</th>
                <th style={th}>Project</th>
                <th style={th}>Status</th>
                <th style={th}>Sent</th>
                <th style={th}>Lines</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={td}>Loading…</td></tr>
              ) : rows.length ? (
                rows.map((o) => (
                  <tr key={o._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/Testing/Orders/${o._id}`)}>
                    <td style={td}><Link to={`/Testing/Orders/${o._id}`}>{o.orderCode}</Link></td>
                    <td style={td}>{o.vendorBpName || "—"}</td>
                    <td style={td}>{o.customerBpName || "—"}</td>
                    <td style={td}>{o.projectName || "—"}</td>
                    <td style={td}><StatusPill value={o.status} /></td>
                    <td style={td}>{o.sentAt ? new Date(o.sentAt).toLocaleDateString() : "—"}</td>
                    <td style={td}>{o.lines?.length || 0}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" style={{ ...td, textAlign: "center", color: "#6b7280", padding: 30 }}>No test orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </WhiteIsland>
    </>
  );
}

const th = { textAlign: "left", padding: "12px 14px", fontSize: 12, color: "#4b5563", textTransform: "uppercase", letterSpacing: 0.3, borderBottom: "1px solid #e5e7eb" };
const td = { padding: "12px 14px", fontSize: 14, borderBottom: "1px solid #e5e7eb" };

function StatusPill({ value }) {
  const palette = {
    Draft: ["#f3f4f6", "#374151"],
    Sent: ["#dbeafe", "#1e40af"],
    "In Progress": ["#fef3c7", "#92400e"],
    Completed: ["#dcfce7", "#166534"],
    Cancelled: ["#fee2e2", "#991b1b"],
  };
  const [bg, color] = palette[value] || palette.Draft;
  return <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{value}</span>;
}
