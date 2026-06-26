import React, { useMemo, useRef } from "react";
import {
  FaInfoCircle,
  FaThermometerHalf,
  FaListUl,
  FaCamera,
  FaVial,
} from "react-icons/fa";
import styles from "./sampleWizard.module.css";

/*  ===================================================================
    SampleWizard
    -------------------------------------------------------------------
    Multi-step "slides" presentation of the sample submission form for
    the Customer Portal. Mirrors the lab-facing SSDetails layout so a
    customer who later sees the internal record recognises the same
    fields, but breaks the long form into 5 digestible steps:

      1. Sample Info       — identity / classification / contact-of-use
      2. Sample Condition  — shipping / storage / disposition / safety
      3. Sample Details    — extended TRF/TIDS/PCF fields
      4. Sample Image      — general + labeling photo
      5. Requested Tests   — picked from the company test-code catalog

    Two modes:
      - readOnly = true   → render as a read-only viewer (used by
                            CustomerSampleDetail.jsx)
      - readOnly = false  → editable wizard (used by
                            CustomerSampleNew.jsx)

    Props:
      sample          object — the sample state
      setSample(fn)   updater — only required when !readOnly
      readOnly        bool
      step            number — current step index (0–4)
      setStep(n)      function — controls which slide is visible
      testCodes       array — available test code catalog (for step 5)
      addTestRow(tc)  function — appends a requested test row
      removeTestRow(i) function — removes a row
      projectOptions  array — used in step 1 when creating a new sample
=================================================================== */

const STEPS = [
  { key: "info", label: "Sample Info", hint: "Identity & classification", icon: <FaInfoCircle /> },
  { key: "condition", label: "Sample Condition", hint: "Shipping & storage", icon: <FaThermometerHalf /> },
  { key: "details", label: "Sample Details", hint: "Extended TRF fields", icon: <FaListUl /> },
  { key: "image", label: "Sample Image", hint: "Photos for receiving", icon: <FaCamera /> },
  { key: "tests", label: "Requested Tests", hint: "Tests to run", icon: <FaVial /> },
];

/* -------------------- Small render helpers -------------------- */

const TextField = ({ label, name, value, onChange, readOnly, placeholder, type = "text" }) => (
  <div className={styles.fieldGroup}>
    <label htmlFor={name}>{label}</label>
    {readOnly ? (
      <div className={styles.readonlyValue}>{value || "—"}</div>
    ) : (
      <input
        id={name}
        name={name}
        type={type}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder || ""}
      />
    )}
  </div>
);

const SelectField = ({ label, name, value, options, onChange, readOnly }) => (
  <div className={styles.fieldGroup}>
    <label htmlFor={name}>{label}</label>
    {readOnly ? (
      <div className={styles.readonlyValue}>{value || "—"}</div>
    ) : (
      <select id={name} name={name} value={value || ""} onChange={onChange}>
        <option value="">— Select —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )}
  </div>
);

const TextareaField = ({ label, name, value, onChange, readOnly, rows = 3 }) => (
  <div className={`${styles.fieldGroup} ${styles.fullRow}`}>
    <label htmlFor={name}>{label}</label>
    {readOnly ? (
      <div className={styles.readonlyValue} style={{ whiteSpace: "pre-wrap" }}>
        {value || "—"}
      </div>
    ) : (
      <textarea id={name} name={name} value={value || ""} onChange={onChange} rows={rows} />
    )}
  </div>
);

const RadioRow = ({ label, name, value, options, onChange, readOnly }) => (
  <div className={`${styles.fieldGroup} ${styles.fullRow}`}>
    <label>{label}</label>
    {readOnly ? (
      <div className={styles.readonlyValue}>{value || "—"}</div>
    ) : (
      <div className={styles.radioRow}>
        {options.map((opt) => (
          <label key={opt}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={onChange}
            />
            {opt}
          </label>
        ))}
      </div>
    )}
  </div>
);

/* =================================================================
   Step renderers
================================================================= */

function StepInfo({ sample, onChange, readOnly, projectOptions }) {
  return (
    <>
      <div className={styles.fieldGrid}>
        {/* Project picker is only relevant when creating a new sample. */}
        {projectOptions ? (
          <div className={styles.fieldGroup}>
            <label htmlFor="projectID">Project *</label>
            <select
              id="projectID"
              name="projectID"
              value={sample.projectID || ""}
              onChange={onChange}
              required
            >
              <option value="">Select a project</option>
              {projectOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.projectID} · {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <TextField label="Project" name="projectName" value={sample.projectName} readOnly />
        )}
        <TextField label="Sample Code" name="sampleCode" value={sample.sampleCode} readOnly />
        <TextField
          label="Sample Name *"
          name="name"
          value={sample.name}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Part #"
          name="partNumber"
          value={sample.partNumber}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Lot #"
          name="lotNumber"
          value={sample.lotNumber}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Batch #"
          name="batchNumber"
          value={sample.batchNumber}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Serial #"
          name="serialNumber"
          value={sample.serialNumber}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Manufacturer"
          name="manufacturer"
          value={sample.manufacturer}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Country of Origin"
          name="countryOrigin"
          value={sample.countryOrigin}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Manufacture Date"
          name="manufactureDate"
          value={sample.manufactureDate}
          onChange={onChange}
          readOnly={readOnly}
          type="date"
        />
        <TextField
          label="Expiration Date"
          name="expirationDate"
          value={sample.expirationDate}
          onChange={onChange}
          readOnly={readOnly}
          type="date"
        />
        <TextField
          label="Devices / Units Submitted"
          name="devicesUsed"
          value={sample.devicesUsed}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Sample Mass"
          name="sampleMass"
          value={sample.sampleMass}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Surface Area"
          name="surfaceArea"
          value={sample.surfaceArea}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Materials of Construction"
          name="materialsOfConstruction"
          value={sample.materialsOfConstruction}
          onChange={onChange}
          readOnly={readOnly}
        />
      </div>

      <div style={{ height: 14 }} />

      <RadioRow
        label="Sample Type"
        name="deviceType"
        value={sample.deviceType}
        options={["Device", "Components", "Liquid", "Gel", "Pallet", "Powder"]}
        onChange={onChange}
        readOnly={readOnly}
      />

      <RadioRow
        label="Bulk submission?"
        name="isBulkLabel"
        value={sample.isBulk ? "Yes" : "No"}
        options={["Yes", "No"]}
        onChange={(e) => onChange({ target: { name: "isBulk", value: e.target.value === "Yes" } })}
        readOnly={readOnly}
      />

      <TextareaField
        label="Description"
        name="sampleDescription"
        value={sample.sampleDescription}
        onChange={onChange}
        readOnly={readOnly}
      />
      <TextareaField
        label="Intended Use"
        name="intendedUse"
        value={sample.intendedUse}
        onChange={onChange}
        readOnly={readOnly}
      />
    </>
  );
}

function StepCondition({ sample, onChange, readOnly }) {
  return (
    <>
      <RadioRow
        label="Shipping Condition"
        name="shippingCondition"
        value={sample.shippingCondition}
        options={["Ambient", "On Ice", "On Dry Ice"]}
        onChange={onChange}
        readOnly={readOnly}
      />
      <RadioRow
        label="Sample Storage"
        name="sampleStorage"
        value={sample.sampleStorage}
        options={[
          "Room Temperature",
          "Refrigerated",
          "Freezer -10°C to -25°C",
          "Freezer ≤ -70°C",
        ]}
        onChange={onChange}
        readOnly={readOnly}
      />
      <RadioRow
        label="Sample Disposition"
        name="sampleDisposition"
        value={sample.sampleDisposition}
        options={["Discard", "Return Unused Samples", "Return All Samples"]}
        onChange={onChange}
        readOnly={readOnly}
      />
      <RadioRow
        label="Sterility"
        name="sampleSterile"
        value={sample.sampleSterile}
        options={["Sterile", "Non-Sterile"]}
        onChange={onChange}
        readOnly={readOnly}
      />
      {sample.sampleSterile === "Sterile" && (
        <>
          <RadioRow
            label="Sterilization Method"
            name="sterilizationMethod"
            value={sample.sterilizationMethod}
            options={["Radiation", "EtO", "Steam"]}
            onChange={onChange}
            readOnly={readOnly}
          />
          <div className={styles.fieldGrid}>
            <TextField
              label="Sterilization Date"
              name="sterilizationDate"
              value={sample.sterilizationDate}
              onChange={onChange}
              readOnly={readOnly}
              type="date"
            />
            <TextField
              label="Sterilized By"
              name="sterilizedBy"
              value={sample.sterilizedBy}
              onChange={onChange}
              readOnly={readOnly}
            />
          </div>
        </>
      )}
      <TextareaField
        label="Safety Precautions"
        name="safetyPrecautions"
        value={sample.safetyPrecautions}
        onChange={onChange}
        readOnly={readOnly}
      />
      <TextareaField
        label="Handling Requirements"
        name="handlingRequirements"
        value={sample.handlingRequirements}
        onChange={onChange}
        readOnly={readOnly}
      />
    </>
  );
}

function StepDetails({ sample, onChange, readOnly }) {
  return (
    <>
      <div className={styles.fieldGrid2}>
        <SelectField
          label="Study Compliance"
          name="studyCompliance"
          value={sample.studyCompliance}
          onChange={onChange}
          readOnly={readOnly}
          options={["GLP", "Non-GLP", "NABL (ISO 17025)", "ASCA (A2LA)", "Non-NABL", "Other"]}
        />
        <TextField
          label="Product Type"
          name="productType"
          value={sample.productType}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Method of Manufacturing"
          name="methodOfManufacturing"
          value={sample.methodOfManufacturing}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Chemical Name"
          name="chemicalName"
          value={sample.chemicalName}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="CAS Number"
          name="casNumber"
          value={sample.casNumber}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Molecular Formula"
          name="molecularFormula"
          value={sample.molecularFormula}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Molecular Weight"
          name="molecularWeight"
          value={sample.molecularWeight}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="pH"
          name="pH"
          value={sample.pH}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Purity / Concentration"
          name="purityConcentration"
          value={sample.purityConcentration}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Density"
          name="density"
          value={sample.density}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Solubility"
          name="solubility"
          value={sample.solubility}
          onChange={onChange}
          readOnly={readOnly}
        />
        <TextField
          label="Product Color"
          name="productColor"
          value={sample.productColor}
          onChange={onChange}
          readOnly={readOnly}
        />
        <SelectField
          label="Wall Thickness"
          name="wallThickness"
          value={sample.wallThickness}
          options={[">1.0 mm", "<1.0 mm"]}
          onChange={onChange}
          readOnly={readOnly}
        />
        <SelectField
          label="Extraction Ratio"
          name="extractionRatios"
          value={sample.extractionRatios}
          options={["3 cm2/ml", "6 cm2/ml"]}
          onChange={onChange}
          readOnly={readOnly}
        />
        <SelectField
          label="Biohazard?"
          name="biohazard"
          value={sample.biohazard}
          options={["Yes", "No"]}
          onChange={onChange}
          readOnly={readOnly}
        />
      </div>
      <div style={{ height: 14 }} />
      <TextareaField
        label="Composition"
        name="composition"
        value={sample.composition}
        onChange={onChange}
        readOnly={readOnly}
      />
      <TextareaField
        label="Packaging Details"
        name="packagingDetails"
        value={sample.packagingDetails}
        onChange={onChange}
        readOnly={readOnly}
      />
      <TextareaField
        label="Special Instructions"
        name="specialInstructions"
        value={sample.specialInstructions}
        onChange={onChange}
        readOnly={readOnly}
      />
    </>
  );
}

function StepImages({ sample, setSample, readOnly }) {
  const generalRef = useRef(null);
  const labelingRef = useRef(null);
  const images = sample.sampleImages || { general: null, labeling: null };

  const upload = (type) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSample((prev) => ({
        ...prev,
        sampleImages: { ...(prev.sampleImages || {}), [type]: reader.result },
      }));
    };
    reader.readAsDataURL(file);
  };

  const renderTile = (type, title, hint, ref) => (
    <div
      className={`${styles.imageTile} ${readOnly ? styles.imageTileLocked : ""}`}
      onClick={() => !readOnly && ref.current?.click()}
    >
      <div>
        <div className={styles.imageTitle}>{title}</div>
        <div className={styles.imageHint}>{hint}</div>
      </div>
      {images[type] ? (
        <img src={images[type]} alt={title} className={styles.imagePreview} />
      ) : (
        <div className={styles.imageEmpty}>
          {readOnly ? "No image uploaded" : "Click to upload an image"}
        </div>
      )}
      {!readOnly && (
        <input
          ref={ref}
          type="file"
          accept="image/*"
          onChange={upload(type)}
          style={{ display: "none" }}
        />
      )}
    </div>
  );

  return (
    <div className={styles.imageGrid}>
      {renderTile("general", "General Sample Photo", "A clear photo of the sample.", generalRef)}
      {renderTile("labeling", "Labeling / Packaging Photo", "Lot / part / expiry visible.", labelingRef)}
    </div>
  );
}

function StepTests({ sample, setSample, readOnly, testCodes = [] }) {
  const tests = Array.isArray(sample.requestedTests) ? sample.requestedTests : [];

  const addTest = (e) => {
    const id = e.target.value;
    if (!id) return;
    const tc = testCodes.find((t) => t._id === id);
    if (!tc) return;
    // Don't add duplicates.
    if (tests.some((r) => String(r.testCodeId) === String(tc._id))) {
      e.target.value = "";
      return;
    }
    const row = {
      testCodeId: tc._id,
      grkCode: tc.code,
      description: tc.descriptionShort || tc.descriptionLong || "",
      category: tc.category || "",
      extractBased: tc.extractBased || "",
      assignmentStatus: "Unassigned",
    };
    setSample((prev) => ({ ...prev, requestedTests: [...(prev.requestedTests || []), row] }));
    e.target.value = "";
  };

  const removeTest = (idx) => {
    setSample((prev) => ({
      ...prev,
      requestedTests: (prev.requestedTests || []).filter((_, i) => i !== idx),
    }));
  };

  const available = useMemo(() => {
    const used = new Set(tests.map((r) => String(r.testCodeId)));
    return testCodes.filter((t) => !used.has(String(t._id)));
  }, [testCodes, tests]);

  return (
    <>
      {!readOnly && (
        <div className={styles.testsHeader}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Pick the tests you'd like us to run. The lab will assign a vendor and instances after the sample arrives.
          </div>
          <select onChange={addTest} defaultValue="">
            <option value="">+ Add test code…</option>
            {available.map((t) => (
              <option key={t._id} value={t._id}>
                {t.code} — {t.descriptionShort || t.descriptionLong}
              </option>
            ))}
          </select>
        </div>
      )}

      {tests.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
          No tests requested yet.
        </div>
      ) : (
        <table className={styles.testsTable}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Category</th>
              <th>Status</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {tests.map((r, idx) => (
              <tr key={r.testCodeId || idx}>
                <td>{r.grkCode || "—"}</td>
                <td>{r.description || "—"}</td>
                <td>{r.category || "—"}</td>
                <td>{r.assignmentStatus || "Unassigned"}</td>
                {!readOnly && (
                  <td>
                    <button type="button" className={styles.removeBtn} onClick={() => removeTest(idx)}>
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* =================================================================
   Step indicator
================================================================= */

function StepIndicator({ step, setStep, maxStepReached }) {
  return (
    <div className={styles.steps}>
      {STEPS.map((s, idx) => {
        const isActive = idx === step;
        const isDone = idx < step || idx <= (maxStepReached ?? -1);
        const cls = [styles.step, isActive && styles.stepActive, !isActive && isDone && styles.stepDone]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={s.key}
            type="button"
            className={cls}
            onClick={() => setStep(idx)}
          >
            <div className={styles.stepBullet}>{idx + 1}</div>
            <div>
              <div className={styles.stepLabel}>{s.label}</div>
              <div className={styles.stepHint}>{s.hint}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* =================================================================
   Main wizard
================================================================= */

export default function SampleWizard({
  sample,
  setSample,
  readOnly = false,
  step,
  setStep,
  testCodes,
  projectOptions,
}) {
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (!setSample) return;
    setSample((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 0));
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const stepMeta = STEPS[step];

  return (
    <>
      <StepIndicator step={step} setStep={setStep} maxStepReached={STEPS.length - 1} />

      <div className={styles.slide}>
        <div className={styles.slideHead}>
          <div>
            <h2>
              {stepMeta.icon} <span style={{ marginLeft: 6 }}>{stepMeta.label}</span>
            </h2>
            <p>{stepMeta.hint}</p>
          </div>
          <div className={styles.stepCounter}>
            Step {step + 1} of {STEPS.length}
          </div>
        </div>

        {step === 0 && (
          <StepInfo
            sample={sample}
            onChange={onChange}
            readOnly={readOnly}
            projectOptions={projectOptions}
          />
        )}
        {step === 1 && (
          <StepCondition sample={sample} onChange={onChange} readOnly={readOnly} />
        )}
        {step === 2 && (
          <StepDetails sample={sample} onChange={onChange} readOnly={readOnly} />
        )}
        {step === 3 && (
          <StepImages sample={sample} setSample={setSample} readOnly={readOnly} />
        )}
        {step === 4 && (
          <StepTests
            sample={sample}
            setSample={setSample}
            readOnly={readOnly}
            testCodes={testCodes || []}
          />
        )}
      </div>

      <div className={styles.nav}>
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirst}
          style={{
            background: "#ffffff",
            color: isFirst ? "#9ca3af" : "#4570B6",
            border: "1px solid #d1d5db",
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 500,
            cursor: isFirst ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Previous
        </button>
        <div className={styles.navRight}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={isLast}
            style={{
              background: isLast ? "#9ca3af" : "#4570B6",
              color: "#ffffff",
              border: "none",
              padding: "11px 22px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: isLast ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}

export { STEPS as SAMPLE_WIZARD_STEPS };
