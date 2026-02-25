import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./StakeholderApproval.module.css";
import { FaEnvelope, FaShieldAlt } from "react-icons/fa";
import toast from "../../components/Toaster/toast";

export default function OTPVerification() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [stakeholderEmail, setStakeholderEmail] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    // Verify token and get stakeholder info
    fetchStakeholderInfo();
  }, [token]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const fetchStakeholderInfo = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/stakeholder-approval/verify-token/${token}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        toast.error("Invalid or expired link");
        navigate("/");
        return;
      }

      const data = await response.json();
      setStakeholderEmail(data.email);
      
      // Check if user is already registered
      if (data.isRegistered) {
        // Skip OTP verification for registered users
        navigate(`/approval/${token}`);
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching stakeholder info:", error);
      toast.error("Failed to verify link");
      navigate("/");
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus last filled input or next empty one
    const nextEmptyIndex = newOtp.findIndex((digit) => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    const input = document.getElementById(`otp-${focusIndex}`);
    if (input) input.focus();
  };

  const handleVerify = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      toast.warning("Please enter the complete OTP");
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/stakeholder-approval/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token, otp: otpCode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Invalid OTP");
        setVerifying(false);
        return;
      }

      toast.success("OTP verified successfully");
      // Navigate to the approval page
      navigate(`/approval/${token}`);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Failed to verify OTP");
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/stakeholder-approval/resend-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        }
      );

      if (!response.ok) {
        toast.error("Failed to resend OTP");
        return;
      }

      toast.success("OTP sent successfully");
      setOtp(["", "", "", "", "", ""]);
      setCanResend(false);
      setCountdown(60);
      document.getElementById("otp-0")?.focus();
    } catch (error) {
      console.error("Error resending OTP:", error);
      toast.error("Failed to resend OTP");
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Verifying your access...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content} style={{ maxWidth: "500px", margin: "0 auto" }}>
        <div className={styles.card}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px auto",
              }}
            >
              <FaShieldAlt size={40} color="white" />
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
              Verify Your Email
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
              We've sent a 6-digit code to
            </p>
            <p style={{ color: "#111827", fontWeight: "600", fontSize: "1rem", marginTop: "4px" }}>
              {stakeholderEmail}
            </p>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              Enter OTP Code
            </label>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  style={{
                    width: "50px",
                    height: "60px",
                    textAlign: "center",
                    fontSize: "1.5rem",
                    fontWeight: "600",
                    border: "2px solid #d1d5db",
                    borderRadius: "8px",
                    outline: "none",
                    transition: "all 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#3b82f6";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "none";
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying || otp.some((digit) => !digit)}
            style={{
              width: "100%",
              padding: "12px",
              background: verifying || otp.some((digit) => !digit) ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: verifying || otp.some((digit) => !digit) ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              marginBottom: "16px",
            }}
          >
            {verifying ? "Verifying..." : "Verify & Continue"}
          </button>

          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOtp}
              disabled={!canResend}
              style={{
                background: "none",
                border: "none",
                color: canResend ? "#3b82f6" : "#9ca3af",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: canResend ? "pointer" : "not-allowed",
                textDecoration: "underline",
              }}
            >
              {canResend ? "Resend OTP" : `Resend in ${countdown}s`}
            </button>
          </div>

          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "#f0f9ff",
              borderRadius: "8px",
              border: "1px solid #bae6fd",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <FaEnvelope color="#0284c7" size={20} />
              <div>
                <p style={{ fontSize: "0.875rem", color: "#0c4a6e", fontWeight: "600", marginBottom: "4px" }}>
                  Check your email
                </p>
                <p style={{ fontSize: "0.8rem", color: "#075985", lineHeight: "1.4" }}>
                  The OTP code may take a few minutes to arrive. Please check your spam folder if you don't see it in
                  your inbox.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
