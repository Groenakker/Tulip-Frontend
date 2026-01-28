import React, { useEffect, useState } from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentDetails.module.css";
import { FaSave, FaUpload, FaFile, FaPlus } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import toast from "../../components/Toaster/toast";
import Modal from "../../components/Modal";
import ReviewsForm from "../../components/modals/ReviewsForm";
import VersionsForm from "../../components/modals/VersionsForm";
import VersionDetailsModal from "../../components/modals/VersionDetailsModal";

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

  const [activeTab, setActiveTab] = useState("Reviews");
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

  // Sample versions data with stakeholders
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
    },
  ]);

  // Sample reviews data
  const [reviews, setReviews] = useState([
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
        // TODO: Create new document
        // await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(document),
        // });
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
  const handleReviewSaved = (reviewData) => {
    const review = {
      id: reviews.length + 1,
      reviewer: reviewData.reviewer,
      date: new Date().toISOString().split("T")[0],
      comment: reviewData.comment,
      status: reviewData.status,
    };
    setReviews([...reviews, review]);
    toast.success("Review added successfully");
  };

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
      <h2 className={styles.bHeading}>Document Management</h2>
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
              <button className={styles.rejectButton} onClick={handleReject}>
                Reject
              </button>
              <button className={styles.saveButton} onClick={handleSave}>
                <FaSave /> Save Changes
              </button>
            </div>
          </WhiteIsland>

          {/* Tabs Section */}
          <WhiteIsland className={styles.tabsSection}>
            <div className={styles.tabHeader}>
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === "Reviews" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("Reviews")}
                >
                  Reviews
                </button>
                <button
                  className={`${styles.tab} ${activeTab === "Versions" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("Versions")}
                >
                  Versions
                </button>
              </div>
              <button
                className={styles.addTabButton}
                onClick={() => setActiveModal(activeTab.toLowerCase())}
              >
                <FaPlus /> Add {activeTab === "Versions" ? "Version" : "Review"}
              </button>
            </div>

            <div className={styles.tabContent}>
              {/* Versions Tab */}
              {activeTab === "Versions" && (
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
              )}

              {/* Reviews Tab */}
              {activeTab === "Reviews" && (
                <div className={styles.reviewsContent}>
                  {reviews.map((review) => (
                    <div key={review.id} className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div>
                          <strong>{review.reviewer}</strong>
                          <span className={styles.reviewDate}> • {review.date}</span>
                        </div>
                        <span
                          className={`${styles.reviewStatus} ${
                            review.status === "Approved"
                              ? styles.statusApproved
                              : review.status === "Rejected"
                              ? styles.statusRejected
                              : styles.statusPending
                          }`}
                        >
                          {review.status}
                        </span>
                      </div>
                      <div className={styles.reviewComment}>{review.comment}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </WhiteIsland>
        </div>
      </div>

      {/* Modals */}
      {activeModal && (
        <Modal onClose={() => setActiveModal(null)}>
          {activeModal === "reviews" && (
            <ReviewsForm
              onClose={() => setActiveModal(null)}
              documentID={id}
              onSaved={handleReviewSaved}
            />
          )}
          {activeModal === "versions" && (
            <VersionsForm
              onClose={() => setActiveModal(null)}
              documentID={id}
              currentVersionNumber={versions.length}
              onSaved={handleVersionSaved}
            />
          )}
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
