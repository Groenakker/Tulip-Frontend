import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styles from "./portal.module.css";
import fullLogo from "../LoginPage/CompanyLogoFull.png";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Invite-accept page for both portals. The `kind` prop decides
// which set of auth endpoints we hit; mounted twice in App.jsx
// (once at /portal/invite-signup, once at /vendor/invite-signup).
// The visual is the same two-column wrapper used by the internal
// /signup page so the experience is consistent across audiences.

export default function PortalInviteSignup({ kind }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const headline =
    kind === "customer" ? "Customer Portal sign-up" : "Vendor Portal sign-up";

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/portal/auth/${kind}/invite/validate?token=${encodeURIComponent(token)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!active) return;
        if (!res.ok) setError(data?.message || "Invalid invitation");
        else {
          setInvite(data);
          setName(data.name || "");
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load invitation");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [kind, token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portal/auth/${kind}/invite/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.message || "Failed to accept invitation");
      else {
        const dashboard = kind === "customer" ? "/portal/dashboard" : "/vendor/dashboard";
        navigate(dashboard, { replace: true });
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.loginShell}>
      <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>{headline}</h1>
          <p className={styles.loginSub}>Finish setting up your account to get started.</p>

          {loading && (
            <p style={{ textAlign: "center", color: "#6b7280" }}>Validating invitation…</p>
          )}

          {!loading && !invite && error && (
            <div className={styles.formError}>{error}</div>
          )}

          {invite && (
            <form onSubmit={onSubmit}>
              {error && <div className={styles.formError}>{error}</div>}

              <div className={styles.formField}>
                <label>Email</label>
                <input value={invite.email} readOnly />
              </div>

              {invite.bPartnerName && (
                <div className={styles.formField}>
                  <label>Linked partner</label>
                  <input
                    value={`${invite.bPartnerName}${invite.bPartnerCode ? " · " + invite.bPartnerCode : ""}`}
                    readOnly
                  />
                </div>
              )}

              <div className={styles.formField}>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  minLength={8}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className={styles.formField}>
                <label htmlFor="confirm">Confirm password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  minLength={8}
                  required
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter your password"
                />
              </div>

              <button
                type="submit"
                className={styles.btnPrimary}
                style={{ width: "100%" }}
                disabled={submitting}
              >
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>
        <div className={styles.loginImageWrap}>
          <img src={fullLogo} alt="Company logo" />
        </div>
      </div>
    </div>
  );
}
