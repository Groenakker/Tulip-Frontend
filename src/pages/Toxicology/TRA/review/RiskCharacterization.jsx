import React from "react";
import styles from "./Review.module.css";

/**
 * RiskCharacterization
 * -------------------------------------------------------------
 * Computes and renders the derived TI (Tolerable Intake) and
 * Margin of Safety using the selected POD + composite UF. The
 * heavy lifting happens server-side (assessment service); this
 * component is a read-only summary of the response payload.
 */
export default function RiskCharacterization({ assessment }) {
  if (!assessment) {
    return (
      <div className={styles.emptyBlock}>
        Pick a POD and uncertainty factors, then click <em>Calculate</em> to
        populate this panel.
      </div>
    );
  }

  const {
    pod_value,
    pod_unit,
    composite_uf,
    tolerable_intake,
    tolerable_intake_unit,
    estimated_exposure,
    estimated_exposure_unit,
    margin_of_safety,
    risk_decision,
    rationale,
  } = assessment;

  return (
    <div className={styles.riskBlock}>
      <div className={styles.riskGrid}>
        <Stat label="POD" value={pod_value} unit={pod_unit} />
        <Stat label="Composite UF" value={composite_uf} />
        <Stat
          label="Tolerable Intake"
          value={tolerable_intake}
          unit={tolerable_intake_unit}
        />
        <Stat
          label="Estimated Exposure"
          value={estimated_exposure}
          unit={estimated_exposure_unit}
        />
        <Stat label="Margin of Safety" value={margin_of_safety} />
        <Stat label="Decision" value={risk_decision} />
      </div>
      {rationale && (
        <div className={styles.rationale}>
          <h4>Rationale</h4>
          <p>{rationale}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, unit }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>
        {value == null || value === "" ? "—" : String(value)}
        {unit && value != null ? <span className={styles.statUnit}> {unit}</span> : null}
      </div>
    </div>
  );
}
