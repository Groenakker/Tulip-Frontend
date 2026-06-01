import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaUndo, FaCalculator } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import toast from "../../../components/Toaster/toast";
import {
  listTRACompounds,
  getAvailablePods,
  getAssignmentPodAssessment,
  updateAssignmentPodAssessment,
  confirmReview,
  reopenReview,
} from "./tra.api";
import PODSelector from "./review/PODSelector";
import UncertaintyFactors from "./review/UncertaintyFactors";
import RiskCharacterization from "./review/RiskCharacterization";
import styles from "./TRAReview.module.css";
import panelStyles from "./review/Review.module.css";

/**
 * TRA Review workspace.
 *
 * Three panels (POD selection, uncertainty factors, risk
 * characterisation) wired against the per-assignment endpoints. The
 * URL carries `?assignment=<id>` so it can be deep-linked.
 */
export default function TRAReview() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get("assignment");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState(null);
  const [pods, setPods] = useState([]);
  const [assessment, setAssessment] = useState(null);

  const [selectedPodKey, setSelectedPodKey] = useState(null);
  const [factors, setFactors] = useState({
    uf_interspecies: 10,
    uf_intraspecies: 10,
    uf_subchronic_chronic: 1,
    uf_loael_noael: 1,
    uf_database: 1,
  });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const [comps, podData, assess] = await Promise.all([
        listTRACompounds(projectId),
        getAvailablePods(projectId, assignmentId).catch(() => ({ pods: [] })),
        getAssignmentPodAssessment(projectId, assignmentId).catch(() => null),
      ]);
      const items = Array.isArray(comps?.items) ? comps.items : Array.isArray(comps) ? comps : [];
      setAssignment(items.find((c) => c.id === assignmentId) || null);
      const podList = Array.isArray(podData?.pods) ? podData.pods : Array.isArray(podData) ? podData : [];
      setPods(podList);

      if (assess) {
        setAssessment(assess);
        setSelectedPodKey(assess.selected_pod_key || null);
        setFactors({
          uf_interspecies: assess.uf_interspecies ?? 10,
          uf_intraspecies: assess.uf_intraspecies ?? 10,
          uf_subchronic_chronic: assess.uf_subchronic_chronic ?? 1,
          uf_loael_noael: assess.uf_loael_noael ?? 1,
          uf_database: assess.uf_database ?? 1,
        });
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load review");
    } finally {
      setLoading(false);
    }
  }, [projectId, assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePodSelect = (pod) => {
    const key = pod.key || `${pod.source}:${pod.study_type || pod.endpoint}`;
    setSelectedPodKey(key);
  };

  const handleCalculate = async () => {
    if (!selectedPodKey) {
      toast.error("Select a POD first");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateAssignmentPodAssessment(projectId, assignmentId, {
        selected_pod_key: selectedPodKey,
        ...factors,
      });
      setAssessment(updated);
      toast.success("Assessment updated");
    } catch (err) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await confirmReview(projectId, assignmentId, {});
      toast.success("Review confirmed");
      navigate(`/Toxicology/TRA/${projectId}`);
    } catch (err) {
      toast.error(err?.message || "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    try {
      await reopenReview(projectId, assignmentId, {});
      toast.success("Review reopened");
      load();
    } catch (err) {
      toast.error(err?.message || "Reopen failed");
    } finally {
      setBusy(false);
    }
  };

  if (!assignmentId) {
    return (
      <>
        <Header title="TRA Review" />
        <WhiteIsland className="WhiteIsland">
          <p className={styles.loading}>
            Missing <code>?assignment=</code> query parameter.
          </p>
        </WhiteIsland>
      </>
    );
  }

  return (
    <>
      <Header title={assignment?.library_compound?.name || "TRA Review"} />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate(`/Toxicology/TRA/${projectId}`)}
          >
            <FaArrowLeft />
            <span>Back to project</span>
          </button>
          <div className={styles.toolbarRight}>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={handleReopen}
              disabled={busy}
            >
              <FaUndo />
              <span>Reopen</span>
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleConfirm}
              disabled={busy || !assessment}
            >
              <FaCheck />
              <span>Confirm review</span>
            </button>
          </div>
        </div>

        {loading ? (
          <p className={styles.loading}>Loading review workspace...</p>
        ) : (
          <div className={panelStyles.workspace}>
            <section className={panelStyles.panel}>
              <h3>Uncertainty factors</h3>
              <UncertaintyFactors values={factors} onChange={setFactors} />
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleCalculate}
                disabled={saving}
                style={{ marginTop: 12 }}
              >
                <FaCalculator />
                <span>{saving ? "Calculating..." : "Calculate"}</span>
              </button>
            </section>

            <div className={styles.rightStack}>
              <section className={panelStyles.panel}>
                <h3>Point of Departure</h3>
                <PODSelector
                  pods={pods}
                  selectedKey={selectedPodKey}
                  onSelect={handlePodSelect}
                />
              </section>

              <section className={panelStyles.panel}>
                <h3>Risk characterisation</h3>
                <RiskCharacterization assessment={assessment} />
              </section>
            </div>
          </div>
        )}
      </WhiteIsland>
    </>
  );
}
