import React, { useState } from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentDetails.module.css";
import { FaSave, FaUpload, FaFile, FaPlus, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "../../components/Toaster/toast";
import Header from '../../components/Header';

export default function DocumentCreate() {
  const navigate = useNavigate();

  const [document, setDocument] = useState({
    documentID: "",
    name: "",
    status: "Creation",
    description: "",
    category: "",
    currentVersion: "v1.0",
    file: null,
    fileName: "",
  });

  // Initial stakeholders for new document creation
  const [initialStakeholders, setInitialStakeholders] = useState([]);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [newStakeholder, setNewStakeholder] = useState({
    name: "",
    email: "",
    role: "",
    status: "Pending",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDocument((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocument((prev) => ({
        ...prev,
        file: file,
        fileName: file.name,
      }));
      toast.success(`File "${file.name}" uploaded successfully`);
    }
  };

  const handleSave = async () => {
    if (!document.documentID || !document.name || !document.status) {
      toast.warning("Please fill all required fields");
      return;
    }

    if (!document.file) {
      toast.error("Please upload a document file");
      return;
    }

    if (initialStakeholders.length === 0) {
      toast.warning("Consider adding at least one stakeholder for the initial draft");
      // Allow saving without stakeholders, just show warning
    }

    try {
      // TODO: Create new document with initial stakeholders
      // const documentData = {
      //   ...document,
      //   stakeholders: initialStakeholders
      // };
      // await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(documentData),
      // });
      
      console.log("Creating document with stakeholders:", initialStakeholders);
      toast.success("Document created successfully");
      navigate("/DocumentManagement");
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document");
    }
  };

  // Stakeholder management functions
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
      id: initialStakeholders.length + 1,
      ...newStakeholder,
      avatar: `https://i.pravatar.cc/40?img=${initialStakeholders.length + 10}`,
    };

    setInitialStakeholders([...initialStakeholders, stakeholder]);
    setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
    setShowAddStakeholder(false);
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
                  <FaUpload /> Upload File
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </label>
                {document.fileName && (
                  <div className={styles.fileName}>{document.fileName}</div>
                )}
              </div>

              {/* Right side - Form fields */}
              <div className={styles.detailContainer}>
                <div className={styles.details}>
                  <div className={styles.info}>
                    <div className={styles.infoDetail}>Document ID <span className={styles.required}>*</span></div>
                    <input
                      type="text"
                      name="documentID"
                      value={document.documentID}
                      onChange={handleChange}
                      placeholder="DOC-2024-001"
                    />
                  </div>

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
                </div>

                <div className={styles.details}>
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

                  <div className={styles.info} style={{ flex: 2 }}>
                    <div className={styles.infoDetail}>Description</div>
                    <input
                      type="text"
                      name="description"
                      value={document.description}
                      onChange={handleChange}
                      placeholder="Document description"
                    />
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
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <button className={styles.saveButton} onClick={handleSave}>
                <FaSave /> Create Document
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

            {/* Add Stakeholder Form */}
            {showAddStakeholder && (
              <div className={styles.stakeholderFormContainer}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '40px', rowGap: '20px', marginBottom: '20px' }}>
                  {/* Column 1 - Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className={styles.stakeholderFormLabel}>
                      Name <span className={styles.required}>*</span>
                    </label>
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
                  {/* Column 2 - Email */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className={styles.stakeholderFormLabel}>
                      Email <span className={styles.required}>*</span>
                    </label>
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
                  {/* Column 1 - Role */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className={styles.stakeholderFormLabel}>
                      Role <span className={styles.required}>*</span>
                    </label>
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
                  {/* Column 2 - Status */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className={styles.stakeholderFormLabel}>
                      Status
                    </label>
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
                  <button
                    onClick={handleAddStakeholder}
                    className={styles.saveButton}
                  >
                    <FaSave /> Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddStakeholder(false);
                      setNewStakeholder({ name: "", email: "", role: "", status: "Pending" });
                    }}
                    className={styles.rejectButton}
                  >
                    Cancel
                  </button>
                </div>
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
