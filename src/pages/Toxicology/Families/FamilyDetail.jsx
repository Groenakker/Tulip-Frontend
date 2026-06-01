import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import toast from "../../../components/Toaster/toast";
import { getFamily } from "./families.api";
import styles from "./FamilyDetail.module.css";

/**
 * Compound Family detail.
 *
 * The backend returns a `payload` object whose shape mirrors the
 * original Python detail endpoint — we render the most important
 * panels (overview + members + sources) and dump the rest in a
 * collapsible JSON tree so nothing gets lost.
 */
export default function FamilyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFamily(id);
      setFamily(data);
    } catch (err) {
      toast.error(err?.message || "Failed to load family");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <>
        <Header title="Family" />
        <WhiteIsland className="WhiteIsland">
          <p className={styles.loading}>Loading family...</p>
        </WhiteIsland>
      </>
    );
  }

  if (!family) {
    return (
      <>
        <Header title="Family" />
        <WhiteIsland className="WhiteIsland">
          <p className={styles.loading}>Family not found.</p>
        </WhiteIsland>
      </>
    );
  }

  const members = Array.isArray(family.members) ? family.members : [];

  return (
    <>
      <Header title={family.name || family.family_name || "Family"} />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/Toxicology/Families")}
          >
            <FaArrowLeft />
            <span>Back to families</span>
          </button>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h3>Overview</h3>
            <dl className={styles.kv}>
              <Field label="Family ID" value={family.family_id || id} />
              <Field label="Name" value={family.name || family.family_name} />
              <Field label="Type" value={family.family_type} />
              <Field label="Regulatory basis" value={family.regulatory_basis} />
              <Field label="Detection method" value={family.detection_method} />
              <Field label="Confidence" value={family.confidence} />
              <Field label="Member count" value={members.length || family.member_count} />
            </dl>
          </section>

          <section className={styles.card}>
            <h3>Members</h3>
            {members.length === 0 ? (
              <p className={styles.muted}>No members listed.</p>
            ) : (
              <ul className={styles.memberList}>
                {members.map((m, i) => (
                  <li key={m.id || m.cas_number || i}>
                    <strong>{m.name || m.compound_name || "—"}</strong>
                    {m.cas_number && <span className={styles.mono}> ({m.cas_number})</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${styles.card} ${styles.span2}`}>
            <h3>Raw payload</h3>
            <details>
              <summary>Show full payload ({Object.keys(family).length} keys)</summary>
              <pre className={styles.pre}>{JSON.stringify(family, null, 2)}</pre>
            </details>
          </section>
        </div>
      </WhiteIsland>
    </>
  );
}

function Field({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value == null || value === "" ? "—" : String(value)}</dd>
    </>
  );
}
