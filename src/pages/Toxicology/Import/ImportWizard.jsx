import React, { useRef, useState } from "react";
import { FaUpload, FaCheckCircle, FaArrowRight } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import toast from "../../../components/Toaster/toast";
import {
  uploadChemistry,
  resolveImport,
  confirmImport,
  previewImport,
} from "./import.api";
import styles from "./ImportWizard.module.css";

/**
 * Chemistry Import wizard.
 *
 * Collapses the original 15-hook flow in `features/import/*` into a
 * single component with three explicit steps:
 *   1. Upload  — pick a file, POST to /import/chemistry
 *   2. Preview — show parsed rows from /import/:id/preview, call
 *      /import/:id/resolve when the user is ready
 *   3. Confirm — POST /import/:id/confirm with a TRA project name and
 *      land back at the project
 *
 * Each step has its own local-state slice; transitions are explicit
 * `goToStep(n)` calls so the component is easy to reason about.
 */
const STEPS = [
  { id: 1, label: "Upload" },
  { id: 2, label: "Preview & resolve" },
  { id: 3, label: "Confirm" },
];

export default function ImportWizard() {
  const fileInput = useRef(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [job, setJob] = useState(null); // post-upload job
  const [preview, setPreview] = useState(null);
  const [resolveResult, setResolveResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmProjectName, setConfirmProjectName] = useState("");
  const [confirmResult, setConfirmResult] = useState(null);

  const reset = () => {
    setFile(null);
    setProjectId("");
    setJob(null);
    setPreview(null);
    setResolveResult(null);
    setConfirmProjectName("");
    setConfirmResult(null);
    setStep(1);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const j = await uploadChemistry(file, { projectId: projectId || undefined });
      setJob(j);
      // The upload response already contains the parsed rows, but
      // pull the canonical /preview to be safe.
      const p = await previewImport(j.import_id);
      setPreview(p);
      setStep(2);
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!job) return;
    setBusy(true);
    try {
      const r = await resolveImport(job.import_id);
      setResolveResult(r);
      toast.success("Resolved");
      setStep(3);
    } catch (err) {
      toast.error(err?.message || "Resolve failed");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!job) return;
    setBusy(true);
    try {
      const c = await confirmImport(job.import_id, {
        project_name: confirmProjectName,
        tra_project_id: Number(projectId) || undefined,
      });
      setConfirmResult(c);
      toast.success("Import confirmed");
    } catch (err) {
      toast.error(err?.message || "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header title="Chemistry Import" />
      <WhiteIsland className="WhiteIsland">
        <ol className={styles.stepNav}>
          {STEPS.map((s) => (
            <li
              key={s.id}
              className={`${styles.step} ${s.id === step ? styles.stepActive : ""} ${
                s.id < step ? styles.stepDone : ""
              }`}
            >
              <span className={styles.stepNumber}>{s.id}</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ol>

        {step === 1 && (
          <form onSubmit={handleUpload} className={styles.uploadStep}>
            <p className={styles.help}>
              Upload an XLSX or CSV with a column named <code>Substance</code>,{" "}
              <code>Name</code>, or similar. CAS and SMILES columns are picked
              up automatically.
            </p>
            <div
              className={styles.dropZone}
              onClick={() => fileInput.current?.click()}
              role="button"
            >
              <FaUpload size={32} />
              <p>{file ? file.name : "Click to choose an XLSX/CSV file"}</p>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                hidden
              />
            </div>
            <label className={styles.inlineField}>
              Optional TRA project ID
              <input
                type="number"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="leave blank to skip"
              />
            </label>
            <div className={styles.actions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!file || busy}
              >
                {busy ? "Uploading..." : "Upload & parse"}
                <FaArrowRight />
              </button>
            </div>
          </form>
        )}

        {step === 2 && preview && (
          <div className={styles.previewStep}>
            <header className={styles.previewHeader}>
              <h3>{preview.filename}</h3>
              <div className={styles.previewMeta}>
                <span>{preview.total_compounds} rows</span>
                <span>{preview.parsing_method}</span>
              </div>
            </header>

            <div className={styles.tableScroller}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th>CAS</th>
                    <th>SMILES</th>
                    <th>Analysis</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.compounds || []).map((c, i) => (
                    <tr key={i}>
                      <td className={styles.mono}>{c.row_index}</td>
                      <td>{c.name}</td>
                      <td>{c.cas_number || "—"}</td>
                      <td className={styles.mono}>{c.smiles || "—"}</td>
                      <td>{c.analysis_type || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.warnings?.length > 0 && (
              <ul className={styles.warnings}>
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.outlineButton} onClick={reset}>
                Start over
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleResolve}
                disabled={busy}
              >
                {busy ? "Resolving..." : "Resolve identifiers"}
                <FaArrowRight />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.confirmStep}>
            {confirmResult ? (
              <div className={styles.confirmDone}>
                <FaCheckCircle size={36} className={styles.successIcon} />
                <h3>Import recorded</h3>
                <p>
                  Imported into TRA project{" "}
                  <strong>{confirmResult.tra_project_name}</strong>. {" "}
                  {confirmResult.compounds_created} compound(s) created,{" "}
                  {confirmResult.families_created} family(ies).
                </p>
                <div className={styles.actions}>
                  <button type="button" className={styles.outlineButton} onClick={reset}>
                    Import another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirm} className={styles.form}>
                <h3>Confirm import</h3>
                <p>
                  Resolved {resolveResult?.compounds?.length ?? 0} compounds.
                  Give the resulting TRA project a name to finalise.
                </p>
                <label>
                  TRA project name
                  <input
                    required
                    value={confirmProjectName}
                    onChange={(e) => setConfirmProjectName(e.target.value)}
                  />
                </label>
                <div className={styles.actions}>
                  <button type="button" className={styles.outlineButton} onClick={reset}>
                    Start over
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={busy || !confirmProjectName.trim()}
                  >
                    {busy ? "Confirming..." : "Finalise import"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </WhiteIsland>
    </>
  );
}
