import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import styles from "./portal.module.css";
import SampleWizard, { SAMPLE_WIZARD_STEPS } from "./SampleWizard";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// =================================================================
// Customer-side sample intake form, rendered as the same five-step
// wizard the customer sees on existing samples — so creating a new
// sample feels identical to reviewing an existing one. The
// signature pad sits underneath the last slide; submission isn't
// possible until the customer is on the Requested Tests step and has
// signed.
//
// Fields collected per step:
//   1. Sample Info       — project, name, lot/batch, country, etc.
//   2. Sample Condition  — shipping / storage / disposition / safety
//   3. Sample Details    — extended TRF/TIDS fields (GLP, pH, etc.)
//   4. Sample Image      — photos
//   5. Requested Tests   — test code picks (vendor is assigned later
//                          by the lab)
// =================================================================

const INITIAL_SAMPLE = {
  projectID: "",
  projectName: "",
  name: "",
  description: "",
  sampleDescription: "",
  intendedUse: "",
  partNumber: "",
  lotNumber: "",
  batchNumber: "",
  serialNumber: "",
  manufacturer: "",
  manufactureDate: "",
  expirationDate: "",
  countryOrigin: "",
  devicesUsed: "1",
  sampleMass: "",
  surfaceArea: "",
  materialsOfConstruction: "",
  appearance: "",
  productColor: "",
  deviceType: "",
  isBulk: false,
  contactType: "",
  contactDuration: "",
  wallThickness: "",
  // Condition
  shippingCondition: "",
  sampleStorage: "",
  sampleDisposition: "",
  safetyPrecautions: "",
  handlingRequirements: "",
  sampleSterile: "",
  sterilizationMethod: "",
  sterilizationDate: "",
  sterilizedBy: "",
  // Details
  studyCompliance: "",
  productType: "",
  methodOfManufacturing: "",
  chemicalName: "",
  casNumber: "",
  molecularFormula: "",
  molecularWeight: "",
  pH: "",
  purityConcentration: "",
  density: "",
  solubility: "",
  composition: "",
  biohazard: "",
  extractionRatios: "",
  packagingDetails: "",
  specialInstructions: "",
  // Images
  sampleImages: { general: null, labeling: null },
  // Tests
  requestedTests: [],
};

export default function CustomerSampleNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [testCodes, setTestCodes] = useState([]);
  const [sample, setSample] = useState({
    ...INITIAL_SAMPLE,
    projectID: params.get("projectId") || "",
  });
  const [step, setStep] = useState(0);
  const [printedName, setPrintedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const sigRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const [pRes, tcRes] = await Promise.all([
          fetch(`${API_BASE_URL}/portal/customer/projects`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/portal/customer/test-codes`, { credentials: "include" }),
        ]);
        if (pRes.ok) setProjects(await pRes.json());
        if (tcRes.ok) setTestCodes(await tcRes.json());
      } catch (_) {
        /* swallow — the wizard still works with empty lists */
      }
    })();
  }, []);

  const isLastStep = step === SAMPLE_WIZARD_STEPS.length - 1;

  // Reject submission early if the wizard isn't fully filled. We only
  // hard-require the fields the backend hard-requires (project +
  // signature). The rest is collected best-effort.
  const submit = async () => {
    setError("");
    if (!sample.projectID) {
      setStep(0);
      return setError("Please pick a project on the first step.");
    }
    if (!sample.name) {
      setStep(0);
      return setError("Sample name is required.");
    }
    if (!printedName.trim()) return setError("Please print your name to sign.");
    if (!sigRef.current || sigRef.current.isEmpty())
      return setError("Please sign in the box.");

    setSubmitting(true);
    try {
      const signatureImage = sigRef.current.toDataURL("image/png");
      const payload = {
        ...sample,
        signatureImage,
        customerApprovalName: printedName.trim(),
      };
      const res = await fetch(`${API_BASE_URL}/portal/customer/samples`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed");
      navigate(`/portal/samples/${data._id}`);
    } catch (err) {
      setError(err.message || "Failed to create sample");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>New sample submission</h1>
      <p className={styles.pageSub}>
        Step through the form — sample info, condition, details, photos and
        the tests you'd like us to run. We'll receive the package on arrival
        and pick up from there.
      </p>

      <SampleWizard
        sample={sample}
        setSample={setSample}
        readOnly={false}
        step={step}
        setStep={setStep}
        testCodes={testCodes}
        projectOptions={projects}
      />

      {/* Signature lives in its own panel so it's always available —
          but the Submit button is only shown when the user is on the
          last step so the wizard order is obvious. */}
      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>Sign &amp; submit</h2>
        </div>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          {isLastStep
            ? "Sign below to confirm and submit your sample."
            : "Finish all the steps above first, then come back here to sign and submit."}
        </p>
        <div className={styles.formField} style={{ maxWidth: 320 }}>
          <label>Printed name</label>
          <input
            value={printedName}
            onChange={(e) => setPrintedName(e.target.value)}
            placeholder="As you would sign it"
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
        {error && <div className={styles.formError}>{error}</div>}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => sigRef.current && sigRef.current.clear()}
          >
            Clear signature
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={submitting || !isLastStep}
            onClick={submit}
            title={!isLastStep ? "Finish all steps before submitting" : ""}
          >
            {submitting ? "Submitting…" : "Submit sample"}
          </button>
          {!isLastStep && (
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              Step {step + 1} of {SAMPLE_WIZARD_STEPS.length} — finish to enable submit.
            </span>
          )}
        </div>
      </div>
    </>
  );
}
