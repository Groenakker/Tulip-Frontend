import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import styles from "./StakeholderApproval.module.css";
import { FaCheckCircle, FaTimesCircle, FaFileAlt, FaUser } from "react-icons/fa";
import SignatureCanvas from "react-signature-canvas";

export default function StakeholderApproval() {
  const { token } = useParams();
  const [stakeholderData, setStakeholderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const signatureRef = useRef(null);

  const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api`;

  const fetchStakeholderData = async () => {
    if (!token) {
      setStakeholderData(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/stakeholder-approval/${token}`, {
        credentials: "omit",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStakeholderData(null);
        setLoading(false);
        return;
      }
      setStakeholderData(data);
    } catch (error) {
      console.error("Error fetching stakeholder data:", error);
      setStakeholderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStakeholderData();
  }, [token]);

  const handleApprove = () => {
    if (stakeholderData.stakeholder.status !== "Pending") {
      return;
    }
    setShowSignatureModal(true);
  };

  const handleReject = () => {
    if (stakeholderData.stakeholder.status !== "Pending") {
      return;
    }
    setShowRejectModal(true);
  };

  const submitApproval = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert("Please provide your signature");
      return;
    }

    setSubmitting(true);
    try {
      const signatureData = signatureRef.current.toDataURL();
      const response = await fetch(`${API_BASE}/stakeholder-approval/${token}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ signature: signatureData }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.message || "Failed to submit approval");
        setSubmitting(false);
        return;
      }
      setStakeholderData((prev) => ({
        ...prev,
        stakeholder: {
          ...prev.stakeholder,
          status: "Approved",
          approvedAt: new Date().toISOString(),
          signature: signatureData,
        },
      }));
      setShowSignatureModal(false);
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert("Failed to submit approval");
    } finally {
      setSubmitting(false);
    }
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/stakeholder-approval/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data.message || "Failed to submit rejection");
        setSubmitting(false);
        return;
      }
      setStakeholderData((prev) => ({
        ...prev,
        stakeholder: {
          ...prev.stakeholder,
          status: "Rejected",
          rejectedAt: new Date().toISOString(),
          rejectionReason: rejectionReason.trim(),
        },
      }));
      setShowRejectModal(false);
    } catch (error) {
      console.error("Error submitting rejection:", error);
      alert("Failed to submit rejection");
    } finally {
      setSubmitting(false);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading approval request...</p>
      </div>
    );
  }

  if (!stakeholderData) {
    return (
      <div className={styles.errorContainer}>
        <FaTimesCircle size={64} color="#ef4444" />
        <h2>Invalid or Expired Link</h2>
        <p>This approval link is invalid or has expired.</p>
      </div>
    );
  }

  const { stakeholder, version, document } = stakeholderData;
  const isPending = stakeholder.status === "Pending";
  const isApproved = stakeholder.status === "Approved";
  const isRejected = stakeholder.status === "Rejected";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Document Approval Request</h1>
        <p>You have been requested to review and approve the following document</p>
      </div>

      <div className={styles.content}>
        {/* Stakeholder Info Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FaUser />
            <h2>Your Information</h2>
          </div>
          <div className={styles.stakeholderInfo}>
            <img src={stakeholder.avatar} alt={stakeholder.name} className={styles.avatar} />
            <div className={styles.stakeholderDetails}>
              <div className={styles.stakeholderName}>{stakeholder.name}</div>
              <div className={styles.stakeholderEmail}>{stakeholder.email}</div>
              <div className={styles.stakeholderRole}>
                <span className={styles.roleLabel}>Role:</span>
                <span className={styles.roleBadge}>{stakeholder.role}</span>
              </div>
              <div className={styles.stakeholderStatus}>
                <span className={styles.statusLabel}>Status:</span>
                <span
                  className={styles.statusBadge}
                  data-status={stakeholder.status}
                >
                  {stakeholder.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Viewer */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <FaFileAlt />
            <h2>Document: {document.name}</h2>
          </div>
          <div className={styles.documentViewer}>
            <iframe
              src={document.fileUrl}
              title={document.fileName}
              className={styles.documentFrame}
            />
          </div>
        </div>

        {/* Action Buttons or Status Message */}
        <div className={styles.actionSection}>
          {isPending && (
            <>
              <p className={styles.actionMessage}>
                Please review the document and provide your decision below
              </p>
              <div className={styles.actionButtons}>
                <button className={styles.approveButton} onClick={handleApprove}>
                  <FaCheckCircle /> Approve with E-Signature
                </button>
                <button className={styles.rejectButton} onClick={handleReject}>
                  <FaTimesCircle /> Reject
                </button>
              </div>
            </>
          )}

          {isApproved && (
            <div className={styles.statusMessage} data-type="approved">
              <FaCheckCircle size={36} />
              <h3>Document Approved</h3>
              <p>You approved this document on {new Date(stakeholder.approvedAt).toLocaleString()}</p>
              {stakeholder.signature && (
                <div className={styles.signatureDisplay}>
                  <p>Your Signature:</p>
                  <img src={stakeholder.signature} alt="Signature" />
                </div>
              )}
            </div>
          )}

          {isRejected && (
            <div className={styles.statusMessage} data-type="rejected">
              <FaTimesCircle size={36} />
              <h3>Document Rejected</h3>
              <p>You rejected this document on {new Date(stakeholder.rejectedAt).toLocaleString()}</p>
              {stakeholder.rejectionReason && (
                <div className={styles.rejectionReason}>
                  <p><strong>Reason:</strong></p>
                  <p>{stakeholder.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* E-Signature Modal */}
      {showSignatureModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Approve with E-Signature</h2>
            <p>Please sign below to approve this document</p>
            
            <div className={styles.signatureContainer}>
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: styles.signatureCanvas,
                }}
              />
            </div>
            
            <div className={styles.signatureActions}>
              <button onClick={clearSignature} className={styles.clearButton}>
                Clear Signature
              </button>
            </div>

            <div className={styles.modalButtons}>
              <button 
                onClick={submitApproval} 
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Approval"}
              </button>
              <button 
                onClick={() => setShowSignatureModal(false)} 
                className={styles.cancelButton}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Reject Document</h2>
            <p>Please provide a reason for rejecting this document</p>
            
            <textarea
              className={styles.rejectionTextarea}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter your reason for rejection..."
              rows={5}
            />

            <div className={styles.modalButtons}>
              <button 
                onClick={submitRejection} 
                className={styles.submitRejectButton}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Rejection"}
              </button>
              <button 
                onClick={() => setShowRejectModal(false)} 
                className={styles.cancelButton}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
