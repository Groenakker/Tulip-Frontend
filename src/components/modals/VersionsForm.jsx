import { useState } from "react";
import styles from "./ContactsForm.module.css";
import { FaUpload, FaPlus, FaTimes } from "react-icons/fa";
import toast from "../Toaster/toast";

const VersionsForm = ({ onClose, documentID, currentVersionNumber, onSaved }) => {
  const [formData, setFormData] = useState({
    documentName: "",
    file: null,
    changes: "",
    status: "Creation",
  });
  const [stakeholders, setStakeholders] = useState([]);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [newStakeholder, setNewStakeholder] = useState({
    name: "",
    email: "",
    role: "",
    status: "Pending",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        file: file,
        documentName: prev.documentName || file.name,
      }));
    }
  };

  const handleStakeholderChange = (e) => {
    const { name, value } = e.target;
    setNewStakeholder((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddStakeholder = () => {
    if (!newStakeholder.name || !newStakeholder.email || !newStakeholder.role) {
      toast.warning("Please fill all stakeholder fields");
      return;
    }

    const stakeholder = {
      id: stakeholders.length + 1,
      ...newStakeholder,
      avatar: `https://i.pravatar.cc/40?img=${stakeholders.length + 10}`,
    };

    setStakeholders([...stakeholders, stakeholder]);
    setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
    setShowAddStakeholder(false);
    toast.success("Stakeholder added");
  };

  const handleRemoveStakeholder = (id) => {
    setStakeholders(stakeholders.filter(s => s.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.changes.trim()) {
      toast.warning("Please describe the changes in this version");
      return;
    }

    if (stakeholders.length === 0) {
      toast.warning("Please add at least one stakeholder for this version");
      return;
    }

    setLoading(true);

    try {
      // TODO: Replace with actual API call using FormData for file upload
      // const formDataToSend = new FormData();
      // formDataToSend.append('documentName', formData.documentName);
      // formDataToSend.append('file', formData.file);
      // formDataToSend.append('changes', formData.changes);
      // formDataToSend.append('stakeholders', JSON.stringify(stakeholders));
      
      // const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${documentID}/versions`, {
      //   method: "POST",
      //   body: formDataToSend,
      // });
      // if (!res.ok) throw new Error("Failed to add version");

      const versionData = {
        documentName: formData.documentName,
        fileName: formData.file?.name || "",
        file: formData.file,
        changes: formData.changes,
        status: formData.status,
        stakeholders: stakeholders,
        uploadedAt: new Date().toISOString(),
      };

      console.log("Version submitted:", versionData);
      onSaved?.(versionData);
      onClose();
    } catch (error) {
      console.error("Error submitting version:", error);
      toast.error("Failed to create version");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} style={{ overflowY: "auto", padding: "20px 0" }}>
      <div className={styles.modalContent} style={{ maxWidth: "1000px", width: "95%", maxHeight: "none", height: "auto", overflowY: "visible", overflowX: "hidden", margin: "auto" }}>
        <h2 className={styles.title}>Add New Version</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.labelText}>Document Name *</span>
            <input
              className={styles.input}
              name="documentName"
              value={formData.documentName}
              onChange={handleChange}
              placeholder="Enter document name"
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.labelText}>Upload Document *</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label className={styles.fileUploadLabel}>
                <FaUpload style={{ marginRight: "8px" }} />
                {formData.file ? formData.file.name : "Choose File"}
                <input
                  type="file"
                  onChange={handleFileChange}
                  required
                  accept=".pdf,.doc,.docx"
                  style={{ display: "none" }}
                />
              </label>
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                Accepted formats: PDF, DOC, DOCX
              </span>
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.labelText}>Status *</span>
            <select
              className={styles.input}
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
            >
              <option value="Creation">Creation</option>
              <option value="Review">Review</option>
              <option value="Update">Update</option>
              <option value="Rejected">Rejected</option>
              <option value="Published">Published</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.labelText}>Changes *</span>
            <textarea
              className={styles.input}
              name="changes"
              value={formData.changes}
              onChange={handleChange}
              rows={3}
              placeholder="Describe what changed compared to the previous version..."
              required
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
            <span style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
              Describe the changes between this version and the previous one
            </span>
          </label>

          {/* Stakeholders Section */}
          <div className={styles.field}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span className={styles.labelText}>Stakeholders *</span>
              {!showAddStakeholder && (
                <button
                  type="button"
                  onClick={() => setShowAddStakeholder(true)}
                  style={{
                    padding: "6px 12px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaPlus /> Add Stakeholder
                </button>
              )}
            </div>

            {/* Add Stakeholder Form */}
            {showAddStakeholder && (
              <div style={{ 
                padding: "16px", 
                background: "#f3f4f6", 
                borderRadius: "8px", 
                marginBottom: "16px",
                border: "1px solid #d1d5db"
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>
                      Name *
                    </label>
                    <input
                      className={styles.input}
                      name="name"
                      value={newStakeholder.name}
                      onChange={handleStakeholderChange}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>
                      Email *
                    </label>
                    <input
                      className={styles.input}
                      name="email"
                      type="email"
                      value={newStakeholder.email}
                      onChange={handleStakeholderChange}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>
                      Role *
                    </label>
                    <select
                      className={styles.input}
                      name="role"
                      value={newStakeholder.role}
                      onChange={handleStakeholderChange}
                    >
                      <option value="">Select Role</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="APPROVER">Approver</option>
                      <option value="OBSERVER">Observer</option>
                      <option value="EDITOR">Editor</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>
                      Status
                    </label>
                    <select
                      className={styles.input}
                      name="status"
                      value={newStakeholder.status}
                      onChange={handleStakeholderChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={handleAddStakeholder}
                    style={{
                      padding: "8px 16px",
                      background: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStakeholder(false);
                      setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#6b7280",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Stakeholders List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {stakeholders.length === 0 ? (
                <div style={{ 
                  padding: "16px", 
                  textAlign: "center", 
                  color: "#9ca3af",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px dashed #d1d5db"
                }}>
                  No stakeholders added yet. Click "Add Stakeholder" to add one.
                </div>
              ) : (
                stakeholders.map((stakeholder) => (
                  <div
                    key={stakeholder.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img
                        src={stakeholder.avatar}
                        alt={stakeholder.name}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: "500", fontSize: "14px" }}>
                          {stakeholder.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {stakeholder.email} • {stakeholder.role}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background:
                            stakeholder.status === "Approved"
                              ? "#d1fae5"
                              : stakeholder.status === "Rejected"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            stakeholder.status === "Approved"
                              ? "#065f46"
                              : stakeholder.status === "Rejected"
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {stakeholder.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStakeholder(stakeholder.id)}
                        style={{
                          padding: "4px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" className={styles.saveBtn} disabled={loading || !formData.file || stakeholders.length === 0}>
              {loading ? "Creating..." : "Create Version"}
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

export default VersionsForm;
