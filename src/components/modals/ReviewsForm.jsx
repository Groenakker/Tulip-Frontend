import { useState } from "react";
import styles from "./ContactsForm.module.css";
import { useAuth } from "../../context/AuthContext";

const ReviewsForm = ({ onClose, documentID, onSaved }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    comment: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reviewData = {
        ...formData,
        reviewer: user?.name || "Current User",
        status: "Pending",
        date: new Date().toISOString(),
      };

      // TODO: Replace with actual API call
      // const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${documentID}/reviews`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(reviewData),
      // });
      // if (!res.ok) throw new Error("Failed to add review");

      console.log("Review submitted:", reviewData);
      onSaved?.(reviewData);
      onClose();
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>Add Review</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <span className={styles.labelText}>Reviewer</span>
            <input
              className={styles.input}
              value={user?.name || "Current User"}
              disabled
              style={{ background: "#f9fafb", cursor: "not-allowed" }}
            />
          </div>

          <label className={styles.field}>
            <span className={styles.labelText}>Comment *</span>
            <textarea
              className={styles.input}
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              rows={5}
              placeholder="Enter your review comments..."
              required
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </label>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewsForm;
