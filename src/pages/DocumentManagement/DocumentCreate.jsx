import React, { useState, useEffect } from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentDetails.module.css";
import { FaSave, FaUpload, FaFile, FaPlus, FaTimes, FaUserFriends, FaUserPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "../../components/Toaster/toast";
import Header from '../../components/Header';
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function DocumentCreate() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [document, setDocument] = useState({
    name: "",
    status: "Creation", // Always starts with Creation status
    description: "",
    category: "",
    currentVersion: "v1.0",
    files: [],
    owner: "",
  });

  // Set the owner to the current user when component mounts
  useEffect(() => {
    if (authUser?.name) {
      setDocument((prev) => ({ ...prev, owner: authUser.name }));
    }
  }, [authUser]);

  // Initial stakeholders for new document creation
  const [initialStakeholders, setInitialStakeholders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  // 'team' | 'manual' | null (null = show choice)
  const [stakeholderSource, setStakeholderSource] = useState(null);
  const [newStakeholder, setNewStakeholder] = useState({
    name: "",
    email: "",
    role: "",
    status: "Pending",
  });
  // From team: list of company users, search, selection
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamUsersLoading, setTeamUsersLoading] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [selectedTeamUser, setSelectedTeamUser] = useState(null);
  const [selectedTeamUserRole, setSelectedTeamUserRole] = useState("");
  const [selectedTeamUserStatus, setSelectedTeamUserStatus] = useState("Pending");

  // Fetch team users when "From team" is selected
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
      .catch(() => {
        if (!cancelled) setTeamUsers([]);
      })
      .finally(() => {
        if (!cancelled) setTeamUsersLoading(false);
      });
    return () => { cancelled = true; };
  }, [stakeholderSource, authUser?.companyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDocument((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const chosen = e.target.files;
    if (!chosen?.length) return;
    const fileList = Array.from(chosen);
    setDocument((prev) => ({
      ...prev,
      files: [...(prev.files || []), ...fileList],
    }));
    const msg = fileList.length === 1
      ? `File "${fileList[0].name}" added`
      : `${fileList.length} files added`;
    toast.success(msg);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setDocument((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
    toast.success("File removed");
  };

  const handleSave = async () => {
    const files = document.files || [];
    if (files.length === 0) {
      toast.error("Please upload at least one document file");
      return;
    }
    if (!document.name?.trim()) {
      toast.warning("Document name is required");
      return;
    }
    if (!document.category?.trim()) {
      toast.warning("Category is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));
      formData.append("name", document.name.trim());
      formData.append("category", document.category.trim());
      if (document.description?.trim()) {
        formData.append("description", document.description.trim());
      }
      if (initialStakeholders.length > 0) {
        const stakeholdersPayload = initialStakeholders.map(({ name, email, role, status }) => ({
          name,
          email,
          role,
          status: status || "Pending",
        }));
        formData.append("stakeholders", JSON.stringify(stakeholdersPayload));
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Failed to create document");
        return;
      }
      toast.success("Document created successfully");

      // Navigate to the newly created document's detail page
      const newDocumentId = data._id || data.id;
      if (newDocumentId) {
        navigate(`/DocumentManagement/DocumentDetails/${newDocumentId}`);
      } else {
        // Fallback to list if no ID returned
        navigate("/DocumentManagement");
      }
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document(s)");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stakeholder management functions
  const handleStakeholderChange = (e) => {
    const { name, value } = e.target;
    setNewStakeholder((prev) => ({ ...prev, [name]: value }));
  };

  const addedEmails = new Set(initialStakeholders.map((s) => (s.email || "").toLowerCase()));
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
      id: selectedTeamUser.id || initialStakeholders.length + 1,
      name: selectedTeamUser.name,
      email: selectedTeamUser.email,
      role: selectedTeamUserRole,
      status: selectedTeamUserStatus || "Pending",
      avatar: selectedTeamUser.profilePicture || `https://i.pravatar.cc/40?img=${initialStakeholders.length + 10}`,
    };
    setInitialStakeholders([...initialStakeholders, stakeholder]);
    
    // Auto-change status to "Review" when first stakeholder is added
    if (initialStakeholders.length === 0 && document.status === "Creation") {
      setDocument((prev) => ({ ...prev, status: "Review" }));
      toast.info("Document status changed to Review");
    }
    
    toast.success("Stakeholder added");
    closeAddStakeholder();
  };

  const handleAddStakeholder = () => {
    if (!newStakeholder.name || !newStakeholder.email || !newStakeholder.role) {
      toast.warning("Please fill all stakeholder fields");
      return;
    }

    const stakeholder = {
      id: initialStakeholders.length + 1,
      ...newStakeholder,
      avatar: `https://i.pravatar.cc/40?img=${initialStakeholders.length + 10}`,
    };

    setInitialStakeholders([...initialStakeholders, stakeholder]);
    
    // Auto-change status to "Review" when first stakeholder is added
    if (initialStakeholders.length === 0 && document.status === "Creation") {
      setDocument((prev) => ({ ...prev, status: "Review" }));
      toast.info("Document status changed to Review");
    }
    
    setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
    setShowAddStakeholder(false);
    setStakeholderSource(null);
    toast.success("Stakeholder added");
  };

  const handleRemoveStakeholder = (id) => {
    setInitialStakeholders(initialStakeholders.filter(s => s.id !== id));
    toast.success("Stakeholder removed");
  };

  return (
    <>
      <Header title="Create New Document" />
      <div className={styles.detailPage}>
        {/* Main Content */}
        <div className={styles.mainContent} style={{ maxWidth: "100%" }}>
          <WhiteIsland className={styles.documentIsland}>
            <h3>Document Info</h3>
            <div className={styles.main}>
              {/* Left side - File upload */}
              <div className={styles.picture}>
                <div className={styles.fileIcon}>
                  <FaFile size={48} color="#9ca3af" />
                </div>
                <label className={styles.uploadButton}>
                  <FaUpload /> Upload File(s)
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </label>
                {(document.files?.length > 0) && (
                  <div className={styles.fileName}>
                    {document.files.length === 1 ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        {document.files[0].name}
                        <button
                          type="button"
                          onClick={() => removeFile(0)}
                          className={styles.removeStakeholderButton}
                          title="Remove file"
                          style={{ padding: "2px 6px" }}
                        >
                          <FaTimes />
                        </button>
                      </span>
                    ) : (
                      <>
                        <span>{document.files.length} files selected</span>
                        <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px", textAlign: "left" }}>
                          {document.files.map((f, i) => (
                            <li key={`${f.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <span style={{ flex: 1 }}>{f.name}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                className={styles.removeStakeholderButton}
                                title="Remove file"
                                style={{ padding: "2px 6px" }}
                              >
                                <FaTimes />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right side - Form fields */}
              <div className={styles.detailContainer}>
                <div className={styles.details}>
                  <div className={styles.info} style={{ flex: 2 }}>
                    <div className={styles.infoDetail}>Name <span className={styles.required}>*</span></div>
                    <input
                      type="text"
                      name="name"
                      value={document.name}
                      onChange={handleChange}
                      placeholder="Document name"
                    />
                  </div>

                  <div className={styles.info}>
                    <div className={styles.infoDetail}>Owner <span className={styles.required}>*</span></div>
                    <input
                      type="text"
                      name="owner"
                      value={document.owner}
                      placeholder="Document owner"
                      readOnly
                    />
                  </div>
                </div>

                <div className={styles.details}>
                  <div className={styles.info}>
                    <div className={styles.infoDetail}>Category <span className={styles.required}>*</span></div>
                    <select
                      name="category"
                      value={document.category}
                      onChange={handleChange}
                    >
                      <option value="">Select Category</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Finance">Finance</option>
                      <option value="HR">HR</option>
                      <option value="Operations">Operations</option>
                      <option value="Quality">Quality</option>
                    </select>
                  </div>

                  <div className={styles.info}>
                    <div className={styles.infoDetail}>Status <span className={styles.required}>*</span></div>
                    <select
                      name="status"
                      value={document.status}
                      onChange={handleChange}
                    >
                      <option value="Creation">Creation</option>
                      <option value="Review">Review</option>
                      <option value="Update">Update</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Published">Published</option>
                    </select>
                  </div>

                  <div className={styles.info}>
                    <div className={styles.infoDetail}>Current Version</div>
                    <input
                      type="text"
                      name="currentVersion"
                      value={document.currentVersion}
                      readOnly
                    />
                  </div>
                </div>

                <div className={styles.details}>
                  <div className={styles.info} style={{ flex: 1 }}>
                    <div className={styles.infoDetail}>Description</div>
                    <input
                      type="text"
                      name="description"
                      value={document.description}
                      onChange={handleChange}
                      placeholder="Document description"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={isSubmitting}
              >
                <FaSave /> {isSubmitting ? "Creating…" : "Create Document"}
              </button>
            </div>
          </WhiteIsland>

          {/* Stakeholders Section for New Document */}
          <WhiteIsland className={styles.stakeholdersSection}>
            <div className={styles.stakeholdersSectionHeader}>
              <h3 className={styles.stakeholdersSectionTitle}>
                Initial Stakeholders
              </h3>
              {!showAddStakeholder && (
                <button
                  className={styles.addTabButton}
                  onClick={() => setShowAddStakeholder(true)}
                >
                  <FaPlus /> Add Stakeholder
                </button>
              )}
            </div>

            <p className={styles.stakeholdersSectionDescription}>
              Add stakeholders who will review and approve this initial document draft.
            </p>

            {/* Add Stakeholder: choice or form */}
            {showAddStakeholder && (
              <div className={styles.stakeholderFormContainer}>
                {stakeholderSource === null && (
                  <>
                    <p className={styles.stakeholdersSectionDescription} style={{ marginBottom: "16px" }}>
                      Choose how to add a stakeholder:
                    </p>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
                      <button
                        type="button"
                        onClick={() => setStakeholderSource("team")}
                        className={styles.addTabButton}
                        style={{ flex: "1", minWidth: "180px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                      >
                        <FaUserFriends /> Search from team
                      </button>
                      <button
                        type="button"
                        onClick={() => setStakeholderSource("manual")}
                        className={styles.addTabButton}
                        style={{ flex: "1", minWidth: "180px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                      >
                        <FaUserPlus /> Not in team (add by name & email)
                      </button>
                    </div>
                    <div className={styles.stakeholderFormActions}>
                      <button onClick={closeAddStakeholder} className={styles.rejectButton}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {stakeholderSource === "team" && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setStakeholderSource(null); setSelectedTeamUser(null); setTeamSearchQuery(""); }}
                      className={styles.rejectButton}
                      style={{ marginBottom: "16px" }}
                    >
                      ← Back
                    </button>
                    <div style={{ marginBottom: "16px" }}>
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={teamSearchQuery}
                        onChange={(e) => setTeamSearchQuery(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "20px",
                          border: "1px solid #D0D5DD",
                          fontSize: "0.95rem",
                          outline: "none",
                          background: "white",
                          boxSizing: "border-box",
                        }}
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
                              borderRadius: "12px",
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
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                        <div>
                          <label className={styles.stakeholderFormLabel}>Role <span className={styles.required}>*</span></label>
                          <select
                            value={selectedTeamUserRole}
                            onChange={(e) => setSelectedTeamUserRole(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "20px",
                              border: "1px solid #D0D5DD",
                              fontSize: "0.95rem",
                              outline: "none",
                              background: "white",
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="">Select Role</option>
                            <option value="REVIEWER">Reviewer</option>
                            <option value="APPROVER">Approver</option>
                            <option value="OBSERVER">Observer</option>
                            <option value="EDITOR">Editor</option>
                          </select>
                        </div>
                        <div>
                          <label className={styles.stakeholderFormLabel}>Status</label>
                          <select
                            value={selectedTeamUserStatus}
                            onChange={(e) => setSelectedTeamUserStatus(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "20px",
                              border: "1px solid #D0D5DD",
                              fontSize: "0.95rem",
                              outline: "none",
                              background: "white",
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      </div>
                    )}
                    <div className={styles.stakeholderFormActions}>
                      <button onClick={handleAddStakeholderFromTeam} className={styles.saveButton} disabled={!selectedTeamUser || !selectedTeamUserRole}>
                        <FaSave /> Add
                      </button>
                      <button onClick={closeAddStakeholder} className={styles.rejectButton}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {stakeholderSource === "manual" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStakeholderSource(null)}
                      className={styles.rejectButton}
                      style={{ marginBottom: "16px" }}
                    >
                      ← Back
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '40px', rowGap: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className={styles.stakeholderFormLabel}>Name <span className={styles.required}>*</span></label>
                        <input
                          name="name"
                          value={newStakeholder.name}
                          onChange={handleStakeholderChange}
                          placeholder="Enter name"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '20px',
                            border: '1px solid #D0D5DD',
                            fontSize: '0.95rem',
                            outline: 'none',
                            background: 'white',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className={styles.stakeholderFormLabel}>Email <span className={styles.required}>*</span></label>
                        <input
                          name="email"
                          type="email"
                          value={newStakeholder.email}
                          onChange={handleStakeholderChange}
                          placeholder="Enter email"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '20px',
                            border: '1px solid #D0D5DD',
                            fontSize: '0.95rem',
                            outline: 'none',
                            background: 'white',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className={styles.stakeholderFormLabel}>Role <span className={styles.required}>*</span></label>
                        <select
                          name="role"
                          value={newStakeholder.role}
                          onChange={handleStakeholderChange}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '20px',
                            border: '1px solid #D0D5DD',
                            fontSize: '0.95rem',
                            outline: 'none',
                            background: 'white',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="">Select Role</option>
                          <option value="REVIEWER">Reviewer</option>
                          <option value="APPROVER">Approver</option>
                          <option value="OBSERVER">Observer</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className={styles.stakeholderFormLabel}>Status</label>
                        <select
                          name="status"
                          value={newStakeholder.status}
                          onChange={handleStakeholderChange}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '20px',
                            border: '1px solid #D0D5DD',
                            fontSize: '0.95rem',
                            outline: 'none',
                            background: 'white',
                            fontFamily: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.stakeholderFormActions}>
                      <button onClick={handleAddStakeholder} className={styles.saveButton}>
                        <FaSave /> Add
                      </button>
                      <button onClick={closeAddStakeholder} className={styles.rejectButton}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Stakeholders List */}
            <div className={styles.stakeholdersList}>
              {initialStakeholders.length === 0 ? (
                <div className={styles.stakeholderEmptyState}>
                  <p className={styles.stakeholderEmptyTitle}>No stakeholders added yet</p>
                  <p className={styles.stakeholderEmptyDescription}>
                    Click "Add Stakeholder" to add reviewers for this document
                  </p>
                </div>
              ) : (
                initialStakeholders.map((stakeholder) => (
                  <div key={stakeholder.id} className={styles.stakeholderListItem}>
                    <div className={styles.stakeholderListInfo}>
                      <img
                        src={stakeholder.avatar}
                        alt={stakeholder.name}
                        className={styles.stakeholderListAvatar}
                      />
                      <div className={styles.stakeholderListDetails}>
                        <div className={styles.stakeholderListName}>
                          {stakeholder.name}
                        </div>
                        <div className={styles.stakeholderListEmail}>
                          {stakeholder.email}
                        </div>
                        <div className={styles.stakeholderListRole}>
                          {stakeholder.role}
                        </div>
                      </div>
                    </div>
                    <div className={styles.stakeholderListActions}>
                      <span
                        className={styles.stakeholderStatusBadge}
                        data-status={stakeholder.status}
                      >
                        {stakeholder.status}
                      </span>
                      <button
                        onClick={() => handleRemoveStakeholder(stakeholder.id)}
                        title="Remove stakeholder"
                        className={styles.removeStakeholderButton}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </WhiteIsland>
        </div>
      </div>
    </>
  );
}
