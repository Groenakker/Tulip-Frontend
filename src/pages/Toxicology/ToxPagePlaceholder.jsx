import React from "react";
import WhiteIsland from "../../components/Whiteisland";
import Header from "../../components/Header";
import styles from "./ToxPagePlaceholder.module.css";

/**
 * Shared placeholder for Toxicology pages that haven't been ported yet.
 *
 * Renders the standard Tulip page chrome (Header + WhiteIsland) so the
 * page slots into the rest of the app visually even before its real
 * implementation lands. Replace by the real page when each Phase 3
 * sub-task is completed.
 */
export default function ToxPagePlaceholder({ title, description, children }) {
  return (
    <>
      <Header title={title} />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.placeholder}>
          <h2 className={styles.heading}>{title}</h2>
          {description ? <p className={styles.body}>{description}</p> : null}
          {children}
        </div>
      </WhiteIsland>
    </>
  );
}
