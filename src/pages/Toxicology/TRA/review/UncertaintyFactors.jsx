import React from "react";
import styles from "./Review.module.css";

/**
 * UncertaintyFactors
 * -------------------------------------------------------------
 * The five ISO 10993-17 / ICH M7 uncertainty factors. Each is a
 * small numeric input bound back to the parent's `overrides`
 * state. The product of all five is displayed as the composite
 * UF; the parent applies it when sending the PATCH to /pod-
 * assessment.
 */
const FACTORS = [
  { key: "uf_interspecies", label: "Interspecies (UFA)" },
  { key: "uf_intraspecies", label: "Intraspecies (UFH)" },
  { key: "uf_subchronic_chronic", label: "Sub-chronic → chronic (UFS)" },
  { key: "uf_loael_noael", label: "LOAEL → NOAEL (UFL)" },
  { key: "uf_database", label: "Database completeness (UFD)" },
];

export default function UncertaintyFactors({ values = {}, onChange, disabled }) {
  const composite = FACTORS.reduce((acc, f) => {
    const v = Number(values[f.key]);
    return Number.isFinite(v) && v > 0 ? acc * v : acc;
  }, 1);

  return (
    <div>
      <div className={styles.factorGrid}>
        {FACTORS.map((f) => (
          <label key={f.key} className={styles.factorRow}>
            <span>{f.label}</span>
            <input
              type="number"
              min="1"
              step="0.5"
              value={values[f.key] ?? ""}
              onChange={(e) => onChange?.({ ...values, [f.key]: e.target.value })}
              disabled={disabled}
            />
          </label>
        ))}
      </div>
      <div className={styles.composite}>
        <strong>Composite UF:</strong> {composite > 0 ? composite.toLocaleString() : "—"}
      </div>
    </div>
  );
}
