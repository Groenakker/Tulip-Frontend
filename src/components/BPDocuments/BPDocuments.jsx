import React, { useEffect, useRef, useState } from "react";
import {
  FaUpload,
  FaTrash,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileAlt,
  FaEye,
  FaCheckCircle,
  FaWpforms,
} from "react-icons/fa";
import styles from "./BPDocuments.module.css";
import builderStyles from "../FormBuilder/FormBuilder.module.css";
import toast from "../Toaster/toast";
import FormBuilder from "../FormBuilder/FormBuilder";

// Sample / TRF documents attached to a Business Partner. Lives
// inside the "Sample Documents" tab on the BP detail page (the
// tabbed-table neighbour of Projects / Contacts / Test Codes).
//
// Behaviour:
//   - Users can upload multiple versions of a sample document.
//   - Exactly one document is the "current working version" at a
//     time. Uploading a new file promotes it to current
//     automatically; users can also flip a radio button to make
//     an older upload current again.
//   - The current document is the one Sample Submission mines
//     for candidate custom fields, and the one the Shipping Log
//     surfaces when the user prints BP documents.
//
// `canEdit` gates upload / delete / set-current so view-only
// users still get the list and preview.
//
// Props:
//   bPartnerID  - the BP _id (required when not in add-mode)
//   canEdit     - boolean
//   onDocumentsChanged - called after any add/delete with the
//                        latest documents array (used by Pdetail
//                        to refresh related counts and by the
//                        Shipping Log to keep cached data fresh).
export default function BPDocuments({
  bPartnerID,
  bPartnerName,
  canEdit,
  onDocumentsChanged,
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingCurrentId, setSettingCurrentId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    if (!bPartnerID) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/documents`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const docs = data.documents || [];
      setDocuments(docs);
      onDocumentsChanged?.(docs);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bPartnerID]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!bPartnerID) {
      toast.error("Save the partner before uploading documents.");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/documents`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      toast.success(
        `Uploaded and set as current version (scanned ${data.document.detectedFields?.length || 0} fields)`
      );
      await fetchDocuments();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSetCurrent = async (docId) => {
    if (!docId) return;
    setSettingCurrentId(docId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/documents/${docId}/current`,
        { method: "PUT", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      toast.success("Marked as current working version");
      await fetchDocuments();
    } catch (err) {
      toast.error("Failed to set current: " + err.message);
    } finally {
      setSettingCurrentId(null);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/documents/${docId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Delete failed");
      }
      toast.success("Document deleted");
      await fetchDocuments();
    } catch (err) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const handlePreview = (doc) => {
    setPreviewDoc(doc);
  };

  const formatBytes = (b) => {
    if (!b) return "-";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : "-");

  const iconFor = (mimeType = "", filename = "") => {
    const name = (filename || "").toLowerCase();
    if (mimeType.includes("pdf") || name.endsWith(".pdf")) return <FaFilePdf style={{ color: "#dc2626" }} />;
    if (mimeType.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return <FaFileWord style={{ color: "#2563eb" }} />;
    if (mimeType.includes("sheet") || mimeType.includes("excel") || name.endsWith(".xls") || name.endsWith(".xlsx")) return <FaFileExcel style={{ color: "#16a34a" }} />;
    return <FaFileAlt />;
  };

  if (!bPartnerID) {
    return (
      <div className={styles.notice}>
        Save the Business Partner first to attach sample documents.
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Upload bar: only an upload action. The picked file
          becomes the new "current working version" on the BP,
          superseding whichever one was current before. Older
          uploads stay in the list as version history so the user
          can flip back to them if needed. */}
      {canEdit && (
        <div className={styles.uploadBar}>
          <div className={styles.uploadControls}>
            <div className={styles.uploadHeading}>
              <div className={styles.uploadTitle}>Upload sample document</div>
              <div className={styles.uploadSubtitle}>
                The uploaded file becomes this partner&apos;s current working version.
              </div>
            </div>
            <label className={styles.uploadButton}>
              <FaUpload /> {uploading ? "Uploading..." : "Upload Document"}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.xlsm,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: "none" }}
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <div className={styles.hint}>
            Supported: PDF, DOC, DOCX, XLS, XLSX (max 15 MB). Detected fields
            from the current version flow into Sample Submission, and the
            current version is what prints from the Shipping Log.
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className={styles.empty}>
          No documents uploaded yet. Upload a sample document so it can be
          printed from the Shipping Log and so its fields can be pulled into
          Sample Submission.
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 70, textAlign: "center" }}>Current</th>
              <th style={{ width: 32 }} />
              <th>File</th>
              <th style={{ width: 110 }}>Size</th>
              <th style={{ width: 170 }}>Uploaded</th>
              <th style={{ width: 130 }} />
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => {
              const isCurrent = !!d.isCurrent;
              return (
                <tr key={d._id} className={isCurrent ? styles.currentRow : undefined}>
                  <td className={styles.currentRadioCell}>
                    {/* Radio that promotes the row to current. Disabled
                        for view-only users and while the request is in
                        flight; clicking the row that's already current
                        is a no-op. */}
                    <input
                      type="radio"
                      name={`bp-doc-current-${bPartnerID}`}
                      className={styles.currentRadio}
                      checked={isCurrent}
                      onChange={() => {
                        if (!isCurrent) handleSetCurrent(d._id);
                      }}
                      disabled={!canEdit || settingCurrentId === d._id}
                      title={isCurrent ? "Current working version" : "Mark as current working version"}
                    />
                  </td>
                  <td>{iconFor(d.mimeType, d.filename)}</td>
                  <td>
                    <div className={styles.fileName}>
                      {d.filename}
                      {isCurrent && (
                        <span className={styles.currentBadge}>
                          <FaCheckCircle /> Current
                        </span>
                      )}
                    </div>
                    {d.description && <div className={styles.fileDesc}>{d.description}</div>}
                  </td>
                  <td>{formatBytes(d.size)}</td>
                  <td className={styles.smallText}>{formatDate(d.uploadedAt)}</td>
                  <td className={styles.actionsCell}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => handlePreview(d)}
                      title="View scan results"
                    >
                      <FaEye />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDelete(d._id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Create-form CTA. Opens the fullscreen builder so an admin
          can re-create the customer's form (TRF / PCF / etc.) as a
          structured Tulip template. The output template is what
          Sample Submission will eventually render for this BP and
          what the printable PDF is generated from. */}
      {canEdit && (
        <div className={builderStyles.createFormBar}>
          <button
            type="button"
            className={builderStyles.createFormBtn}
            onClick={() => setBuilderOpen(true)}
            title="Build a Tulip form template that mirrors this partner's document"
          >
            <FaWpforms /> Create Form
          </button>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          partnerId={bPartnerID}
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      <FormBuilder
        open={builderOpen}
        bPartnerName={bPartnerName}
        onClose={() => setBuilderOpen(false)}
        onSave={(template) => {
          // Backend persistence (POST /api/form-templates) will be
          // wired in once that route lands. For now we close the
          // builder and surface a success toast so the UI flow is
          // testable end-to-end.
          // eslint-disable-next-line no-console
          console.log("FormBuilder saved template (not yet persisted):", template);
          toast.success(`Saved draft: ${template.name}`);
          setBuilderOpen(false);
        }}
      />
    </div>
  );
}

// Preview modal: pulls the full document (with extractedText)
// from the backend so the user can see exactly what the scanner
// matched and what new candidate fields were detected. Read-only;
// it's just a peek at what fields the current version will offer
// to Sample Submission.
function DocumentPreviewModal({ partnerId, doc, onClose }) {
  const [fullDoc, setFullDoc] = useState(doc);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${partnerId}/documents/${doc._id}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setFullDoc(data.document);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [partnerId, doc._id]);

  const knownFields = (fullDoc.detectedFields || []).filter((f) => f.matchStatus === "schema");
  const customFields = (fullDoc.detectedFields || []).filter((f) => f.matchStatus === "custom");

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalWindow} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalTitle}>
              {fullDoc.filename}
              {fullDoc.isCurrent && (
                <span className={styles.currentBadge}>
                  <FaCheckCircle /> Current
                </span>
              )}
            </div>
            <div className={styles.modalSubtitle}>
              Scanned {fullDoc.scannedAt ? new Date(fullDoc.scannedAt).toLocaleString() : "-"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} className={styles.modalCloseBtn}>Close</button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {loading && <div className={styles.empty}>Loading scan results...</div>}

          <div className={styles.scanSummary}>
            <div className={styles.scanCard}>
              <div className={styles.scanNum}>{knownFields.length}</div>
              <div>Fields matched to schema</div>
            </div>
            <div className={styles.scanCard}>
              <div className={styles.scanNum}>{customFields.length}</div>
              <div>New candidate fields</div>
            </div>
            <div className={styles.scanCard}>
              <div className={styles.scanNum}>{(fullDoc.extractedText || "").length}</div>
              <div>Chars of text extracted</div>
            </div>
          </div>

          <h4 className={styles.modalH4}>Matched schema fields</h4>
          {knownFields.length === 0 ? (
            <div className={styles.empty}>No schema fields detected.</div>
          ) : (
            <table className={styles.smallTable}>
              <thead>
                <tr>
                  <th>Document Label</th>
                  <th>Maps To</th>
                  <th>Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {knownFields.map((f, i) => (
                  <tr key={i}>
                    <td>{f.label}</td>
                    <td><code>{f.schemaField}</code></td>
                    <td className={styles.smallText}>{f.sampleValue || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4 className={styles.modalH4}>New candidate fields</h4>
          <div className={styles.candidateNote}>
            These labels aren&apos;t mapped to any built-in Sample Submission
            field yet. When this document is the current working version,
            Sample Submission will offer them as &quot;Add custom field&quot;
            suggestions for submissions linked to this partner.
          </div>
          {customFields.length === 0 ? (
            <div className={styles.empty}>No new candidate fields detected.</div>
          ) : (
            <table className={styles.smallTable}>
              <thead>
                <tr>
                  <th>Document Label</th>
                  <th>Sample Value</th>
                </tr>
              </thead>
              <tbody>
                {customFields.map((f, i) => (
                  <tr key={i}>
                    <td>{f.label}</td>
                    <td className={styles.smallText}>{f.sampleValue || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {fullDoc.extractedText && (
            <>
              <h4 className={styles.modalH4}>Extracted text (preview)</h4>
              <pre className={styles.preview}>{fullDoc.extractedText.slice(0, 5000)}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
