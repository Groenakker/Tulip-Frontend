import React from "react";
import styles from "./Review.module.css";

/**
 * PODSelector
 * -------------------------------------------------------------
 * Lets the reviewer pick which Point of Departure (POD) the
 * downstream calculation should use. The backend returns a
 * shortlist of candidates from `/tra-projects/:p/compounds/:a/
 * available-pods`; we render them as radio cards.
 */
export default function PODSelector({ pods = [], selectedKey, onSelect, disabled }) {
  if (!pods.length) {
    return (
      <div className={styles.emptyBlock}>
        No PODs available yet. Refresh the assignment after the dossier
        finishes researching.
      </div>
    );
  }

  return (
    <div className={styles.podGrid}>
      {pods.map((pod) => {
        const key = pod.key || `${pod.source}:${pod.study_type || pod.endpoint}`;
        const active = key === selectedKey;
        return (
          <button
            key={key}
            type="button"
            className={`${styles.podCard} ${active ? styles.podCardActive : ""}`}
            onClick={() => onSelect?.(pod)}
            disabled={disabled}
          >
            <div className={styles.podHeader}>
              <span className={styles.podSource}>{pod.source || "Unknown"}</span>
              {pod.confidence ? (
                <span className={styles.podConfidence}>{pod.confidence}</span>
              ) : null}
            </div>
            <div className={styles.podValue}>
              {pod.value != null ? `${pod.value} ${pod.unit || ""}` : "—"}
            </div>
            <div className={styles.podMeta}>
              {pod.endpoint || pod.study_type || "—"}
            </div>
            {pod.species && (
              <div className={styles.podSpecies}>{pod.species}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
