import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import styles from "./portal.module.css";
import fullLogo from "../LoginPage/CompanyLogoFull.png";

// Customer Portal login screen. Mirrors the layout of the internal
// /login page (two-column wrapper with the company logo on the
// right) so an external user feels they're inside the same product
// family. Theme tokens come from `portal.module.css`.

export default function CustomerLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useCustomerAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/portal/dashboard", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const onChange = (e) => {
    const { id, value } = e.target;
    setFormData((p) => ({ ...p, [id]: value }));
    if (error) setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await login(formData.email, formData.password);
    if (result.success) navigate("/portal/dashboard", { replace: true });
    else {
      setError(result.message || "Login failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.loginShell}>
      <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Welcome Back</h1>
          <p className={styles.loginSub}>
            Sign in to view your projects, samples and reports.
          </p>
          <form onSubmit={onSubmit}>
            {error && <div className={styles.formError}>{error}</div>}
            <div className={styles.formField}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Example@email.com"
                value={formData.email}
                onChange={onChange}
                required
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={onChange}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className={styles.btnPrimary} style={{ width: "100%" }} disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p style={{ color: "#666", fontSize: 13, marginTop: 24, textAlign: "center" }}>
            Need access? Your account manager will email you an invitation.
          </p>
        </div>
        <div className={styles.loginImageWrap}>
          <img src={fullLogo} alt="Company logo" />
        </div>
      </div>
    </div>
  );
}
