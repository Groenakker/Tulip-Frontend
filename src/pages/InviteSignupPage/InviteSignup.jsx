import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./InviteSignup.module.css";

const API_BASE_URL = "http://localhost:5174/api";

const initialFormState = {
  name: "",
  password: "",
  confirmPassword: "",
};

function InviteSignup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { completeInviteSignup } = useAuth();

  const [inviteInfo, setInviteInfo] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setFatalError("Invalid invitation link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setFatalError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/invite/validate?token=${encodeURIComponent(
            token
          )}`,
          {
            credentials: "include",
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Unable to validate invitation.");
        }

        setInviteInfo(data);
        setFormError("");
      } catch (err) {
        setFatalError(err.message || "Unable to validate invitation.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setFormError("Invitation token is missing.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const result = await completeInviteSignup({
      token,
      name: form.name.trim(),
      password: form.password,
    });

    if (result.success) {
      navigate("/BuisnessPartner");
    } else {
      setFormError(result.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.inviteContainer}>
        <div className={styles.card}>
          <h2>Loading invitation...</h2>
        </div>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className={styles.inviteContainer}>
        <div className={styles.card}>
          <h2>Invitation Issue</h2>
          <p className={styles.errorText}>{fatalError}</p>
          <button
            className={styles.secondaryButton}
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.inviteContainer}>
      <div className={styles.card}>
        <h1>Accept Invitation</h1>
        <p className={styles.subtitle}>
          Complete your profile to join {inviteInfo?.companyName || "the team"}.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleInputChange}
              required
              minLength={8}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleInputChange}
              required
              minLength={8}
            />
          </div>

          {formError && <p className={styles.errorText}>{formError}</p>}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <button
          className={styles.secondaryButton}
          onClick={() => navigate("/login")}
          type="button"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default InviteSignup;

