import React, { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import {
  FaPrint,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaDownload,
  FaFileArchive,
  FaFlask,
  FaInfoCircle,
} from "react-icons/fa";
import styles from "./ShippingTemplatesModal.module.css";
import toast from "../Toaster/toast";

// Modal opened from the Shipping Log detail page that lists the
// built-in vendor templates the system knows how to render (GLP
// Test Request, GV TIDS, Bureau Veritas Medical TRF, PSL
// Biocompatibility PCF, Accuprec TIDS-GLP). Unlike PrintBPDocs
// modal — which prints whatever document the Business Partner
// uploaded to their Sample Documents tab — these templates are
// hard-coded in the backend so they're always available, even
// for partners that haven't uploaded their own template yet.
//
// Filtering: the catalog is filtered by the shipping log's
// destination customer (bPartner). Only the template that
// matches the chosen vendor is offered — e.g. a shipment to
// "Bureau Veritas CPS Germany" only surfaces the BV Medical
// TRF, never the Geneva GLP form.
//
// Sample handling: each vendor TRF/TIDS/PCF describes a single
// test article (with all of that sample's requested tests on
// the same form). So we render one filled template PER UNIQUE
// SAMPLE on the shipping log:
//   • 1 sample with N tests  → 1 file (all tests on one form)
//   • M distinct samples     → M files, bundled into a single
//                              .zip download in one click
//
// Each template is rendered in its NATIVE format (PDF, DOCX
// or XLSX) so it looks byte-for-byte like the vendor's
// original. PDFs open inline in a browser tab (Ctrl+P to
// print); DOCX/XLSX/ZIP trigger a download.
//
// Props:
//   shippingId       string  - shipping record _id (required)
//   shippingCode     string  - friendly display label
//   bPartnerName     string  - just for the modal title
//   samples          array   - [{ _id, sampleCode, name }] on this shipment
//   onClose          () => void
export default function ShippingTemplatesModal({
  shippingId,
  shippingCode,
  bPartnerName,
  samples = [],
  onClose,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  // Unique samples on this shipping log. Duplicates (e.g. when
  // a sample is listed twice on different shipping lines) are
  // collapsed because we only need to render ONE template per
  // unique test article.
  const uniqueSamples = useMemo(() => {
    const seen = new Map();
    (samples || []).forEach((s) => {
      if (!s || !s._id) return;
      const k = String(s._id);
      if (!seen.has(k)) seen.set(k, s);
    });
    return Array.from(seen.values());
  }, [samples]);
  const sampleCount = uniqueSamples.length;

  // Pull the catalog from the backend, scoped to this shipping
  // log so the server can filter by the destination partner.
  // That way the operator only ever sees the form(s) the
  // selected customer actually accepts.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const qs = shippingId ? `?shippingId=${encodeURIComponent(shippingId)}` : "";
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/shipping/templates${qs}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setTemplates(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load templates:", err);
        toast.error("Failed to load vendor templates");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [shippingId]);

  // Render the chosen template for every unique sample on the
  // shipment. The backend handles per-sample iteration and
  // zips the results when there's more than one sample, so the
  // operator gets a single click → single download.
  const renderTemplate = async (tpl) => {
    const key = tpl.key;
    if (!shippingId) {
      toast.error("Save the shipping log before printing a template.");
      return;
    }
    setBusyKey(key);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/shipping/${shippingId}/templates/${key}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json")
          ? await res.json().catch(() => ({}))
          : {};
        // Combine the human message with the raw error detail
        // so renderer failures (which the server returns as
        // `error`) are visible in the toast, not just "Failed
        // to render template".
        const parts = [body.message, body.error].filter(Boolean);
        throw new Error(parts.join(" — ") || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const filename =
        res.headers.get("X-Filled-Filename") ||
        (res.headers.get("Content-Disposition") || "")
          .match(/filename="?([^";]+)"?/)?.[1] ||
        `${key}.${tpl.output || "pdf"}`;
      const renderedCount = Number(res.headers.get("X-Filled-Sample-Count") || 1);
      const url = URL.createObjectURL(blob);
      const contentType = res.headers.get("Content-Type") || "";
      const isPdf = contentType.startsWith("application/pdf");
      const isZip = contentType.startsWith("application/zip");

      if (isPdf) {
        const w = window.open(url, "_blank", "noopener");
        if (!w) toast.error("Pop-up blocked. Allow pop-ups to view the filled template.");
        else toast.success("Template opened. Use Print (or Ctrl+P).");
      } else {
        // ZIP, DOCX, XLSX → trigger a download.
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (isZip) {
          toast.success(`${filename} downloaded — ${renderedCount} sample(s) inside.`);
        } else {
          toast.success(
            `${filename} downloaded. Open it in ${(tpl.output || "").toUpperCase()} to review and print.`
          );
        }
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("Render template failed:", err);
      toast.error(`Failed to render template: ${err.message || "Unknown error"}`);
    } finally {
      setBusyKey(null);
    }
  };

  const iconFor = (output, multi) => {
    if (multi) return <FaFileArchive style={{ color: "#7c3aed" }} />;
    if (output === "docx") return <FaFileWord style={{ color: "#2563eb" }} />;
    if (output === "xlsx") return <FaFileExcel style={{ color: "#15803d" }} />;
    return <FaFilePdf style={{ color: "#dc2626" }} />;
  };

  const isMulti = sampleCount > 1;
  const actionLabelFor = (tpl) => {
    if (isMulti) return `Download ZIP (${sampleCount} samples)`;
    const out = (tpl.output || "pdf").toLowerCase();
    if (out === "pdf") return "Print with values";
    return `Download ${out.toUpperCase()}`;
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.container}>
        <h3 className={styles.title}>
          Print Vendor Templates
          {bPartnerName && <span className={styles.subtitle}> · {bPartnerName}</span>}
          {shippingCode && <span className={styles.subtitle}> · {shippingCode}</span>}
        </h3>
        <div className={styles.subtleNote}>
          Built-in lab submission forms (TRF / TIDS / PCF) pre-filled with the data
          captured on this shipment&apos;s sample submission. Only the template that
          matches this shipment&apos;s customer is offered; one filled form is
          generated per unique sample (multi-test samples produce a single form
          listing every test).
        </div>

        {/* Per-sample plan: shows the user exactly what will
            come out of the print: 1 file for a single sample
            or N files (zipped) for multi-sample shipments. */}
        {sampleCount > 0 && (
          <div className={styles.samplePicker}>
            <FaFlask />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <strong>
                {sampleCount === 1
                  ? "1 sample on this shipment → 1 filled template (one form, all of its tests)."
                  : `${sampleCount} unique samples on this shipment → ${sampleCount} filled templates, bundled into one .zip.`}
              </strong>
              <span className={styles.samplePickerHint}>
                {uniqueSamples
                  .map((s) => [s.sampleCode, s.name].filter(Boolean).join(" — "))
                  .filter(Boolean)
                  .join(",  ")}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className={styles.empty}>Loading vendor templates…</div>
        ) : templates.length === 0 ? (
          <div className={styles.empty}>
            <FaInfoCircle style={{ marginRight: 6, color: "#0369a1" }} />
            No built-in template matches this shipment&apos;s customer
            {bPartnerName ? ` (“${bPartnerName}”)` : ""}. Pick a customer whose
            vendor form ships with the system (Bureau Veritas, Geneva Labs,
            Groenakker, Eurofins PSL, Accuprec) or upload the partner&apos;s
            own template from the Business Partner record.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }} />
                <th>Template</th>
                <th style={{ width: 180 }}>Vendor</th>
                <th style={{ width: 240 }} />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const isPdfSingle = (t.output || "pdf") === "pdf" && !isMulti;
                return (
                  <tr key={t.key}>
                    <td>{iconFor(t.output, isMulti)}</td>
                    <td>
                      <div className={styles.fileName}>
                        {t.label}
                        <span className={styles.builtInBadge}>
                          <FaCheckCircle /> Built-in
                        </span>
                        <span
                          className={styles.builtInBadge}
                          style={{ background: "#eef2ff", color: "#3730a3" }}
                        >
                          {isMulti ? "ZIP" : (t.output || "pdf").toUpperCase()}
                        </span>
                      </div>
                      {t.description && (
                        <div className={styles.fileDesc}>{t.description}</div>
                      )}
                    </td>
                    <td className={styles.vendorCell}>{t.vendor || "—"}</td>
                    <td className={styles.actions}>
                      <button
                        type="button"
                        className={styles.printBtn}
                        onClick={() => renderTemplate(t)}
                        disabled={busyKey === t.key || !shippingId}
                        title={
                          shippingId
                            ? isMulti
                              ? `Render ${sampleCount} filled templates (one per sample) and download them as a ZIP`
                              : isPdfSingle
                                ? "Render this template pre-filled and open it in a new tab"
                                : "Render this template pre-filled and download it"
                            : "Save the shipping log before printing"
                        }
                      >
                        {busyKey === t.key ? (
                          <>
                            <FaExternalLinkAlt /> Rendering…
                          </>
                        ) : (
                          <>
                            {isMulti ? (
                              <FaDownload />
                            ) : isPdfSingle ? (
                              <FaPrint />
                            ) : (
                              <FaDownload />
                            )}{" "}
                            {actionLabelFor(t)}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className={styles.footerNote}>
          Templates are rendered server-side from the canonical layout files in
          <code>Tulip-Backend/src/assets/templates/</code>. The list above is
          filtered by the shipment&apos;s customer — switch the customer on the
          shipping log to expose a different vendor&apos;s template. Values are
          pulled from the linked sample submission, project, partner, and
          shipping record; empty fields stay blank so the operator (or vendor)
          can hand-fill them.
        </div>
      </div>
    </Modal>
  );
}
