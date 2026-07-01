import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaPaperPlane, FaBan, FaPlus, FaTrash, FaSave } from "react-icons/fa";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";
import Select from "../../components/Select/Select";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;
const fetchJson = async (url, opts = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { message: text }; }
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`);
  return body;
};

const EMPTY_ORDER = {
  vendorBpId: "",
  customerBpId: "",
  projectId: "",
  notes: "",
  lines: [],
  status: "Draft",
};

export default function TestOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "add";

  const [order, setOrder] = useState(EMPTY_ORDER);
  const [vendors, setVendors] = useState([]);
  const [partners, setPartners] = useState([]);
  const [projects, setProjects] = useState([]);
  const [samples, setSamples] = useState([]);
  const [testCodes, setTestCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [v, bps, projs, codes] = await Promise.all([
          fetchJson(`${API_BASE_URL}/test-orders/catalog/vendors`),
          fetchJson(`${API_BASE_URL}/bpartners`),
          fetchJson(`${API_BASE_URL}/projects`),
          fetchJson(`${API_BASE_URL}/testcodes`),
        ]);
        setVendors(v);
        setPartners((Array.isArray(bps) ? bps : bps.data || []).filter((p) => p.category !== "Vendor"));
        setProjects(Array.isArray(projs) ? projs : projs.data || []);
        setTestCodes(Array.isArray(codes) ? codes : codes.data || []);
        if (!isNew) {
          const data = await fetchJson(`${API_BASE_URL}/test-orders/${id}`);
          setOrder(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  // Refresh sample list whenever the customer / project changes.
  useEffect(() => {
    (async () => {
      if (!order.customerBpId && !order.projectId) {
        setSamples([]);
        return;
      }
      const qs = new URLSearchParams();
      if (order.customerBpId) qs.set("bPartnerID", order.customerBpId);
      if (order.projectId) qs.set("projectId", order.projectId);
      try {
        const data = await fetchJson(`${API_BASE_URL}/test-orders/catalog/samples?${qs}`);
        setSamples(data);
      } catch { /* swallow */ }
    })();
  }, [order.customerBpId, order.projectId]);

  const isLocked = order.status === "Completed" || order.status === "Cancelled";

  const set = (k, v) => setOrder((o) => ({ ...o, [k]: v }));
  const updateLine = (idx, patch) => setOrder((o) => ({
    ...o,
    lines: o.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
  }));
  const addLine = () => setOrder((o) => ({ ...o, lines: [...o.lines, { sampleId: "", testCodeId: "", status: "Pending" }] }));
  const removeLine = (idx) => setOrder((o) => ({ ...o, lines: o.lines.filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        vendorBpId: order.vendorBpId,
        customerBpId: order.customerBpId,
        projectId: order.projectId,
        notes: order.notes,
        lines: order.lines.map((l) => {
          const tc = testCodes.find((t) => String(t._id) === String(l.testCodeId));
          const sp = samples.find((s) => String(s._id) === String(l.sampleId));
          return {
            ...l,
            testCodeRef: tc ? `${tc.code} — ${tc.descriptionShort || ""}` : l.testCodeRef,
            sampleCode: sp?.sampleCode || l.sampleCode,
          };
        }),
      };
      let saved;
      if (isNew) {
        saved = await fetchJson(`${API_BASE_URL}/test-orders`, { method: "POST", body: JSON.stringify(payload) });
        navigate(`/Testing/Orders/${saved._id}`, { replace: true });
      } else {
        saved = await fetchJson(`${API_BASE_URL}/test-orders/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        setOrder(saved);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    if (!window.confirm("Send this order to the vendor? They'll be notified by email.")) return;
    try {
      const data = await fetchJson(`${API_BASE_URL}/test-orders/${id}/send`, { method: "POST" });
      setOrder(data);
    } catch (err) { setError(err.message); }
  };
  const cancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    try {
      const data = await fetchJson(`${API_BASE_URL}/test-orders/${id}/cancel`, { method: "POST" });
      setOrder(data);
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div style={{ padding: 30 }}>Loading…</div>;

  return (
    <>
      <Header title={isNew ? "New Test Order" : `Test Order · ${order.orderCode || ""}`} />
      <WhiteIsland className="WhiteIsland">
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ margin: 0 }}>
              {order.orderCode || "Draft"} {!isNew && <StatusPill value={order.status} />}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              {!isLocked && (
                <button onClick={save} disabled={saving} style={btnPrimary}>
                  <FaSave style={{ marginRight: 6 }} /> {saving ? "Saving…" : "Save"}
                </button>
              )}
              {!isNew && order.status === "Draft" && (
                <button onClick={send} style={btnPrimary}><FaPaperPlane style={{ marginRight: 6 }} /> Send to vendor</button>
              )}
              {!isNew && !["Completed", "Cancelled"].includes(order.status) && (
                <button onClick={cancel} style={btnGhost}><FaBan style={{ marginRight: 6 }} /> Cancel</button>
              )}
            </div>
          </div>

          {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

          <fieldset disabled={isLocked} style={{ border: "none", padding: 0 }}>
            <div style={grid}>
              <Field label="Vendor">
                <Select value={order.vendorBpId || ""} onChange={(e) => set("vendorBpId", e.target.value)} required>
                  <option value="">Select vendor</option>
                  {vendors.map((v) => <option key={v._id} value={v._id}>{v.name} · {v.partnerNumber}</option>)}
                </Select>
              </Field>
              <Field label="Customer">
                <Select value={order.customerBpId || ""} onChange={(e) => set("customerBpId", e.target.value)}>
                  <option value="">Select customer</option>
                  {partners.map((p) => <option key={p._id} value={p._id}>{p.name} · {p.partnerNumber}</option>)}
                </Select>
              </Field>
              <Field label="Project">
                <Select value={order.projectId || ""} onChange={(e) => set("projectId", e.target.value)}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.projectID} · {p.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={2} value={order.notes || ""} onChange={(e) => set("notes", e.target.value)} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 8, padding: 10 }} />
            </Field>
          </fieldset>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
            <h3 style={{ margin: 0 }}>Lines</h3>
            {!isLocked && <button style={btnGhost} onClick={addLine}><FaPlus style={{ marginRight: 6 }} /> Add line</button>}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={th}>Sample</th>
                <th style={th}>Test code</th>
                <th style={th}>Status</th>
                <th style={th}>Result</th>
                <th style={th}>Report</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {order.lines.length === 0 ? (
                <tr><td colSpan="6" style={{ ...td, color: "#6b7280", textAlign: "center", padding: 28 }}>No lines yet. Add a line to start the order.</td></tr>
              ) : order.lines.map((line, idx) => (
                <tr key={idx}>
                  <td style={td}>
                    <Select disabled={isLocked || order.status !== "Draft"} value={line.sampleId || ""} onChange={(e) => updateLine(idx, { sampleId: e.target.value })}>
                      <option value="">Select sample</option>
                      {samples.map((s) => <option key={s._id} value={s._id}>{s.sampleCode} · {s.name || ""}</option>)}
                    </Select>
                  </td>
                  <td style={td}>
                    <Select disabled={isLocked || order.status !== "Draft"} value={line.testCodeId || ""} onChange={(e) => updateLine(idx, { testCodeId: e.target.value })}>
                      <option value="">Select test</option>
                      {testCodes.map((t) => <option key={t._id} value={t._id}>{t.code} · {t.descriptionShort}</option>)}
                    </Select>
                  </td>
                  <td style={td}><StatusPill value={line.status || "Pending"} /></td>
                  <td style={td}>{line.result || "—"}</td>
                  <td style={td}>
                    {line.reportFile?.fileUrl ? <a href={line.reportFile.fileUrl} target="_blank" rel="noreferrer">{line.reportFile.fileName || "Report"}</a> : "—"}
                  </td>
                  <td style={td}>
                    {!isLocked && order.status === "Draft" && (
                      <button onClick={() => removeLine(idx)} style={{ background: "transparent", border: "none", color: "#b91c1c", cursor: "pointer" }}><FaTrash /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WhiteIsland>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#4b5563", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 6 };
const th = { textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", textTransform: "uppercase", letterSpacing: 0.3 };
const td = { padding: "10px 12px", fontSize: 14, borderBottom: "1px solid #e5e7eb", verticalAlign: "middle" };
const btnPrimary = { background: "#456fb6", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center" };
const btnGhost = { background: "#fff", color: "#456fb6", border: "1px solid #456fb6", padding: "8px 14px", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center" };

function StatusPill({ value }) {
  const palette = {
    Draft: ["#f3f4f6", "#374151"],
    Sent: ["#dbeafe", "#1e40af"],
    "In Progress": ["#fef3c7", "#92400e"],
    Pending: ["#f3f4f6", "#374151"],
    Done: ["#dcfce7", "#166534"],
    Completed: ["#dcfce7", "#166534"],
    Failed: ["#fee2e2", "#991b1b"],
    Cancelled: ["#fee2e2", "#991b1b"],
  };
  const [bg, color] = palette[value] || palette.Draft;
  return <span style={{ background: bg, color, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, marginLeft: 6 }}>{value}</span>;
}
