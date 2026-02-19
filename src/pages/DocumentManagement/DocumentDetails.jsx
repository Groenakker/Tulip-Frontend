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
    fileName: "",
    fileUrl: "",
    files: [],
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
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

  const [versions, setVersions] = useState([]);

  useEffect(() => {
    if (!id || id === "add") return;
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}?include=versions,reviews`,
      { credentials: "include" }
    )
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Document not found");
          if (res.status === 403) throw new Error("Access denied");
          throw new Error("Failed to load document");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDocument({
          documentID: data.documentID ?? "",
          name: data.name ?? "",
          status: data.status ?? "Creation",
          description: data.description ?? "",
          category: data.category ?? "",
          currentVersion: data.currentVersion ?? "v1.0",
          fileName: data.fileName ?? "",
          fileUrl: data.fileUrl ?? "",
          files: Array.isArray(data.files) ? data.files : [],
        });
        const versionList = Array.isArray(data.versions) ? data.versions : [];
        setVersions(
          versionList.map((v) => ({
            id: v.id ?? v._id,
            version: v.version,
            date: v.date ? (typeof v.date === "string" ? v.date.split("T")[0] : v.date) : "",
            author: v.author ?? "",
            changes: v.changes ?? "",
            status: v.status ?? "Creation",
            fileName: v.fileName ?? "",
            fileUrl: v.fileUrl,
            files: Array.isArray(v.files) ? v.files : [],
            stakeholders: (v.stakeholders || []).map((s, i) => ({
              id: s._id ?? i,
              name: s.name,
              email: s.email,
              role: s.role,
              status: s.status ?? "Pending",
              avatar: s.avatar || `https://i.pravatar.cc/40?img=${i + 1}`,
            })),
            reviews: [],
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const getCurrentStageIndex = () => {
    return lifecycleStages.findIndex((stage) => stage.value === document.status);
  };

  const handleDelete = async () => {
    if (!id || id === "add") return;
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete document");
      }
      toast.success("Document deleted successfully");
      navigate("/DocumentManagement");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(error.message || "Failed to delete document");
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

  if (loading) {
    return (
      <>
        <Header title="Document Management" />
        <div className={styles.detailPage}>
          <div className={styles.mainContent}>
            <WhiteIsland>
              <p style={{ textAlign: "center", padding: "24px", color: "#6b7280" }}>Loading document…</p>
            </WhiteIsland>
          </div>
        </div>
      </>
    );
  }

  if (fetchError) {
    return (
      <>
        <Header title="Document Management" />
        <div className={styles.detailPage}>
          <div className={styles.mainContent}>
            <WhiteIsland>
              <p style={{ textAlign: "center", padding: "24px", color: "#dc2626" }}>{fetchError}</p>
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => navigate("/DocumentManagement")}
                  style={{
                    padding: "8px 16px",
                    background: "rgb(69 112 182)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Back to list
                </button>
              </div>
            </WhiteIsland>
          </div>
        </div>
      </>
    );
  }

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
                        className={`${styles.stageCircle} ${isCompleted ? styles.completedCircle : ""
                          } ${isActive ? styles.activeCircle : ""} ${isFuture ? styles.futureCircle : ""
                          }`}
                      >
                        <div className={styles.innerDot}></div>
                      </div>
                      {index < lifecycleStages.length - 1 && (
                        <div
                          className={`${styles.connector} ${isCompleted || isActive ? styles.activeConnector : ""
                            }`}
                        ></div>
                      )}
                    </div>
                    <div className={styles.stageContent}>
                      <div
                        className={`${styles.stageLabel} ${isFuture ? styles.futureLabel : ""
                          }`}
                      >
                        {stage.label}
                      </div>
                      <div
                        className={`${styles.stageDescription} ${isFuture ? styles.futureDescription : ""
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
              {/* Left side - Document file(s) */}
              <div className={styles.picture}>
                {(document.files?.length > 0 ? document.files : (document.fileName ? [{ fileName: document.fileName, fileUrl: document.fileUrl }] : [])).map((f, i) => (
                  <div key={i} style={{ marginBottom: i > 0 ? "12px" : 0 }}>
                    <div className={styles.fileName}>{f.fileName}</div>
                    {f.fileUrl && (
                      <a
                        href={f.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.fileLink}
                      >
                        Open file
                      </a>
                    )}
                  </div>
                ))}
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
