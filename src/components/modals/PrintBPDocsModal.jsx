import React, { useEffect, useState } from "react";
import Modal from "../Modal";
import {
  FaPrint,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileAlt,
  FaExternalLinkAlt,
  FaCheckCircle,
} from "react-icons/fa";
import styles from "./PrintBPDocsModal.module.css";
import toast from "../Toaster/toast";

// Modal opened from the Shipping Log detail to print the
// Business Partner's CURRENT working version sample document.
//
// Two ways to print:
//   1) "Open" / "Print empty"  - opens the raw uploaded template
//      in a new browser tab and lets the user print from the
//      browser viewer. This is the original behaviour and is
//      still useful for reference / archive.
//   2) "Print with values"     - asks the backend to splice the
//      shipping log's data (customer, project, samples, lots,
//      addresses, parcel weight, ...) into a copy of the same
//      template and serves the filled file back. Falls back to
//      (1) when the template type can't be auto-filled (e.g.
//      a scanned PDF without an AcroForm); the user is told why
//      via toast.
//
// The fill flow only runs when `shippingId` is provided, which
// is only the case when the modal is opened from a saved
// shipping log. Without it we just show "Open" / "Print empty"
// like before.
//
// Historically this listed every document attached to the BP,
// but the Sample Documents tab on the BP detail now tracks
// which version is "current". Only that one is surfaced here
// so the shipping log always reflects what the BP actually
// wants printed today; older uploaded versions stay on the BP
// page as history but are intentionally hidden here.
//
// Props:
//   bPartnerID:   BP _id (required)
//   bPartnerName: optional for title
//   shippingId:   shipping record _id; when provided enables the
//                 "Print with values" button.
//   onClose: () => void
export default function PrintBPDocsModal({ bPartnerID, bPartnerName, shippingId, onClose }) {
  const [currentDoc, setCurrentDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!bPartnerID) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/documents`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const docs = data.documents || [];
        // Prefer the doc explicitly flagged as current. Fallback
        // to the newest upload for legacy BPs whose docs predate
        // the isCurrent flag.
        let chosen = docs.find((d) => d.isCurrent);
        if (!chosen && docs.length > 0) {
          chosen = [...docs].sort((a, b) => {
            const at = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
            const bt = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
            return bt - at;
          })[0];
        }
        setCurrentDoc(chosen || null);
      } catch (err) {
        console.error("Failed to load BP documents:", err);
        toast.error("Failed to load BP documents");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bPartnerID]);

  const iconFor = (mime = "", name = "") => {
    const n = (name || "").toLowerCase();
    if (mime.includes("pdf") || n.endsWith(".pdf")) return <FaFilePdf style={{ color: "#dc2626" }} />;
    if (mime.includes("word") || n.endsWith(".doc") || n.endsWith(".docx")) return <FaFileWord style={{ color: "#2563eb" }} />;
    if (mime.includes("sheet") || mime.includes("excel") || n.endsWith(".xls") || n.endsWith(".xlsx")) return <FaFileExcel style={{ color: "#16a34a" }} />;
    return <FaFileAlt />;
  };

  const openInNewTab = (url) => {
    const w = window.open(url, "_blank", "noopener");
    if (!w) toast.error("Pop-up blocked. Allow pop-ups to print.");
  };

  // For PDFs we open in a new tab and the browser viewer's
  // print menu is one click away. We don't try to drive
  // window.print() across origins.
  const printDoc = (doc) => {
    const w = window.open(doc.url, "_blank", "noopener");
    if (!w) {
      toast.error("Pop-up blocked. Allow pop-ups to print.");
      return;
    }
    toast.success("Use the browser viewer's Print button (or Ctrl+P).");
  };

  // Ask the backend to render a brand-new PDF copy of the
  // partner's current sample document with the shipping log's
  // values spliced in (customer, addresses, samples, lots,
  // parcel, dates, ...). The endpoint always returns
  // application/pdf regardless of whether the source template
  // was a PDF, DOCX, or XLSX, because the backend renders the
  // PDF from the cached extracted text rather than mutating the
  // original file.
  const printWithValues = async () => {
    if (!shippingId) {
      toast.error("Save the shipping log before printing with values.");
      return;
    }
    setFilling(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/shipping/${shippingId}/bp-doc-filled`,
        { credentials: "include" }
      );

      if (!res.ok) {
        // Surface the backend's actual error so future failures are
        // diagnosable from the UI instead of a generic toast.
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json")
          ? await res.json().catch(() => ({}))
          : {};
        throw new Error(body.message || body.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener");
      if (!w) toast.error("Pop-up blocked. Allow pop-ups to view the filled document.");
      else toast.success("Filled PDF opened. Use Print (or Ctrl+P).");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("Print with values failed:", err);
      toast.error(`Failed to fill document: ${err.message || "Unknown error"}`);
    } finally {
      setFilling(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.container}>
        <h3 className={styles.title}>
          Print Current Sample Document
          {bPartnerName && <span className={styles.subtitle}> · {bPartnerName}</span>}
        </h3>

        {loading ? (
          <div className={styles.empty}>Loading current document...</div>
        ) : !currentDoc ? (
          <div className={styles.empty}>
            No current sample document set for this Business Partner.<br />
            Upload one on the partner&apos;s Sample Documents tab so it can be
            printed from here.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th>File</th>
                <th style={{ width: 150 }}>Category</th>
                <th style={{ width: 320 }} />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{iconFor(currentDoc.mimeType, currentDoc.filename)}</td>
                <td>
                  <div className={styles.fileName}>
                    {currentDoc.filename}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#dcfce7",
                        color: "#15803d",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginLeft: 6,
                        verticalAlign: "middle",
                      }}
                    >
                      <FaCheckCircle /> Current
                    </span>
                  </div>
                  {currentDoc.description && (
                    <div className={styles.fileDesc}>{currentDoc.description}</div>
                  )}
                </td>
                <td>{currentDoc.category || "-"}</td>
                <td className={styles.actions}>
                  <button
                    type="button"
                    className={styles.openBtn}
                    onClick={() => openInNewTab(currentDoc.url)}
                    title="Open the empty uploaded template"
                  >
                    <FaExternalLinkAlt /> Open
                  </button>
                  <button
                    type="button"
                    className={styles.printBtn}
                    onClick={() => printDoc(currentDoc)}
                    title="Print the empty uploaded template"
                  >
                    <FaPrint /> Print empty
                  </button>
                  {shippingId && (
                    <button
                      type="button"
                      className={styles.printBtn}
                      onClick={printWithValues}
                      disabled={filling}
                      title="Print a copy with shipping log values filled in"
                      style={{ background: "#15803d" }}
                    >
                      <FaPrint /> {filling ? "Filling..." : "Print with values"}
                    </button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        )}

        <div className={styles.footerNote}>
          {shippingId
            ? "\u201CPrint with values\u201D renders a fresh PDF from the current template (regardless of whether you uploaded a PDF, DOCX, or XLSX) with this shipment\u2019s customer, addresses, samples, lots, and parcel info filled in. To change which template is used, edit the partner\u2019s Sample Documents tab."
            : "Only the partner\u2019s current working version is shown here. To change which document prints, open the Business Partner detail page and pick a different version under Sample Documents."}
        </div>
      </div>
    </Modal>
  );
}
