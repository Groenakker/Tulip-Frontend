import React, { useEffect, useState, useCallback } from "react";
import { FaPlus } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import Modal from "../../../components/Modal";
import toast from "../../../components/Toaster/toast";
import {
  listGovernanceRules,
  listGovernanceFeedback,
  createGovernanceRule,
  submitGovernanceFeedback,
  simulateGovernance,
} from "../Families/families.api";
import styles from "./Governance.module.css";

/**
 * Family Governance admin page.
 *
 * Two stacked panels — Rules and Feedback — plus a modal-based rule
 * editor that POSTs to /compound-families/governance/rules. The
 * backend currently returns 501 for the write endpoints (it's a
 * scaffold), but the form is wired correctly for the day the full
 * implementation lands.
 */
export default function Governance() {
  const [rules, setRules] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const [ruleForm, setRuleForm] = useState({
    family_name: "",
    family_type: "structural",
    detection_pattern: "",
    notes: "",
  });
  const [feedbackForm, setFeedbackForm] = useState({
    family_id: "",
    feedback_type: "false_positive",
    notes: "",
  });
  const [simulateForm, setSimulateForm] = useState({ compound_name: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([
        listGovernanceRules(),
        listGovernanceFeedback(),
      ]);
      setRules(Array.isArray(r?.items) ? r.items : []);
      setFeedback(Array.isArray(f?.items) ? f.items : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load governance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      await createGovernanceRule(ruleForm);
      toast.success("Rule submitted");
      setShowRuleModal(false);
      load();
    } catch (err) {
      // 501 is expected while the backend is scaffolded.
      toast.error(err?.message || "Create rule failed");
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      await submitGovernanceFeedback(feedbackForm);
      toast.success("Feedback submitted");
      setShowFeedbackModal(false);
      load();
    } catch (err) {
      toast.error(err?.message || "Submit feedback failed");
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const res = await simulateGovernance(simulateForm);
      setSimResult(res);
    } catch (err) {
      toast.error(err?.message || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <>
      <Header title="Family Governance" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Detection rules</h3>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setShowRuleModal(true)}
              >
                <FaPlus />
                <span>New rule</span>
              </button>
            </div>
            {loading ? (
              <p className={styles.muted}>Loading rules...</p>
            ) : rules.length === 0 ? (
              <p className={styles.muted}>No rules defined yet.</p>
            ) : (
              <ul className={styles.list}>
                {rules.map((r, i) => (
                  <li key={r.id || i}>
                    <strong>{r.family_name}</strong>
                    <span className={styles.tag}>{r.family_type}</span>
                    <span className={styles.mono}>{r.detection_pattern}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h3>Feedback</h3>
              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => setShowFeedbackModal(true)}
              >
                <FaPlus />
                <span>Submit feedback</span>
              </button>
            </div>
            {loading ? (
              <p className={styles.muted}>Loading feedback...</p>
            ) : feedback.length === 0 ? (
              <p className={styles.muted}>No reviewer feedback recorded.</p>
            ) : (
              <ul className={styles.list}>
                {feedback.map((f, i) => (
                  <li key={f.id || i}>
                    <span className={styles.tag}>{f.feedback_type}</span>
                    <span>Family #{f.family_id}</span>
                    <span className={styles.muted}>{f.notes}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${styles.card} ${styles.span2}`}>
            <h3>Simulate detection</h3>
            <form onSubmit={handleSimulate} className={styles.inlineForm}>
              <input
                type="text"
                placeholder="Compound name (e.g. siloxane)"
                value={simulateForm.compound_name}
                onChange={(e) => setSimulateForm({ compound_name: e.target.value })}
              />
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={simulating || !simulateForm.compound_name.trim()}
              >
                {simulating ? "Simulating..." : "Run"}
              </button>
            </form>
            {simResult && (
              <pre className={styles.pre}>{JSON.stringify(simResult, null, 2)}</pre>
            )}
          </section>
        </div>
      </WhiteIsland>

      {showRuleModal && (
        <Modal onClose={() => setShowRuleModal(false)}>
          <h3 className={styles.modalTitle}>New detection rule</h3>
          <form onSubmit={handleCreateRule} className={styles.form}>
            <label>
              Family name
              <input
                required
                value={ruleForm.family_name}
                onChange={(e) => setRuleForm((f) => ({ ...f, family_name: e.target.value }))}
              />
            </label>
            <label>
              Family type
              <select
                value={ruleForm.family_type}
                onChange={(e) => setRuleForm((f) => ({ ...f, family_type: e.target.value }))}
              >
                <option value="structural">Structural</option>
                <option value="functional">Functional</option>
                <option value="regulatory">Regulatory</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label>
              Detection pattern (SMILES / regex / SMARTS)
              <input
                required
                value={ruleForm.detection_pattern}
                onChange={(e) =>
                  setRuleForm((f) => ({ ...f, detection_pattern: e.target.value }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={ruleForm.notes}
                onChange={(e) => setRuleForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowRuleModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton}>
                Submit
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showFeedbackModal && (
        <Modal onClose={() => setShowFeedbackModal(false)}>
          <h3 className={styles.modalTitle}>Reviewer feedback</h3>
          <form onSubmit={handleSubmitFeedback} className={styles.form}>
            <label>
              Family ID
              <input
                required
                value={feedbackForm.family_id}
                onChange={(e) =>
                  setFeedbackForm((f) => ({ ...f, family_id: e.target.value }))
                }
              />
            </label>
            <label>
              Type
              <select
                value={feedbackForm.feedback_type}
                onChange={(e) =>
                  setFeedbackForm((f) => ({ ...f, feedback_type: e.target.value }))
                }
              >
                <option value="false_positive">False positive</option>
                <option value="false_negative">False negative</option>
                <option value="rule_clarification">Rule clarification</option>
              </select>
            </label>
            <label>
              Notes
              <textarea
                value={feedbackForm.notes}
                onChange={(e) =>
                  setFeedbackForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowFeedbackModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className={styles.primaryButton}>
                Submit
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
