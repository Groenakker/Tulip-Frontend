import { useState } from "react";
import styles from "./ChangePasswordModal.module.css";
import Modal from "../Modal";
import { FaEye, FaEyeSlash } from "react-icons/fa";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const ChangePasswordModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user makes changes
    if (error) {
      setError(null);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    if (!formData.currentPassword.trim()) {
      setError("Current password is required.");
      return false;
    }

    if (!formData.newPassword.trim()) {
      setError("New password is required.");
      return false;
    }

    if (formData.newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New password and confirm password do not match.");
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from current password.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Call the change password API endpoint
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to change password. Please try again.");
      }

      // Success - close modal and optionally show success message
      // You can add a success notification here if needed
      onClose();
    } catch (error) {
      setError(error.message || "Failed to change password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>Change Password</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Current Password Field */}
          <label className={styles.field}>
            <span className={styles.labelText}>Current Password</span>
            <div className={styles.passwordInputContainer}>
              <input
                className={styles.input}
                name="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={handleChange}
                required
                disabled={saving}
                placeholder="Enter your current password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility("current")}
                disabled={saving}
              >
                {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </label>

          {/* New Password Field */}
          <label className={styles.field}>
            <span className={styles.labelText}>New Password</span>
            <div className={styles.passwordInputContainer}>
              <input
                className={styles.input}
                name="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={handleChange}
                required
                disabled={saving}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility("new")}
                disabled={saving}
              >
                {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </label>

          {/* Confirm New Password Field */}
          <label className={styles.field}>
            <span className={styles.labelText}>Confirm New Password</span>
            <div className={styles.passwordInputContainer}>
              <input
                className={styles.input}
                name="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={saving}
                placeholder="Confirm your new password"
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => togglePasswordVisibility("confirm")}
                disabled={saving}
              >
                {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </label>

          {error && <div className={styles.errorText}>{error}</div>}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={
                saving ||
                !formData.currentPassword.trim() ||
                !formData.newPassword.trim() ||
                !formData.confirmPassword.trim()
              }
            >
              {saving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;

