import { useState, useEffect } from "react";
import styles from "./ContactsForm.module.css";
import toast from "../Toaster/toast";

// `existingContact` is optional. When supplied (with at least an _id) the
// form switches to edit mode and PUTs to the per-contact endpoint instead
// of POSTing a new contact.
const ContactsForm = ({ onClose, bPartnerID, onSaved, existingContact = null }) => {
  const isEdit = Boolean(existingContact && existingContact._id);

  const [formData, setFormData] = useState({
    name: existingContact?.name || "",
    email: existingContact?.email || "",
    phone: existingContact?.phone || "",
    jobTitle: existingContact?.jobTitle || "",
  });
  const [loading, setLoading] = useState(false);

  // If the parent swaps the contact (rare, but possible if the modal is
  // reused), keep the form values in sync.
  useEffect(() => {
    setFormData({
      name: existingContact?.name || "",
      email: existingContact?.email || "",
      phone: existingContact?.phone || "",
      jobTitle: existingContact?.jobTitle || "",
    });
  }, [existingContact?._id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const baseUrl = `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/contacts`;
      const url = isEdit ? `${baseUrl}/${existingContact._id}` : baseUrl;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `Failed to ${isEdit ? "update" : "add"} contact`);
      }

      toast.success(isEdit ? "Contact updated" : "Contact added");
      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error saving contact:", error);
      toast.error(error.message || "Failed to save contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>{isEdit ? "Edit Contact" : "Add Contact"}</h2>

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
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Save"}
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
