import React, { useEffect, useState } from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentDetails.module.css";
import { FaSave, FaUpload, FaFile, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import toast from "../../components/Toaster/toast";
import Modal from "../../components/Modal";
import VersionsForm from "../../components/modals/VersionsForm";
import VersionDetailsModal from "../../components/modals/VersionDetailsModal";
import Header from '../../components/Header';
export default function DocumentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id && id !== "add";

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

  const [activeModal, setActiveModal] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);

  // Initial stakeholders for new document creation
  const [initialStakeholders, setInitialStakeholders] = useState([]);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [newStakeholder, setNewStakeholder] = useState({
    name: "",
    email: "",
    role: "",
    status: "Pending",
  });

  // Lifecycle stages
  const lifecycleStages = [
    { step: 1, label: "Creation", value: "Creation", description: "Document is being created" },
    { step: 2, label: "Review", value: "Review", description: "Document is under review" },
    { step: 3, label: "Update", value: "Update", description: "Document needs updates" },
    { step: 4, label: "Rejected", value: "Rejected", description: "Document was rejected" },
    { step: 5, label: "Published", value: "Published", description: "Document is published" },
  ];

  // Sample versions data with stakeholders and reviews
  const [versions, setVersions] = useState([
    {
      id: 1,
      version: "v2.0",
      date: "2024-01-20",
      author: "John Doe",
      changes: "Updated procedures for warehouse management",
      status: "Published",
      file: null,
      fileName: "SOP_Warehouse_v2.pdf",
      stakeholders: [
        {
          id: 1,
          name: "Sarah Chen",
          email: "sarah.chen@example.com",
          role: "REVIEWER",
          status: "Approved",
          avatar: "https://i.pravatar.cc/40?img=1",
        },
        {
          id: 2,
          name: "Marcus Miller",
          email: "marcus.miller@example.com",
          role: "APPROVER",
          status: "Approved",
          avatar: "https://i.pravatar.cc/40?img=2",
        },
      ],
      reviews: [
        {
          id: 1,
          reviewer: "Sarah Chen",
          date: "2024-01-18",
          comment: "Looks good, approved for publication",
          status: "Approved",
        },
        {
          id: 2,
          reviewer: "Marcus Miller",
          date: "2024-01-19",
          comment: "Final approval granted",
          status: "Approved",
        },
      ],
    },
    {
      id: 2,
      version: "v1.0",
      date: "2023-12-15",
      author: "Jane Smith",
      changes: "Initial document creation",
      status: "Creation",
      file: null,
      fileName: "SOP_Warehouse_v1.pdf",
      stakeholders: [
        {
          id: 3,
          name: "John Doe",
          email: "john.doe@example.com",
          role: "REVIEWER",
          status: "Pending",
          avatar: "https://i.pravatar.cc/40?img=3",
        },
      ],
      reviews: [],
    },
  ]);

  useEffect(() => {
    if (isEdit) {
      // TODO: Fetch document data from API
      // fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`)
      //   .then((res) => res.json())
      //   .then((data) => setDocument(data))
      //   .catch((error) => console.error("Error fetching document:", error));

      // Sample data for now
      setDocument({
        documentID: "DOC-2024-001",
        name: "Standard Operating Procedure - Warehouse",
        status: "Published",
        description: "Guidelines for handling constituent materials in the main warehouse area.",
        category: "Logistics",
        currentVersion: "v2.0",
        file: null,
        fileName: "SOP_Warehouse_v2.pdf",
      });
    }
  }, [id, isEdit]);

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

  const getCurrentStageIndex = () => {
    return lifecycleStages.findIndex((stage) => stage.value === document.status);
  };

  const handleSave = async () => {
    if (!document.documentID || !document.name || !document.status) {
      toast.warning("Please fill all required fields");
      return;
    }

    if (!isEdit && !document.file) {
      toast.error("Please upload a document file");
      return;
    }

    if (!isEdit && initialStakeholders.length === 0) {
      toast.warning("Consider adding at least one stakeholder for the initial draft");
      // Allow saving without stakeholders, just show warning
    }

    try {
      if (isEdit) {
        // TODO: Update existing document
        // await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, {
        //   method: "PUT",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(document),
        // });
        toast.success("Document updated successfully");
      } else {
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
      }
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save document");
    }
  };

  const handleReject = () => {
    if (window.confirm("Are you sure you want to reject this document?")) {
      setDocument((prev) => ({ ...prev, status: "Rejected" }));
      toast.warning("Document rejected");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        // TODO: Delete document
        // await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, {
        //   method: "DELETE",
        // });
        toast.success("Document deleted successfully");
        navigate("/DocumentManagement");
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error("Failed to delete document");
      }
    }
  };

  // Handle saved data from modals
  const handleVersionSaved = (versionData) => {
    const version = {
      id: versions.length + 1,
      version: `v${versions.length + 1}.0`,
      date: new Date().toISOString().split("T")[0],
      author: "Current User",
      changes: versionData.changes,
      status: "Creation",
      file: versionData.file,
      fileName: versionData.file?.name || "",
      stakeholders: versionData.stakeholders || [],
      reviews: [],
    };
    setVersions([version, ...versions]);
    toast.success("Version created successfully");
  };

  const handleVersionUpdate = (versionId, updatedData) => {
    setVersions(versions.map(v => v.id === versionId ? { ...v, ...updatedData } : v));
    toast.success("Version updated successfully");
  };

  const handleVersionDelete = (versionId) => {
    const version = versions.find(v => v.id === versionId);
    const hasApprovedStakeholder = version?.stakeholders?.some(s => s.status === "Approved");
    
    if (hasApprovedStakeholder) {
      toast.error("Cannot delete version with approved stakeholders");
      return;
    }

    if (window.confirm("Are you sure you want to delete this version?")) {
      setVersions(versions.filter(v => v.id !== versionId));
      toast.success("Version deleted successfully");
    }
  };

  const handleVersionRowClick = (version) => {
    setSelectedVersion(version);
  };

  // Stakeholder management functions for initial document creation
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

  const currentStageIndex = getCurrentStageIndex();

  return (
    <>
      {/* <h2 className={styles.bHeading}>{isEdit ? "Document Management" : "Create New Document"}</h2> */}
      <Header title={isEdit ? "Document Management" : "Create New Document"} />
      <div className={styles.detailPage}>
        {/* Lifecycle Status Sidebar - Only show for existing documents */}
        {isEdit && (
          <div className={styles.lifecycleSidebar}>
          <WhiteIsland>
            <div className={styles.lifecycleStages}>
              {lifecycleStages.map((stage, index) => {
                const isCompleted = stage.step < currentStageIndex + 1;
                const isActive = stage.value === document.status;
                const isFuture = stage.step > currentStageIndex + 1;

                return (
                  <div
                    key={stage.step}
                    className={styles.stageWrapper}
                  >
                    <div className={styles.stageIndicator}>
                      <div
                        className={`${styles.stageCircle} ${
                          isCompleted ? styles.completedCircle : ""
                        } ${isActive ? styles.activeCircle : ""} ${
                          isFuture ? styles.futureCircle : ""
                        }`}
                      >
                        <div className={styles.innerDot}></div>
                      </div>
                      {index < lifecycleStages.length - 1 && (
                        <div
                          className={`${styles.connector} ${
                            isCompleted || isActive ? styles.activeConnector : ""
                          }`}
                        ></div>
                      )}
                    </div>
                    <div className={styles.stageContent}>
                      <div
                        className={`${styles.stageLabel} ${
                          isFuture ? styles.futureLabel : ""
                        }`}
                      >
                        {stage.label}
                      </div>
                      <div
                        className={`${styles.stageDescription} ${
                          isFuture ? styles.futureDescription : ""
                        }`}
                      >
                        {stage.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </WhiteIsland>
        </div>
        )}

        {/* Main Content */}
        <div className={styles.mainContent}>
          <WhiteIsland className={styles.documentIsland}>
            <h3>Document Info</h3>
            <div className={styles.main}>
              {/* Left side - File upload */}
              <div className={styles.picture}>
                <div className={styles.fileIcon}>
                  <FaFile size={48} color="#9ca3af" />
                </div>
                {!isEdit && (
                  <label className={styles.uploadButton}>
                    <FaUpload /> Upload File
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </label>
                )}
                {document.fileName && (
                  <div className={styles.fileName}>{document.fileName}</div>
                )}
              </div>

              {/* Right side - Form fields */}
              <div className={styles.detailContainer}>
                <div className={styles.details}>
                  <div className={styles.info}>
                    <div className={styles.infoDetail}>SAP Partner ID <span className={styles.required}>*</span></div>
                    <input
                      type="text"
                      name="documentID"
                      value={document.documentID}
                      onChange={handleChange}
                      placeholder="DOC-2024-001"
                      readOnly={isEdit}
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
                      readOnly={isEdit}
                    />
                  </div>

                  <div className={styles.info}>
                    <div className={styles.infoDetail}>Category <span className={styles.required}>*</span></div>
                    <select
                      name="category"
                      value={document.category}
                      onChange={handleChange}
                      disabled={isEdit}
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
                      readOnly={isEdit}
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
              {isEdit && (
                <button className={styles.rejectButton} onClick={handleReject}>
                  <FaTrash /> Delete
                </button>
              )}
              {/* <button className={styles.saveButton} onClick={handleSave}>
                <FaSave /> {isEdit ? "Save Changes" : "Create Document"}
              </button> */}
            </div>
          </WhiteIsland>

          {/* Versions Section (for existing documents) or Stakeholders Section (for new documents) */}
          {isEdit ? (
            <WhiteIsland className={styles.tabsSection}>
              <div className={styles.tabHeader}>
                <h3 style={{ margin: 20, fontSize: "18px", fontWeight: "600", color: "#374151" }}>
                  Versions
                </h3>
                <button
                  className={styles.addTabButton}
                  onClick={() => setActiveModal("versions")}
                >
                  <FaPlus /> Add Version
                </button>
              </div>

              <div className={styles.tabContent}>
                <div className={styles.versionsContent}>
                  <table className={styles.versionsTable}>
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Date</th>
                        <th>Author</th>
                        <th>Status</th>
                        <th>Changes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((version) => (
                        <tr 
                          key={version.id} 
                          onClick={() => handleVersionRowClick(version)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{version.version}</td>
                          <td>{version.date}</td>
                          <td>{version.author}</td>
                          <td>
                            <span className={styles.statusBadge} data-status={version.status}>
                              {version.status}
                            </span>
                          </td>
                          <td>{version.changes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          </WhiteIsland>
          ) : (
            /* Stakeholders Section for New Document */
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
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === "versions" && (
        <Modal onClose={() => setActiveModal(null)}>
          <VersionsForm
            onClose={() => setActiveModal(null)}
            documentID={id}
            currentVersionNumber={versions.length}
            onSaved={handleVersionSaved}
          />
        </Modal>
      )}

      {/* Version Details Modal */}
      {selectedVersion && (
        <Modal onClose={() => setSelectedVersion(null)}>
          <VersionDetailsModal
            version={selectedVersion}
            onClose={() => setSelectedVersion(null)}
            onUpdate={handleVersionUpdate}
            onDelete={handleVersionDelete}
          />
        </Modal>
      )}
    </>
  );
}
