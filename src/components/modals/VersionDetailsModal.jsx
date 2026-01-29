import { useState } from "react";
import styles from "./ContactsForm.module.css";
import { FaSave, FaTrash, FaPlus, FaTimes } from "react-icons/fa";
import toast from "../Toaster/toast";

const VersionDetailsModal = ({ version, onClose, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: version.status,
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

  // Lifecycle stages
  const lifecycleStages = [
    { step: 1, label: "Creation", value: "Creation" },
    { step: 2, label: "Review", value: "Review" },
    { step: 3, label: "Update", value: "Update" },
    { step: 4, label: "Rejected", value: "Rejected" },
    { step: 5, label: "Published", value: "Published" },
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
    };
    onUpdate(version.id, updatedVersion);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(version.id);
    onClose();
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
          <button 
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
          </button>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                <span className={styles.labelText}>Status *</span>
                <select
                  className={styles.input}
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
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
                    background: formData.status === "Published" ? "#10b981" : "#3b82f6",
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
                <div>
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
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                    {canEdit && (
                      <button
                        onClick={() => handleRemoveStakeholder(stakeholder.id)}
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
