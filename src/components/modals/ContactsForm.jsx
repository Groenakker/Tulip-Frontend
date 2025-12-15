import { useState } from "react";
import styles from "./ContactsForm.module.css";

const ContactsForm = ({ onClose , bPartnerID, onSaved }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    jobTitle: "",
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
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to add contact");
      }

      console.log("Form submitted:", formData); // replace with real save logic later
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>Add Contact</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.labelText}>Name</span>
            <input
              className={styles.input}
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.labelText}>Email</span>
            <input
              className={styles.input}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.labelText}>Phone</span>
            <input
              className={styles.input}
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.labelText}>Job Title</span>
            <input
              className={styles.input}
              type="text"
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
            />
          </label>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              Save
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

export default ContactsForm;
