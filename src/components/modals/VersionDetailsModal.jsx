import { useState } from "react";
import styles from "./ContactsForm.module.css";
import { FaSave, FaTrash, FaPlus, FaTimes, FaEnvelope, FaComment, FaDownload } from "react-icons/fa";
import toast from "../Toaster/toast";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const VersionDetailsModal = ({ version, documentId, onClose, onUpdate, onDelete, onStakeholderAdded }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: version.status || "Creation",
    changes: version.changes,
  });
  const [stakeholders, setStakeholders] = useState(version.stakeholders || []);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [newStakeholder, setNewStakeholder] = useState({
    name: "",
    email: "",
    role: "",
    status: "Pending",
  });
  
  // Reviews state
  const [reviews, setReviews] = useState(version.reviews || []);
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({
    reviewer: "",
    comment: "",
    status: "Pending",
  });

  const lifecycleStages = [
    { step: 1, label: "Creation", value: "Creation" },
    { step: 2, label: "Review", value: "Review" },
    { step: 3, label: "Approved", value: "Approved" },
    { step: 4, label: "Update", value: "Update" },
    { step: 5, label: "Rejected", value: "Rejected" },
    { step: 6, label: "Published", value: "Published" },
  ];

  const hasApprovedStakeholder = stakeholders.some(s => s.status === "Approved");
  const canEdit = !hasApprovedStakeholder;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStakeholderChange = (e) => {
    const { name, value } = e.target;
    setNewStakeholder((prev) => ({ ...prev, [name]: value }));
  };

  const [addingStakeholder, setAddingStakeholder] = useState(false);

  const handleAddStakeholder = async () => {
    if (!newStakeholder.name || !newStakeholder.email || !newStakeholder.role) {
      toast.warning("Please fill all stakeholder fields");
      return;
    }

    if (!documentId || !version.id) {
      toast.error("Missing document or version information");
      return;
    }

    setAddingStakeholder(true);
    try {
      const url = `${API_BASE_URL}/documents/${documentId}/versions/${version.id}/stakeholders`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newStakeholder.name,
          email: newStakeholder.email,
          role: newStakeholder.role,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Add stakeholder failed:", res.status, data);
        toast.error(data.message || `Failed to add stakeholder (${res.status})`);
        return;
      }

      const saved = {
        id: data.id || data._id,
        name: data.name,
        email: data.email,
        role: data.role,
        status: data.status || "Pending",
        avatar: data.avatar || `https://i.pravatar.cc/40?img=${stakeholders.length + 10}`,
      };

      setStakeholders([...stakeholders, saved]);
      setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
      setShowAddStakeholder(false);
      if (data.versionStatus) {
        setFormData((prev) => ({ ...prev, status: data.versionStatus }));
      }
      onStakeholderAdded?.(version.id, saved, data.documentStatus, data.versionStatus);
      toast.success("Stakeholder added and approval email sent");
    } catch (error) {
      console.error("Error adding stakeholder:", error);
      toast.error("Failed to add stakeholder");
    } finally {
      setAddingStakeholder(false);
    }
  };

  const handleRemoveStakeholder = (id) => {
    if (!canEdit) {
      toast.error("Cannot remove stakeholders after approval");
      return;
    }
    setStakeholders(stakeholders.filter(s => s.id !== id));
    toast.success("Stakeholder removed");
  };

  const handleSave = () => {
    const updatedVersion = {
      ...formData,
      stakeholders,
      reviews,
    };
    onUpdate(version.id, updatedVersion);
    setIsEditing(false);
  };

  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setNewReview((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddReview = () => {
    if (!newReview.reviewer || !newReview.comment) {
      toast.warning("Please fill all review fields");
      return;
    }

    const review = {
      id: reviews.length + 1,
      ...newReview,
      date: new Date().toISOString().split("T")[0],
    };

    setReviews([...reviews, review]);
    setNewReview({ reviewer: "", comment: "", status: "Pending" });
    setShowAddReview(false);
    toast.success("Review added");
    
    // Auto-save the review
    const updatedVersion = {
      ...formData,
      stakeholders,
      reviews: [...reviews, review],
    };
    onUpdate(version.id, updatedVersion);
  };

  const handleRemoveReview = (id) => {
    setReviews(reviews.filter(r => r.id !== id));
    toast.success("Review removed");
    
    // Auto-save after removal
    const updatedVersion = {
      ...formData,
      stakeholders,
      reviews: reviews.filter(r => r.id !== id),
    };
    onUpdate(version.id, updatedVersion);
  };

  const handleDelete = () => {
    onDelete(version.id);
    onClose();
  };

  const handleDownloadFile = () => {
    if (!version.files?.length && !version.fileName && !version.file) {
      toast.error("No file available for download");
      return;
    }

    try {
      // If there are files from the upload (array)
      if (version.files?.length > 0) {
        const file = version.files[0];
        if (file instanceof File) {
          // Newly uploaded file object
          const url = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name || `${version.version}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("File downloaded successfully");
        } else if (file.fileUrl) {
          // File from server with URL
          window.open(file.fileUrl, '_blank');
          toast.success("Opening file");
        }
      } else if (version.file) {
        // Single file object (legacy support)
        const url = URL.createObjectURL(version.file);
        const link = document.createElement('a');
        link.href = url;
        link.download = version.fileName || `${version.version}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("File downloaded successfully");
      } else if (version.fileUrl) {
        // Single file URL from server
        window.open(version.fileUrl, '_blank');
        toast.success("Opening file");
      } else {
        // TODO: Fetch from backend by version ID
        toast.info(`Download functionality for ${version.fileName} (from server) - to be implemented`);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    }
  };

  const [sendingEmailFor, setSendingEmailFor] = useState(null);

  const handleSendApprovalEmail = async (stakeholder) => {
    if (!documentId || !version.id || !stakeholder.id) {
      toast.error("Missing document, version, or stakeholder information");
      return;
    }

    setSendingEmailFor(stakeholder.id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/documents/${documentId}/versions/${version.id}/stakeholders/${stakeholder.id}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to send approval email");
        return;
      }

      toast.success(data.message || `Approval email sent to ${stakeholder.email}`);
    } catch (error) {
      console.error("Error sending approval email:", error);
      toast.error("Failed to send approval email");
    } finally {
      setSendingEmailFor(null);
    }
  };

  const getCurrentStageIndex = () => {
    return lifecycleStages.findIndex((stage) => stage.value === formData.status);
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className={styles.overlay} style={{ overflowY: "auto", padding: "20px 0" }}>
      <div className={styles.modalContent} style={{ maxWidth: "1100px", width: "95%", maxHeight: "none", height: "auto", margin: "auto", overflowY: "visible" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 className={styles.title}>Version Details - {version.version}</h2>
          {/* <button 
            onClick={onClose}
            style={{ 
              background: "none", 
              border: "none", 
              fontSize: "24px", 
              cursor: "pointer",
              color: "#6b7280"
            }}
          >
            ×
          </button> */}
        </div>

        <div style={{ display: "flex", gap: "24px" }}>
          {/* Lifecycle Status Sidebar */}
          <div style={{ width: "220px", flexShrink: 0 }}>
            <div style={{ 
              padding: "20px 16px", 
              background: "white",
              borderRadius: "8px",
              border: "1px solid #e5e7eb"
            }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px", color: "#374151" }}>
                Lifecycle Status
              </h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {lifecycleStages.map((stage, index) => {
                  const isCompleted = stage.step < currentStageIndex + 1;
                  const isActive = stage.value === formData.status;
                  const isFuture = stage.step > currentStageIndex + 1;

                  return (
                    <div
                      key={stage.step}
                      style={{ display: "flex", gap: "12px", position: "relative" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            position: "relative",
                            zIndex: 2,
                            transition: "all 0.3s ease",
                            background: isCompleted ? "rgb(69 112 182)" : "white",
                            border: `2px solid ${isActive ? "rgb(69 112 182)" : isFuture ? "#e5e7eb" : "rgb(69 112 182)"}`,
                          }}
                        >
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: isCompleted ? "white" : isActive ? "rgb(69 112 182)" : "#e5e7eb",
                              transition: "all 0.3s ease",
                            }}
                          ></div>
                        </div>
                        {index < lifecycleStages.length - 1 && (
                          <div
                            style={{
                              width: "2px",
                              height: "40px",
                              background: isCompleted || isActive ? "rgb(69 112 182)" : "#e5e7eb",
                              position: "relative",
                              zIndex: 1,
                              transition: "all 0.3s ease",
                            }}
                          ></div>
                        )}
                      </div>
                      <div style={{ flex: 1, padding: "4px 0", minHeight: "60px" }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: isFuture ? "#9ca3af" : "#1f2937",
                            marginBottom: "2px",
                          }}
                        >
                          {stage.label}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: isFuture ? "#d1d5db" : "#6b7280",
                            lineHeight: "1.3",
                          }}
                        >
                          {stage.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ flex: 1 }}>
            {/* Version Information */}
            <div style={{ marginBottom: "24px", padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <strong style={{ color: "#374151" }}>Version:</strong>
                  <div style={{ marginTop: "4px", color: "#6b7280" }}>{version.version}</div>
                </div>
                <div>
                  <strong style={{ color: "#374151" }}>Date:</strong>
                  <div style={{ marginTop: "4px", color: "#6b7280" }}>{version.date}</div>
                </div>
                <div>
                  <strong style={{ color: "#374151" }}>Author:</strong>
                  <div style={{ marginTop: "4px", color: "#6b7280" }}>{version.author}</div>
                </div>
                <div>
                  <strong style={{ color: "#374151" }}>File:</strong>
                  <div style={{ marginTop: "4px", color: "#6b7280" }}>{version.fileName || "N/A"}</div>
                </div>
              </div>
              
              {/* Download Button */}
              {(version.file || version.fileName) && (
                <button
                  onClick={handleDownloadFile}
                  style={{
                    padding: "8px 16px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  <FaDownload /> Download Document
                </button>
              )}
            </div>

        {/* Status and Changes (Editable) */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
              Version Status & Changes
            </h3>
            {!isEditing && canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: "6px 12px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div>
              <label className={styles.field}>
                <span className={styles.labelText}>Changes *</span>
                <textarea
                  className={styles.input}
                  name="changes"
                  value={formData.changes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the changes in this version..."
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </label>

              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  onClick={handleSave}
                  style={{
                    padding: "8px 16px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <FaSave /> Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      status: version.status,
                      changes: version.changes,
                    });
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#374151" }}>Status:</strong>
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    background: formData.status === "Published" ? "#10b981" : formData.status === "Approved" ? "#2563eb" : formData.status === "Rejected" ? "#ef4444" : "#3b82f6",
                    color: "white",
                    fontSize: "13px",
                  }}
                >
                  {formData.status}
                </span>
              </div>
              <div>
                <strong style={{ color: "#374151" }}>Changes:</strong>
                <div style={{ marginTop: "4px", color: "#6b7280" }}>{formData.changes}</div>
              </div>
            </div>
          )}
        </div>

        {/* Stakeholders Section */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
              Stakeholders
            </h3>
            {canEdit && !showAddStakeholder && (
              <button
                onClick={() => setShowAddStakeholder(true)}
                style={{
                  padding: "6px 12px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaPlus /> Add Stakeholder
              </button>
            )}
          </div>

          {!canEdit && (
            <div style={{
              padding: "12px",
              background: "#fef3c7",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#92400e",
              marginBottom: "12px",
            }}>
              <strong>Note:</strong> This version has approved stakeholders and cannot be edited or deleted.
            </div>
          )}

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
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
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
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
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
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
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
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  onClick={handleAddStakeholder}
                  disabled={addingStakeholder}
                  style={{
                    padding: "8px 16px",
                    background: addingStakeholder ? "#6ee7b7" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: addingStakeholder ? "not-allowed" : "pointer",
                    fontSize: "14px",
                  }}
                >
                  {addingStakeholder ? "Adding..." : "Add"}
                </button>
                <button
                  onClick={() => {
                    setShowAddStakeholder(false);
                    setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
                  }}
                  disabled={addingStakeholder}
                  style={{
                    padding: "8px 16px",
                    background: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: addingStakeholder ? "not-allowed" : "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Stakeholders List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {stakeholders.length === 0 ? (
              <div style={{ 
                padding: "24px", 
                textAlign: "center", 
                color: "#9ca3af",
                background: "#f9fafb",
                borderRadius: "8px"
              }}>
                No stakeholders added yet
              </div>
            ) : (
              stakeholders.map((stakeholder) => (
                <div
                  key={stakeholder.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={stakeholder.avatar}
                      alt={stakeholder.name}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: "500", color: "#111827" }}>
                        {stakeholder.name}
                      </div>
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>
                        {stakeholder.email}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                        {stakeholder.role}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "13px",
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
                    
                    {stakeholder.status === "Pending" && (
                      <button
                        onClick={() => handleSendApprovalEmail(stakeholder)}
                        title="Resend approval email"
                        disabled={sendingEmailFor === stakeholder.id}
                        style={{
                          padding: "6px 10px",
                          background: sendingEmailFor === stakeholder.id ? "#93c5fd" : "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: sendingEmailFor === stakeholder.id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                        }}
                      >
                        <FaEnvelope /> {sendingEmailFor === stakeholder.id ? "Sending..." : ""}
                      </button>
                    )}
                    
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveStakeholder(stakeholder.id)}
                        title="Remove stakeholder"
                        style={{
                          padding: "6px",
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
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaComment /> Reviews
            </h3>
            {!showAddReview && (
              <button
                onClick={() => setShowAddReview(true)}
                style={{
                  padding: "6px 12px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaPlus /> Add Review
              </button>
            )}
          </div>

          {/* Add Review Form */}
          {showAddReview && (
            <div style={{ 
              padding: "16px", 
              background: "#f3f4f6", 
              borderRadius: "8px", 
              marginBottom: "16px",
              border: "1px solid #d1d5db"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                    Reviewer Name *
                  </label>
                  <input
                    className={styles.input}
                    name="reviewer"
                    value={newReview.reviewer}
                    onChange={handleReviewChange}
                    placeholder="Enter reviewer name"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                    Comment *
                  </label>
                  <textarea
                    className={styles.input}
                    name="comment"
                    value={newReview.comment}
                    onChange={handleReviewChange}
                    placeholder="Enter review comment"
                    rows={3}
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                    Status
                  </label>
                  <select
                    className={styles.input}
                    name="status"
                    value={newReview.status}
                    onChange={handleReviewChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  onClick={handleAddReview}
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
                  onClick={() => {
                    setShowAddReview(false);
                    setNewReview({ reviewer: "", comment: "", status: "Pending" });
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

          {/* Reviews List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {reviews.length === 0 ? (
              <div style={{ 
                padding: "24px", 
                textAlign: "center", 
                color: "#9ca3af",
                background: "#f9fafb",
                borderRadius: "8px"
              }}>
                No reviews added yet
              </div>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    padding: "16px",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <strong style={{ color: "#111827", fontSize: "15px" }}>{review.reviewer}</strong>
                        <span style={{ color: "#9ca3af", fontSize: "13px" }}>• {review.date}</span>
                      </div>
                      <div style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.5" }}>
                        {review.comment}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          fontSize: "13px",
                          fontWeight: "500",
                          background:
                            review.status === "Approved"
                              ? "#d1fae5"
                              : review.status === "Rejected"
                              ? "#fee2e2"
                              : "#fef3c7",
                          color:
                            review.status === "Approved"
                              ? "#065f46"
                              : review.status === "Rejected"
                              ? "#991b1b"
                              : "#92400e",
                        }}
                      >
                        {review.status}
                      </span>
                      <button
                        onClick={() => handleRemoveReview(review.id)}
                        title="Remove review"
                        style={{
                          padding: "6px",
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
                </div>
              ))
            )}
          </div>
        </div>

            {/* Action Buttons */}
            <div className={styles.buttonGroup} style={{ marginTop: "24px" }}>
              {canEdit && (
                <button
                  onClick={handleDelete}
                  style={{
                    padding: "10px 20px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: "500",
                  }}
                >
                  <FaTrash /> Delete Version
                </button>
              )}
              <button
                onClick={onClose}
                className={styles.cancelBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionDetailsModal;
