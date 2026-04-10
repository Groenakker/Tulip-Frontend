import { useState, useEffect } from "react";
import styles from "./ContactsForm.module.css";
import { FaUpload, FaPlus, FaTimes, FaUserFriends, FaUserPlus } from "react-icons/fa";
import toast from "../Toaster/toast";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const VersionsForm = ({ onClose, documentId, documentID, currentVersionNumber, onSaved }) => {
  const { user: authUser } = useAuth();
  const [formData, setFormData] = useState({
    documentName: "",
    file: null,
    changes: "",
    status: "Creation",
  });
  const [stakeholders, setStakeholders] = useState([]);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [stakeholderSource, setStakeholderSource] = useState(null);
  const [newStakeholder, setNewStakeholder] = useState({
    name: "",
    email: "",
    role: "",
    status: "Pending",
  });
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamUsersLoading, setTeamUsersLoading] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [selectedTeamUser, setSelectedTeamUser] = useState(null);
  const [selectedTeamUserRole, setSelectedTeamUserRole] = useState("");
  const [selectedTeamUserStatus, setSelectedTeamUserStatus] = useState("Pending");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stakeholderSource !== "team" || !authUser?.companyId) {
      setTeamUsers([]);
      return;
    }
    let cancelled = false;
    setTeamUsersLoading(true);
    fetch(`${API_BASE_URL}/companies/${authUser.companyId}/users`, { credentials: "include" })
      .then((res) => res.json().catch(() => []))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setTeamUsers(list.map((item) => ({
          id: item._id || item.id,
          name: item.name || "",
          email: item.email || "",
          profilePicture: item.profilePicture,
        })));
      })
      .catch(() => { if (!cancelled) setTeamUsers([]); })
      .finally(() => { if (!cancelled) setTeamUsersLoading(false); });
    return () => { cancelled = true; };
  }, [stakeholderSource, authUser?.companyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        file,
        documentName: prev.documentName || file.name,
      }));
    }
  };

  const handleStakeholderChange = (e) => {
    const { name, value } = e.target;
    setNewStakeholder((prev) => ({ ...prev, [name]: value }));
  };

  const addedEmails = new Set(stakeholders.map((s) => (s.email || "").toLowerCase()));
  const filteredTeamUsers = teamUsers.filter((u) => {
    const emailMatch = !addedEmails.has((u.email || "").toLowerCase());
    const searchLower = (teamSearchQuery || "").toLowerCase();
    const nameMatch = !searchLower || (u.name || "").toLowerCase().includes(searchLower) || (u.email || "").toLowerCase().includes(searchLower);
    return emailMatch && nameMatch;
  });

  const closeAddStakeholder = () => {
    setShowAddStakeholder(false);
    setStakeholderSource(null);
    setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
    setSelectedTeamUser(null);
    setSelectedTeamUserRole("");
    setSelectedTeamUserStatus("Pending");
    setTeamSearchQuery("");
  };

  const handleAddStakeholderFromTeam = () => {
    if (!selectedTeamUser || !selectedTeamUserRole) {
      toast.warning("Select a team member and choose a role");
      return;
    }
    const stakeholder = {
      id: stakeholders.length + 1,
      name: selectedTeamUser.name,
      email: selectedTeamUser.email,
      role: selectedTeamUserRole,
      status: selectedTeamUserStatus || "Pending",
      avatar: selectedTeamUser.profilePicture || `https://i.pravatar.cc/40?img=${stakeholders.length + 10}`,
    };
    setStakeholders([...stakeholders, stakeholder]);
    toast.success("Stakeholder added");
    closeAddStakeholder();
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
    setStakeholderSource(null);
    toast.success("Stakeholder added");
  };

  const handleRemoveStakeholder = (id) => {
    setStakeholders(stakeholders.filter((s) => s.id !== id));
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
    if (!formData.file) {
      toast.warning("Please upload a document file");
      return;
    }
    const docId = documentId || documentID;
    if (!docId) {
      toast.error("Document ID is missing");
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", formData.file);
      formDataToSend.append("changes", formData.changes.trim());
      formDataToSend.append("status", formData.status);
      formDataToSend.append("documentName", formData.documentName || formData.file.name);
      const stakeholdersPayload = stakeholders.map(({ name, email, role, status }) => ({
        name,
        email,
        role,
        status: status || "Pending",
      }));
      formDataToSend.append("stakeholders", JSON.stringify(stakeholdersPayload));

      const res = await fetch(`${API_BASE_URL}/documents/${docId}/versions`, {
        method: "POST",
        credentials: "include",
        body: formDataToSend,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to add version");
        return;
      }

      toast.success("Version created successfully. Stakeholders will receive an email.");
      onSaved?.(data);
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
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Accepted formats: PDF, DOC, DOCX</span>
            </div>
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

            {showAddStakeholder && (
              <div style={{ padding: "16px", background: "#f3f4f6", borderRadius: "8px", marginBottom: "16px", border: "1px solid #d1d5db" }}>
                {stakeholderSource === null && (
                  <>
                    <p style={{ marginBottom: "16px", fontSize: "14px", color: "#374151" }}>Choose how to add a stakeholder:</p>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
                      <button
                        type="button"
                        onClick={() => setStakeholderSource("team")}
                        style={{
                          flex: "1",
                          minWidth: "180px",
                          padding: "10px 16px",
                          background: "#456FB6",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <FaUserFriends /> Search from team
                      </button>
                      <button
                        type="button"
                        onClick={() => setStakeholderSource("manual")}
                        style={{
                          flex: "1",
                          minWidth: "180px",
                          padding: "10px 16px",
                          background: "#456FB6",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <FaUserPlus /> Not in team (add by name & email)
                      </button>
                    </div>
                    <button type="button" onClick={closeAddStakeholder} style={{ padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </>
                )}

                {stakeholderSource === "team" && (
                  <>
                    <button type="button" onClick={() => { setStakeholderSource(null); setSelectedTeamUser(null); setTeamSearchQuery(""); }} style={{ marginBottom: "16px", padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                      ← Back
                    </button>
                    <div style={{ marginBottom: "16px" }}>
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #D0D5DD", fontSize: "14px" }}
                      />
                    </div>
                    {teamUsersLoading ? (
                      <p style={{ color: "#6b7280", marginBottom: "16px" }}>Loading team...</p>
                    ) : filteredTeamUsers.length === 0 ? (
                      <p style={{ color: "#6b7280", marginBottom: "16px" }}>No team members found or all are already added.</p>
                    ) : (
                      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", maxHeight: "200px", overflowY: "auto" }}>
                        {filteredTeamUsers.map((u) => (
                          <li
                            key={u.id}
                            onClick={() => setSelectedTeamUser(selectedTeamUser?.id === u.id ? null : u)}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "8px",
                              marginBottom: "6px",
                              cursor: "pointer",
                              background: selectedTeamUser?.id === u.id ? "#e0f2fe" : "#f9fafb",
                              border: selectedTeamUser?.id === u.id ? "1px solid #0ea5e9" : "1px solid #e5e7eb",
                            }}
                          >
                            <strong>{u.name || "—"}</strong> {u.email && <span style={{ color: "#6b7280" }}>({u.email})</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedTeamUser && (
                      <div style={{ marginBottom: "16px" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Role *</label>
                          <select
                            value={selectedTeamUserRole}
                            onChange={(e) => setSelectedTeamUserRole(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #D0D5DD", fontSize: "14px" }}
                          >
                            <option value="">Select Role</option>
                            <option value="REVIEWER">Reviewer</option>
                            <option value="APPROVER">Approver</option>
                            <option value="OBSERVER">Observer</option>
                            <option value="EDITOR">Editor</option>
                          </select>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button type="button" onClick={handleAddStakeholderFromTeam} disabled={!selectedTeamUser || !selectedTeamUserRole} style={{ padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
                        Add
                      </button>
                      <button type="button" onClick={closeAddStakeholder} style={{ padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {stakeholderSource === "manual" && (
                  <>
                    <button type="button" onClick={() => setStakeholderSource(null)} style={{ marginBottom: "16px", padding: "6px 12px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                      ← Back
                    </button>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Name *</label>
                        <input className={styles.input} name="name" value={newStakeholder.name} onChange={handleStakeholderChange} placeholder="Enter name" />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Email *</label>
                        <input className={styles.input} name="email" type="email" value={newStakeholder.email} onChange={handleStakeholderChange} placeholder="Enter email" />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Role *</label>
                        <select className={styles.input} name="role" value={newStakeholder.role} onChange={handleStakeholderChange}>
                          <option value="">Select Role</option>
                          <option value="REVIEWER">Reviewer</option>
                          <option value="APPROVER">Approver</option>
                          <option value="OBSERVER">Observer</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button type="button" onClick={handleAddStakeholder} style={{ padding: "8px 16px", background: "#10b981", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        Add
                      </button>
                      <button type="button" onClick={closeAddStakeholder} style={{ padding: "8px 16px", background: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {stakeholders.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db" }}>
                  No stakeholders added yet. Click "Add Stakeholder" to add one (from team or by email).
                </div>
              ) : (
                stakeholders.map((stakeholder) => (
                  <div
                    key={stakeholder.id}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "white", border: "1px solid #e5e7eb", borderRadius: "6px" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <img src={stakeholder.avatar} alt={stakeholder.name} style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
                      <div>
                        <div style={{ fontWeight: "500", fontSize: "14px" }}>{stakeholder.name}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>{stakeholder.email} • {stakeholder.role}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: stakeholder.status === "Approved" ? "#d1fae5" : stakeholder.status === "Rejected" ? "#fee2e2" : "#fef3c7",
                          color: stakeholder.status === "Approved" ? "#065f46" : stakeholder.status === "Rejected" ? "#991b1b" : "#92400e",
                        }}
                      >
                        {stakeholder.status}
                      </span>
                      <button type="button" onClick={() => handleRemoveStakeholder(stakeholder.id)} style={{ padding: "4px", background: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", display: "flex" }}>
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
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VersionsForm;
