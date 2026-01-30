import React, { useEffect, useState } from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentDetails.module.css";
import { FaPlus, FaTrash } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import toast from "../../components/Toaster/toast";
import Modal from "../../components/Modal";
import VersionsForm from "../../components/modals/VersionsForm";
import VersionDetailsModal from "../../components/modals/VersionDetailsModal";
import Header from '../../components/Header';

export default function DocumentDetails() {
  const { id } = useParams();
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

  const [activeModal, setActiveModal] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);

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
  }, [id]);

  const getCurrentStageIndex = () => {
    return lifecycleStages.findIndex((stage) => stage.value === document.status);
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

  const currentStageIndex = getCurrentStageIndex();

  return (
    <>
      <Header title="Document Management" />
      <div className={styles.detailPage}>
        {/* Lifecycle Status Sidebar */}
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

        {/* Main Content */}
        <div className={styles.mainContent}>
          <WhiteIsland className={styles.documentIsland}>
            <h3>Document Info</h3>
            <div className={styles.main}>
              {/* Left side - Document icon */}
              <div className={styles.picture}>
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
                      placeholder="DOC-2024-001"
                      readOnly
                    />
                  </div>

                  <div className={styles.info} style={{ flex: 2 }}>
                    <div className={styles.infoDetail}>Name <span className={styles.required}>*</span></div>
                    <input
                      type="text"
                      name="name"
                      value={document.name}
                      placeholder="Document name"
                      readOnly
                    />
                  </div>

                  <div className={styles.info}>
                    <div className={styles.infoDetail}>Category <span className={styles.required}>*</span></div>
                    <select
                      name="category"
                      value={document.category}
                      disabled
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
                      disabled
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
                      placeholder="Document description"
                      readOnly
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
              <button 
                className={styles.deleteButton} 
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
                <FaTrash /> Delete
              </button>
            </div>
          </WhiteIsland>

          {/* Versions Section */}
          <WhiteIsland className={styles.tabsSection}>
            <div className={styles.tabHeader}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#374151" }}>
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
