import React, { useRef, useState } from "react";
import { FaFileImport } from "react-icons/fa";
import Modal from "../Modal";
import styles from "./ImportButton.module.css";

/**
 * Reusable Excel/CSV import control.
 *
 * Props:
 *   - endpoint   (required) — backend URL to POST the file to.
 *   - label      — button label (default: "Import")
 *   - accept     — accept attribute for the file picker.
 *   - mode       — "upsert" (default) or "insert".
 *   - entityName — singular noun for messaging ("partner", "project", ...)
 *   - onComplete — callback invoked after a successful import so the
 *                  parent list page can refresh its data.
 */
export default function ImportButton({
  endpoint,
  label = "Import",
  accept = ".xlsx,.xls,.csv",
  mode = "upsert",
  entityName = "row",
  onComplete,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const openFilePicker = () => {
    setError("");
    setResult(null);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const url = mode ? `${endpoint}?mode=${encodeURIComponent(mode)}` : endpoint;

      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      // Read body as text first so we can show meaningful errors when the
      // server returns HTML (e.g. proxy 502, or misconfigured route).
      const rawText = await response.text();
      let data = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          (data && data.message) ||
          (rawText && rawText.length < 300 ? rawText : `Import failed (HTTP ${response.status}).`);
        throw new Error(message);
      }

      if (!data) {
        throw new Error("Server returned an empty response.");
      }

      setResult(data);
      if (typeof onComplete === "function") {
        onComplete(data);
      }
    } catch (err) {
      console.error("[Import] failed:", err);
      setError(err?.message || "Import failed. Check the browser console for details.");
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setResult(null);
    setError("");
    setFileName("");
  };

  const showModal = uploading || result || error;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <button
        type="button"
        className={styles.importButton}
        onClick={openFilePicker}
        disabled={uploading}
        title={`Import ${entityName}s from Excel`}
      >
        <FaFileImport />
        <span>{uploading ? "Importing..." : label}</span>
      </button>

      {showModal && (
        <Modal onClose={uploading ? () => {} : closeModal}>
          <div className={styles.modalContent}>
            <h3>
              {uploading
                ? `Importing ${entityName}s...`
                : error
                ? "Import Failed"
                : "Import Results"}
            </h3>

            {fileName && (
              <p className={styles.fileNameLabel}>
                File: <strong>{fileName}</strong>
              </p>
            )}

            {uploading ? (
              <div className={styles.loadingBlock}>
                <div className={styles.spinner} aria-hidden="true" />
                <p>Reading and validating rows. This may take a few seconds...</p>
              </div>
            ) : error ? (
              <p className={styles.errorMessage}>{error}</p>
            ) : (
              <>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Total rows</span>
                    <span className={styles.summaryValue}>{result.total}</span>
                  </div>
                  <div
                    className={`${styles.summaryItem} ${styles.summaryCreated}`}
                  >
                    <span className={styles.summaryLabel}>Created</span>
                    <span className={styles.summaryValue}>{result.created}</span>
                  </div>
                  <div
                    className={`${styles.summaryItem} ${styles.summaryUpdated}`}
                  >
                    <span className={styles.summaryLabel}>Updated</span>
                    <span className={styles.summaryValue}>{result.updated}</span>
                  </div>
                  <div
                    className={`${styles.summaryItem} ${styles.summarySkipped}`}
                  >
                    <span className={styles.summaryLabel}>Skipped</span>
                    <span className={styles.summaryValue}>{result.skipped}</span>
                  </div>
                  <div
                    className={`${styles.summaryItem} ${styles.summaryFailed}`}
                  >
                    <span className={styles.summaryLabel}>Failed</span>
                    <span className={styles.summaryValue}>{result.failed}</span>
                  </div>
                </div>

                {result.failed > 0 && (
                  <div className={styles.failuresSection}>
                    <h4>Rows that failed</h4>
                    <div className={styles.failuresList}>
                      {result.results
                        .filter((r) => r.action === "failed")
                        .slice(0, 50)
                        .map((r, idx) => (
                          <div key={idx} className={styles.failureRow}>
                            <span className={styles.failureRowLabel}>
                              Row {r.row}
                              {r.partnerNumber || r.projectID || r.code
                                ? ` · ${r.partnerNumber || r.projectID || r.code}`
                                : ""}
                            </span>
                            <span className={styles.failureRowMessage}>
                              {r.message}
                            </span>
                          </div>
                        ))}
                      {result.results.filter((r) => r.action === "failed").length >
                        50 && (
                        <div className={styles.failureRowMessage}>
                          + more rows omitted...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {!uploading && (
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalPrimaryBtn}
                  onClick={closeModal}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
