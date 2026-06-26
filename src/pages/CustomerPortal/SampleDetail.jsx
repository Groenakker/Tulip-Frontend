import React, { useEffect, useRef, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { FaExclamationCircle, FaTimesCircle, FaCheckCircle } from "react-icons/fa";
import styles from "./portal.module.css";
import wizStyles from "./sampleWizard.module.css";
import SampleWizard from "./SampleWizard";
import { StatusPill } from "./Dashboard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// =================================================================
// Customer-facing sample detail view.
//
// The body uses the same five-step wizard the customer sees when
// creating a sample, but in read-only mode — so an internal user who
// drafted a submission and asked the customer to "review and sign"
// sees the same fields they entered. Below the wizard:
//
//   1. Action-required banner (when status=Submitted and unsigned)
//   2. Approval / signature panel
//   3. Unified Test Status (Lab Studies + legacy Test Orders)
//
// The sample status from the internal system (Draft / Submitted /
// Accepted / Completed / On Hold / Rejected / Cancelled) is shown
// in the header pill so the customer always knows where their
// submission stands.
// =================================================================

export default function CustomerSampleDetail() {
  const { id } = useParams();
  // `refreshCounts` is provided by the CustomerLayout outlet — calling
  // it after a successful approve/reject re-pulls the dashboard
  // summary so the sidebar's "Samples awaiting your approval" red dot
  // updates immediately instead of waiting for a navigation.
  const outletCtx = useOutletContext();
  const refreshCounts = outletCtx?.refreshCounts;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState("");
  const [printedName, setPrintedName] = useState("");
  const [step, setStep] = useState(0);
  // Reject flow state. Opened by the "Reject" button next to "Approve & sign".
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const sigRef = useRef();

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/portal/customer/samples/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      setData(await res.json());
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (error) return <div className={styles.formError}>{error}</div>;
  if (!data) return null;

  const { sample, testOrderLines, labStudies } = data;

  // The customer needs to take action when the sample is open, hasn't
  // been signed yet, and hasn't been rejected. We deliberately don't
  // gate on a specific sample.status anymore — the internal app
  // routinely creates samples in "Draft" state and the customer still
  // needs to approve them. The internal samples controller now sets
  // `customerActionRequired` on any lab-created, BP-linked, unsigned
  // sample, but we re-derive the same condition here as a UI fallback
  // so the banner shows even if a record was created before that
  // backend change landed.
  const isRejected = Boolean(sample.customerRejectedAt);
  const isApproved = Boolean(sample.customerSignatureImage);
  const isClosed = sample.recordStatus === "Closed";
  const needsAction = !isApproved && !isRejected && !isClosed;

  const submitSig = async () => {
    setSignError("");
    if (!printedName.trim()) return setSignError("Please print your name.");
    if (!sigRef.current || sigRef.current.isEmpty()) return setSignError("Please sign in the box.");
    setSigning(true);
    try {
      const signatureImage = sigRef.current.toDataURL("image/png");
      const res = await fetch(`${API_BASE_URL}/portal/customer/samples/${id}/sign`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureImage, name: printedName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      await reload();
      refreshCounts?.();
    } catch (err) {
      setSignError(err.message || "Failed to submit");
    } finally {
      setSigning(false);
    }
  };

  const submitReject = async () => {
    setRejectError("");
    if (!rejectReason.trim()) {
      return setRejectError(
        "Please tell us briefly why you're rejecting — the lab will use this to fix and re-submit."
      );
    }
    setRejecting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/portal/customer/samples/${id}/reject`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason.trim() }),
        }
      );
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      setShowReject(false);
      setRejectReason("");
      await reload();
      refreshCounts?.();
    } catch (err) {
      setRejectError(err.message || "Failed to reject");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>
        {sample.sampleCode} <StatusPill value={sample.status} />
      </h1>
      <p className={styles.pageSub}>
        {sample.name || sample.sampleDescription || "Sample submission form"}
      </p>

      {/* Action-required banner. Shows whenever the customer still
          needs to approve or reject — regardless of the sample's
          internal status, because the lab routinely opens samples
          in "Draft" before flipping them to "Submitted" and the
          customer needs to act either way. */}
      {needsAction && (
        <div className={wizStyles.actionBanner}>
          <div className={wizStyles.actionBannerIcon}>
            <FaExclamationCircle />
          </div>
          <div className={wizStyles.actionBannerBody}>
            <h3>Action required — please review and approve or reject</h3>
            <p>
              The lab has prepared this submission for you. Please review every step.
              When you're done, scroll down to <strong>approve &amp; sign</strong> — or{" "}
              <strong>reject</strong> with a reason so the lab can fix and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* Already-rejected banner. Stays visible until the lab clears
          the rejection (by re-opening / re-submitting), so the
          customer can see what they said. */}
      {isRejected && (
        <div
          className={wizStyles.actionBanner}
          style={{
            borderColor: "#fecaca",
            background: "linear-gradient(180deg, #fff7f7 0%, #ffffff 80%)",
          }}
        >
          <div className={wizStyles.actionBannerIcon}>
            <FaTimesCircle />
          </div>
          <div className={wizStyles.actionBannerBody}>
            <h3>You rejected this submission</h3>
            <p>
              {sample.customerRejectionReason
                ? `Reason: “${sample.customerRejectionReason}”`
                : "No reason was provided."}
              {sample.customerRejectedAt && (
                <>
                  {" "}— on {new Date(sample.customerRejectedAt).toLocaleString()}.
                </>
              )}{" "}
              The lab has been notified.
            </p>
          </div>
        </div>
      )}

      {/* The 5-step wizard, read-only. The customer can flip through
          every section the lab filled in. */}
      <SampleWizard
        sample={sample}
        readOnly
        step={step}
        setStep={setStep}
      />

      {/* Approval / signature panel. */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Your approval</h2>
          {isApproved && (
            <span className={`${styles.pill} ${styles.pillGreen}`}>
              <FaCheckCircle style={{ marginRight: 4 }} /> Approved
            </span>
          )}
          {isRejected && (
            <span className={`${styles.pill} ${styles.pillRed}`}>
              <FaTimesCircle style={{ marginRight: 4 }} /> Rejected
            </span>
          )}
        </div>
        {isApproved ? (
          <div>
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>
              Approved by <strong>{sample.customerApprovalName || "—"}</strong>
              {sample.customerApprovalDate
                ? ` on ${new Date(sample.customerApprovalDate).toLocaleString()}`
                : ""}
            </div>
            <div className={styles.sigBox}>
              <img
                src={sample.customerSignatureImage}
                alt="Customer signature"
                className={styles.sigImg}
              />
            </div>
          </div>
        ) : isRejected ? (
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            You rejected this submission on{" "}
            {sample.customerRejectedAt
              ? new Date(sample.customerRejectedAt).toLocaleString()
              : "—"}
            . The lab will fix the issue and resubmit for review.
          </div>
        ) : needsAction ? (
          <>
            <p style={{ color: "#6b7280", marginTop: 0 }}>
              Please review the submission above and either{" "}
              <strong>approve &amp; sign</strong> so the lab can begin, or{" "}
              <strong>reject</strong> with a short reason.
            </p>
            <div className={styles.formField} style={{ maxWidth: 320 }}>
              <label>Printed name</label>
              <input
                value={printedName}
                onChange={(e) => setPrintedName(e.target.value)}
              />
            </div>
            <div className={styles.sigBox} style={{ maxWidth: 480 }}>
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{
                  width: 460,
                  height: 140,
                  style: { width: "100%", background: "#fff", borderRadius: 6 },
                }}
              />
            </div>
            {signError && <div className={styles.formError}>{signError}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => sigRef.current && sigRef.current.clear()}
              >
                Clear
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={signing || rejecting}
                onClick={submitSig}
              >
                {signing ? "Submitting…" : "Approve & sign"}
              </button>
              {/* Reject as a clearly-secondary, destructive-looking
                  button so it doesn't compete with Approve but is
                  always reachable. */}
              <button
                type="button"
                disabled={signing || rejecting}
                onClick={() => {
                  setShowReject(true);
                  setRejectError("");
                }}
                style={{
                  background: "#ffffff",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: signing || rejecting ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FaTimesCircle /> Reject submission
              </button>
            </div>
          </>
        ) : (
          <p style={{ color: "#6b7280" }}>Signature not required at this time.</p>
        )}
      </div>

      {/* Reject reason modal */}
      {showReject && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !rejecting) setShowReject(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 22,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 24px 50px rgba(0,0,0,0.18)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17, color: "#1f2937" }}>
              Reject this submission?
            </h3>
            <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
              The lab will see your reason and use it to fix the submission and ask you
              to review again.
            </p>
            <div className={styles.formField} style={{ marginTop: 12 }}>
              <label>Reason</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. The lot number is wrong, please correct it and resubmit."
              />
            </div>
            {rejectError && (
              <div className={styles.formError}>{rejectError}</div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className={styles.btnGhost}
                disabled={rejecting}
                onClick={() => setShowReject(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={submitReject}
                style={{
                  background: "#b91c1c",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: "inherit",
                  cursor: rejecting ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {rejecting ? "Rejecting…" : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test status — Lab Studies (preferred) + legacy Test Orders. */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Test status</h2>
        </div>

        {labStudies && labStudies.length > 0 ? (
          <div>
            {labStudies.map((ls) => (
              <div key={ls._id} className={wizStyles.studyCard}>
                <div>
                  <div className={wizStyles.studyCode}>
                    {ls.studyCode} · {ls.testCode || "—"}
                  </div>
                  {ls.testDescription && (
                    <div
                      style={{ fontSize: 13, color: "#4b5563", marginTop: 2 }}
                    >
                      {ls.testDescription}
                    </div>
                  )}
                  <div className={wizStyles.studyMeta}>
                    {ls.vendorBpName && <span>Lab: <strong>{ls.vendorBpName}</strong></span>}
                    {ls.category && <span>Category: {ls.category}</span>}
                    {ls.quality && <span>{ls.quality}</span>}
                    {ls.completedAt && (
                      <span>
                        Completed:{" "}
                        {new Date(ls.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {ls.instanceCount > 0 && (
                    <div className={wizStyles.studyChips}>
                      {ls.instanceCodes.slice(0, 6).map((c, i) => (
                        <span key={i} className={wizStyles.studyChip}>
                          {c}
                        </span>
                      ))}
                      {ls.instanceCodes.length > 6 && (
                        <span className={wizStyles.studyChip}>
                          +{ls.instanceCodes.length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={wizStyles.studySide}>
                  <StatusPill value={ls.status} />
                  {ls.reportFileUrl && (
                    <a
                      href={ls.reportFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={wizStyles.studyReport}
                    >
                      {ls.reportFileName || "Download report"}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : testOrderLines?.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Completed</th>
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {testOrderLines.map((l, i) => (
                <tr key={i}>
                  <td>{l.testCode || "—"}</td>
                  <td>{l.vendorBpName || "—"}</td>
                  <td>
                    <StatusPill value={l.status} />
                  </td>
                  <td>
                    {l.completedAt
                      ? new Date(l.completedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    {l.reportFileUrl ? (
                      <a href={l.reportFileUrl} target="_blank" rel="noreferrer">
                        {l.reportFileName || "Download"}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.empty}>
            No tests have been assigned to a lab yet. Status will appear here once
            the lab assigns a vendor and instances.
          </div>
        )}
      </div>
    </>
  );
}
