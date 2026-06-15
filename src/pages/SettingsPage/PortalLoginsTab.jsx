import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaTrash, FaUndo, FaKey, FaToggleOn, FaToggleOff } from "react-icons/fa";
import Modal from "../../components/Modal";
import styles from "./Settings.module.css";

// Reusable Settings tab body for the "Customer Logins" and "Vendor
// Logins" admin views. The two are mechanically identical — they
// just hit a different /api/portal/auth/admin/<userType>/users
// endpoint — so a single component handles both via the `userType`
// prop instead of duplicating the JSX.
//
// Expects the parent to pass the API base URL string. We deliberately
// keep all networking inside this file so Settings.jsx doesn't grow.

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

export default function PortalLoginsTab({ userType }) {
  const labelPlural = userType === "customer" ? "Customer Logins" : "Vendor Logins";
  const labelSingular = userType === "customer" ? "Customer" : "Vendor";

  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [partners, setPartners] = useState([]);
  const [partnersLoading, setPartnersLoading] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ bPartnerID: "", email: "", name: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [resetting, setResetting] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [resetError, setResetError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson(`${API_BASE_URL}/portal/auth/admin/${userType}/users`);
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setPending(Array.isArray(data?.pendingInvites) ? data.pendingInvites : []);
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    setPartnersLoading(true);
    try {
      // Fetch every BP — we filter client-side by category so the
      // dropdown only shows partners that match the userType.
      const data = await fetchJson(`${API_BASE_URL}/bpartners`);
      const rows = Array.isArray(data) ? data : data?.data || [];
      const want = userType === "customer"
        ? ["Client", "Client & Vendor"]
        : ["Vendor", "Client & Vendor"];
      setPartners(rows.filter((p) => want.includes(p.category)));
    } catch {
      setPartners([]);
    } finally {
      setPartnersLoading(false);
    }
  };

  useEffect(() => { reload(); }, [userType]);

  const openInvite = async () => {
    setInviteForm({ bPartnerID: "", email: "", name: "" });
    setInviteError("");
    setShowInvite(true);
    if (!partners.length) await loadPartners();
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError("");
    try {
      await fetchJson(`${API_BASE_URL}/portal/auth/admin/invite`, {
        method: "POST",
        body: JSON.stringify({ ...inviteForm, userType }),
      });
      setShowInvite(false);
      await reload();
    } catch (err) {
      setInviteError(err.message || "Failed to send invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const toggleStatus = async (u) => {
    const next = u.status === "Active" ? "Inactive" : "Active";
    try {
      await fetchJson(`${API_BASE_URL}/portal/auth/admin/${userType}/users/${u._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await reload();
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (!resetting) return;
    setResetError("");
    try {
      await fetchJson(`${API_BASE_URL}/portal/auth/admin/${userType}/users/${resetting._id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: newPwd }),
      });
      setResetting(null);
      setNewPwd("");
      alert("Password reset successfully.");
    } catch (err) {
      setResetError(err.message || "Failed to reset password");
    }
  };

  const resendInvite = async (inv) => {
    try {
      await fetchJson(`${API_BASE_URL}/portal/auth/admin/invites/${inv._id}/resend`, { method: "POST" });
      alert("Invite resent.");
      await reload();
    } catch (err) {
      alert(err.message || "Failed to resend invite");
    }
  };

  const revokeInvite = async (inv) => {
    if (!window.confirm("Revoke this invitation?")) return;
    try {
      await fetchJson(`${API_BASE_URL}/portal/auth/admin/invites/${inv._id}/revoke`, { method: "POST" });
      await reload();
    } catch (err) {
      alert(err.message || "Failed to revoke invite");
    }
  };

  const rows = useMemo(() => users, [users]);

  return (
    <>
      <div className={styles.searchBar}>
        <h3 style={{ margin: 0 }}>{labelPlural}</h3>
        <button className={styles.addUserButton} onClick={openInvite}>
          <FaPlus /> Invite {labelSingular}
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", padding: "8px 0" }}>{error}</div>}

      <table className={styles.usersTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Business Partner</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6">Loading…</td></tr>
          ) : rows.length ? (
            rows.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  {u.bPartnerName || "—"}
                  {u.bPartnerCode ? <span style={{ color: "#6b7280" }}> · {u.bPartnerCode}</span> : null}
                </td>
                <td>
                  <span className={`${styles.roleBadge} ${u.status === "Active" ? styles.admin : ""}`}>
                    {u.status}
                  </span>
                </td>
                <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "—"}</td>
                <td>
                  <button
                    className={styles.editButton}
                    title={u.status === "Active" ? "Deactivate" : "Activate"}
                    onClick={() => toggleStatus(u)}
                  >
                    {u.status === "Active" ? <FaToggleOn /> : <FaToggleOff />}
                    {u.status === "Active" ? "Disable" : "Enable"}
                  </button>
                  <button
                    className={styles.editButton}
                    title="Reset password"
                    onClick={() => { setResetting(u); setNewPwd(""); setResetError(""); }}
                    style={{ marginLeft: 8 }}
                  >
                    <FaKey /> Reset
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="6">No {labelSingular.toLowerCase()} accounts yet.</td></tr>
          )}
        </tbody>
      </table>

      {pending.length > 0 && (
        <>
          <h4 style={{ marginTop: 24 }}>Pending invitations</h4>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Business Partner</th>
                <th>Sent</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((inv) => (
                <tr key={inv._id}>
                  <td>{inv.email}</td>
                  <td>{inv.bPartnerName}{inv.bPartnerCode ? ` · ${inv.bPartnerCode}` : ""}</td>
                  <td>{new Date(inv.createdAt).toLocaleString()}</td>
                  <td>{new Date(inv.expiresAt).toLocaleString()}</td>
                  <td>
                    <button className={styles.editButton} onClick={() => resendInvite(inv)}>
                      <FaUndo /> Resend
                    </button>
                    <button
                      className={styles.editButton}
                      onClick={() => revokeInvite(inv)}
                      style={{ marginLeft: 8 }}
                    >
                      <FaTrash /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showInvite && (
        <Modal onClose={() => setShowInvite(false)}>
          <div className={styles.inviteModalContent} style={{ minWidth: 380, maxWidth: 480 }}>
            <h3>Invite {labelSingular}</h3>
            <p className={styles.inviteModalDescription}>
              We'll email a secure invite link so they can set their own password and access the
              {" "}{labelSingular === "Customer" ? "customer" : "vendor"} portal.
            </p>
            <form className={styles.inviteForm} onSubmit={submitInvite}>
              <label className={styles.modalLabel}>Business Partner</label>
              <select
                className={styles.modalSelect}
                required
                disabled={partnersLoading || inviteLoading}
                value={inviteForm.bPartnerID}
                onChange={(e) => {
                  const id = e.target.value;
                  const bp = partners.find((p) => p._id === id);
                  // Auto-fill email + name from the partner record so
                  // admins don't have to retype what's already on the BP.
                  // Prefer the BP's primary email, then the first contact
                  // with an email. Same for name (first contact).
                  const fallbackContact = (bp?.contacts || []).find((c) => c.email);
                  setInviteForm((f) => ({
                    ...f,
                    bPartnerID: id,
                    email: f.email || bp?.email || fallbackContact?.email || "",
                    name: f.name || fallbackContact?.name || "",
                  }));
                }}
              >
                <option value="">{partnersLoading ? "Loading…" : "Select a partner"}</option>
                {partners.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}{p.partnerNumber ? ` · ${p.partnerNumber}` : ""}
                  </option>
                ))}
              </select>

              <label className={styles.modalLabel}>Email</label>
              <input
                className={styles.modalInput}
                type="email"
                required
                disabled={inviteLoading}
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@company.com"
              />

              <label className={styles.modalLabel}>Name (optional)</label>
              <input
                className={styles.modalInput}
                type="text"
                disabled={inviteLoading}
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />

              {inviteError && <p className={styles.modalError}>{inviteError}</p>}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalSecondaryButton}
                  onClick={() => setShowInvite(false)}
                  disabled={inviteLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalPrimaryButton}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? "Sending…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {resetting && (
        <Modal onClose={() => setResetting(null)}>
          <div className={styles.inviteModalContent} style={{ minWidth: 360, maxWidth: 420 }}>
            <h3>Reset password</h3>
            <p className={styles.inviteModalDescription}>
              Set a new password for <strong>{resetting.name}</strong> ({resetting.email}).
            </p>
            <form className={styles.inviteForm} onSubmit={submitReset}>
              <label className={styles.modalLabel}>New password</label>
              <input
                className={styles.modalInput}
                type="password"
                minLength={8}
                required
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 8 characters"
              />
              {resetError && <p className={styles.modalError}>{resetError}</p>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalSecondaryButton}
                  onClick={() => setResetting(null)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.modalPrimaryButton}>
                  Reset password
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
