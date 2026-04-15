import React, { useEffect, useState } from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentDetails.module.css";
import { FaPlus, FaTrash, FaDownload, FaCheckCircle, FaArchive } from "react-icons/fa";
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
    owner: "",
  });

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);

  const lifecycleStages = [
    { step: 1, label: "Creation", value: "Creation", description: "Document is being created; add stakeholders to send for approval" },
    { step: 2, label: "Review", value: "Review", description: "Document is under review; stakeholders are approving" },
    { step: 3, label: "Approved", value: "Approved", description: "All approvers have approved; ready to publish" },
    { step: 4, label: "Update", value: "Update", description: "Document needs updates" },
    { step: 5, label: "Rejected", value: "Rejected", description: "Document was rejected" },
    { step: 6, label: "Published", value: "Published", description: "Document is published (final draft); no further edits" },
    { step: 7, label: "Archived", value: "Archived", description: "Document is archived" },
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

        // Extract owner name from various possible formats
        let ownerName = "";
        if (data.owner) {
          if (typeof data.owner === 'object' && data.owner !== null) {
            ownerName = data.owner.name || data.owner.username || "";
          } else if (typeof data.owner === 'string') {
            ownerName = data.owner;
          }
        }
        if (!ownerName && data.createdBy) {
          if (typeof data.createdBy === 'object' && data.createdBy !== null) {
            ownerName = data.createdBy.name || data.createdBy.username || "";
          } else if (typeof data.createdBy === 'string') {
            ownerName = data.createdBy;
          }
        }

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
          owner: ownerName,
        });
        const versionList = Array.isArray(data.versions) ? data.versions : [];
        setVersions(
          versionList.map((v) => ({
            id: v.id ?? v._id,
            version: v.version,
            date: v.date
              ? typeof v.date === "string"
                ? v.date.split("T")[0]
                : v.date
              : "",
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDocument((prev) => ({ ...prev, [name]: value }));
  };

  const getCurrentStageIndex = () => {
    return lifecycleStages.findIndex((stage) => stage.value === document.status);
  };

  const handleDelete = async () => {
    if (document.status === "Review") {
      toast.error("Cannot delete document while it's under review. Wait for approval or rejection.");
      return;
    }
    if (document.status === "Published" || document.status === "Archived") {
      toast.error("Cannot delete a published or archived document.");
      return;
    }

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
    if (versionData && versionData.id) {
      setVersions((prev) => [
        {
          id: versionData.id,
          version: versionData.version,
          date: versionData.date
            ? typeof versionData.date === "string"
              ? versionData.date.split("T")[0]
              : versionData.date
            : "",
          author: versionData.author ?? "",
          changes: versionData.changes ?? "",
          status: versionData.status ?? "Creation",
          fileName: versionData.fileName ?? "",
          fileUrl: versionData.fileUrl,
          files: versionData.files || [],
          stakeholders: (versionData.stakeholders || []).map((s, i) => ({
            id: s._id ?? i,
            name: s.name,
            email: s.email,
            role: s.role,
            status: s.status ?? "Pending",
            avatar: s.avatar || `https://i.pravatar.cc/40?img=${i + 1}`,
          })),
          reviews: [],
        },
        ...prev,
      ]);
    }
  };

  const handleVersionUpdate = (versionId, updatedData) => {
    if (!isDocumentEditable) {
      toast.error("Cannot update version while document is under review or published.");
      return;
    }
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

    // Prevent deletion if document is in Review or Published/Archived
    if (document.status === "Review") {
      toast.error("Cannot delete version while document is under review");
      return;
    }
    if (document.status === "Published" || document.status === "Archived") {
      toast.error("Cannot delete version of a published or archived document");
      return;
    }

    if (window.confirm("Are you sure you want to delete this version?")) {
      setVersions(versions.filter(v => v.id !== versionId));
      toast.success("Version deleted successfully");
    }
  };

  const handleStakeholderAdded = (versionId, newStakeholder, newDocumentStatus, newVersionStatus) => {
    setVersions((prev) =>
      prev.map((v) =>
        v.id === versionId
          ? {
              ...v,
              stakeholders: [...(v.stakeholders || []), newStakeholder],
              ...(newVersionStatus ? { status: newVersionStatus } : {}),
            }
          : v
      )
    );
    setSelectedVersion((prev) => {
      if (!prev || prev.id !== versionId) return prev;
      return {
        ...prev,
        stakeholders: [...(prev.stakeholders || []), newStakeholder],
        ...(newVersionStatus ? { status: newVersionStatus } : {}),
      };
    });
    if (newDocumentStatus && newDocumentStatus !== document.status) {
      setDocument((prev) => ({ ...prev, status: newDocumentStatus }));
    }
  };

  const handleVersionRowClick = (version) => {
    setSelectedVersion(version);
  };

  const handleAddVersionClick = () => {
    if (!isDocumentEditable) {
      toast.error(
        document.status === "Published" || document.status === "Archived"
          ? "Cannot add versions to a published or archived document."
          : "Cannot add version while document is under review."
      );
      return;
    }
    setActiveModal("versions");
  };

  const handleDownloadVersion = async (e, version) => {
    e.stopPropagation(); // Prevent row click event

    if (!version.files?.length && !version.fileName) {
      toast.error("No file available for download");
      return;
    }

    try {
      // If there are files from the upload
      if (version.files?.length > 0) {
        // Download the first file (or modify to download all)
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

  const currentStageIndex = getCurrentStageIndex();

  // Editable only in Creation, Update, or Rejected. Not editable in Review, Published, or Archived.
  const isDocumentEditable = ["Creation", "Update", "Rejected"].includes(document.status);

  // Publish: only when all APPROVER-role stakeholders on the latest version have approved
  const latestVersion = versions[0];
  const approverStakeholders = (latestVersion?.stakeholders || []).filter(
    (s) => (s.role || "").toUpperCase() === "APPROVER"
  );
  const allApproversApproved =
    approverStakeholders.length > 0 &&
    approverStakeholders.every((s) => (s.status || "").toLowerCase() === "approved");
  const canPublish = ["Review", "Approved"].includes(document.status) && allApproversApproved;

  const handlePublish = async () => {
    if (!canPublish || !id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Published" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to publish document");
        return;
      }
      toast.success("Document published. It is now final and no longer editable.");
      setDocument((prev) => ({ ...prev, status: "Published" }));
      setVersions((prev) =>
        prev.map((v, i) => (i === 0 ? { ...v, status: "Published" } : v))
      );
    } catch (error) {
      console.error("Error publishing document:", error);
      toast.error("Failed to publish document");
    }
  };

  const handleArchive = async () => {
    if (document.status !== "Published" || !id) return;
    if (!window.confirm("Are you sure you want to archive this document? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Archived" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Failed to archive document");
        return;
      }
      toast.success("Document archived successfully.");
      setDocument((prev) => ({ ...prev, status: "Archived" }));
    } catch (error) {
      console.error("Error archiving document:", error);
      toast.error("Failed to archive document");
    }
  };

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
                      onChange={handleChange}
                      placeholder="Document name"
                      readOnly={!isDocumentEditable}
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
                      disabled={!isDocumentEditable}
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
                    <div className={styles.infoDetail}>Status</div>
                    <input
                      type="text"
                      name="status"
                      value={document.status}
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

                <div className={styles.details}>
                  <div className={styles.info} style={{ flex: 1 }}>
                    <div className={styles.infoDetail}>Description</div>
                    <input
                      type="text"
                      name="description"
                      value={document.description}
                      onChange={handleChange}
                      placeholder="Document description"
                      readOnly={!isDocumentEditable}
                    />
                  </div>
                </div>
              </div>
            </div>

            {document.status === "Review" && (
              <div style={{
                padding: "12px 16px",
                background: "#fef3c7",
                border: "1px solid #fbbf24",
                borderRadius: "8px",
                color: "#92400e",
                fontSize: "14px",
                fontWeight: "500",
                marginTop: "16px",
              }}>
                <strong>Document Under Review:</strong> This document is sent for approval.
                Editing, deleting, and version management are disabled until all approvers approve or reject.
              </div>
            )}
            {document.status === "Approved" && (
              <div style={{
                padding: "12px 16px",
                background: "#dbeafe",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                color: "#1e40af",
                fontSize: "14px",
                fontWeight: "500",
                marginTop: "16px",
              }}>
                <strong>All Approvers Approved!</strong> This document version has been approved by all required approvers.
                You can now publish it using the Publish button below.
              </div>
            )}
            {(document.status === "Published" || document.status === "Archived") && (
              <div style={{
                padding: "12px 16px",
                background: "#d1fae5",
                border: "1px solid #10b981",
                borderRadius: "8px",
                color: "#065f46",
                fontSize: "14px",
                fontWeight: "500",
                marginTop: "16px",
              }}>
                <strong>Final draft.</strong> This document is {document.status === "Published" ? "published" : "archived"} and cannot be edited. No further versions can be added.
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              {canPublish && (
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={handlePublish}
                  style={{
                    padding: "10px 20px",
                    background: "#10b981",
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
                  <FaCheckCircle /> Publish
                </button>
              )}
              {document.status === "Published" && (
                <button
                  type="button"
                  onClick={handleArchive}
                  style={{
                    padding: "10px 20px",
                    background: "#6b7280",
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
                  <FaArchive /> Archive
                </button>
              )}
              <button
                className={styles.deleteButton}
                onClick={handleDelete}
                disabled={!isDocumentEditable}
                style={{
                  padding: "10px 20px",
                  background: isDocumentEditable ? "#ef4444" : "#d1d5db",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: isDocumentEditable ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "500",
                  opacity: isDocumentEditable ? 1 : 0.6,
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
                onClick={handleAddVersionClick}
                disabled={!isDocumentEditable}
                style={{
                  cursor: isDocumentEditable ? "pointer" : "not-allowed",
                  opacity: isDocumentEditable ? 1 : 0.6,
                  background: isDocumentEditable ? undefined : "#d1d5db",
                }}
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
                      <th>Actions</th>
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
                        <td>
                          <button
                            onClick={(e) => handleDownloadVersion(e, version)}
                            style={{
                              padding: "6px 12px",
                              background: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "13px",
                              fontWeight: "500",
                            }}
                            title={`Download ${version.fileName || version.version}`}
                          >
                            <FaDownload /> Download
                          </button>
                        </td>
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
            documentId={id}
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
            documentId={id}
            onClose={() => setSelectedVersion(null)}
            onUpdate={handleVersionUpdate}
            onDelete={handleVersionDelete}
            onStakeholderAdded={handleStakeholderAdded}
            isDocumentEditable={isDocumentEditable}
          />
        </Modal>
      )}
    </>
  );
}
