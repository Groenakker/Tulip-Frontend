import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaBan, FaSave, FaTrash, FaArrowLeft, FaFlask, FaUserTie, FaBuilding } from "react-icons/fa";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";
import OpenRecordLink from "../../components/RecordLink/OpenRecordLink";
import toast from "../../components/Toaster/toast";
import { useAuth } from "../../context/AuthContext";
import styles from "./LabStudyDetail.module.css";
import Select from "../../components/Select/Select";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Status → (background, foreground) for the pill colours and the
// left accent stripe on the banner. Keeping the palette here means
// the CSS module can stay stateless / pure-layout.
const STATUS_PALETTE = {
  Draft: ["#f3f4f6", "#374151"],
  Assigned: ["#dbeafe", "#1e40af"],
  "In Progress": ["#fef3c7", "#92400e"],
  Completed: ["#dcfce7", "#166534"],
  Cancelled: ["#fee2e2", "#991b1b"],
};

const ACCENT_STRIPE = {
  Draft: "#9ca3af",
  Assigned: "#4570B6",
  "In Progress": "#f59e0b",
  Completed: "#16a34a",
  Cancelled: "#dc2626",
};

function StatusPill({ value }) {
  const [bg, color] = STATUS_PALETTE[value] || STATUS_PALETTE.Draft;
  return (
    <span className={styles.statusPill} style={{ background: bg, color }}>
      {value || "Draft"}
    </span>
  );
}

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
};

// Redesigned Lab Study Detail page. A study is created from a Sample
// Submission's Requested Tests row via /api/lab-studies/assign, so most
// of the data here is a denormalized snapshot of the sample + test.
// Staff can change the vendor, instances, status, notes, and result up
// until the study is Completed/Cancelled. The layout mirrors the
// detail pages elsewhere in the app: a top banner with code + status,
// a 2-column body with the editable content in the main column and a
// metadata side card, and a bottom instances table.
export default function LabStudyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("Lab Studies", "update");
  const canDelete = hasPermission("Lab Studies", "delete");

  const [study, setStudy] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [studyRes, vendorsRes] = await Promise.all([
          fetch(`${API}/lab-studies/${id}`, { credentials: "include" }),
          fetch(`${API}/test-orders/catalog/vendors`, { credentials: "include" }),
        ]);
        if (!studyRes.ok) {
          throw new Error((await studyRes.json())?.message || "Failed to load lab study");
        }
        const data = await studyRes.json();
        setStudy(data);
        if (vendorsRes.ok) setVendors(await vendorsRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const setField = (k, v) => setStudy((prev) => ({ ...prev, [k]: v }));

  const isLocked = study?.status === "Completed" || study?.status === "Cancelled";

  // Filter vendors by which BPs are allowed to perform this study's
  // test code (Business Partner → Test Codes link). If the expected
  // vendor isn't here, attach the test code to that BP first.
  const eligibleVendors = useMemo(() => {
    if (!study?.testCodeId) return vendors;
    return vendors.filter(
      (v) =>
        Array.isArray(v.testCodes) &&
        v.testCodes.some((tc) => String(tc?._id || tc) === String(study.testCodeId))
    );
  }, [vendors, study?.testCodeId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        status: study.status,
        notes: study.notes,
        result: study.result,
        vendorBpId: study.vendorBpId,
      };
      const res = await fetch(`${API}/lab-studies/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Failed to save");
      setStudy(body);
      toast.success("Lab study saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this lab study? The vendor will no longer see it.")) return;
    try {
      const res = await fetch(`${API}/lab-studies/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Failed to cancel");
      setStudy(body);
      toast.success("Study cancelled");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this lab study permanently?")) return;
    try {
      const res = await fetch(`${API}/lab-studies/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to delete");
      }
      toast.success("Lab study deleted");
      navigate("/LabStudies");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Lab Study" />
        <WhiteIsland className="WhiteIsland">
          <div className={styles.loading}>Loading lab study…</div>
        </WhiteIsland>
      </>
    );
  }
  if (error || !study) {
    return (
      <>
        <Header title="Lab Study" />
        <WhiteIsland className="WhiteIsland">
          <div className={styles.loading} style={{ color: "#b91c1c" }}>
            {error || "Lab study not found"}
          </div>
        </WhiteIsland>
      </>
    );
  }

  const accent = ACCENT_STRIPE[study.status] || ACCENT_STRIPE.Draft;

  return (
    <>
      <Header title={`Lab Study · ${study.studyCode || ""}`} />
      <div className={styles.page}>
        {/* ------------------ Top status banner ------------------ */}
        <div className={styles.banner} style={{ borderLeftColor: accent }}>
          <div className={styles.bannerLeft}>
            <h2 className={styles.code}>
              {study.studyCode}
              <StatusPill value={study.status} />
            </h2>
            <div className={styles.tags}>
              {study.sampleCode && (
                <span className={styles.tag}>
                  <strong>Sample:</strong>
                  {study.sampleCode}{" "}
                  {study.sampleId && (
                    <OpenRecordLink
                      to={`/SampleSubmission/SSDetail/${study.sampleId}`}
                      title="Open sample submission"
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </span>
              )}
              {study.customerBpName && (
                <span className={styles.tag}>
                  <strong>Customer:</strong> {study.customerBpName}
                </span>
              )}
              {study.testCodeRef && (
                <span className={styles.tag}>
                  <strong>Test:</strong> {study.testCodeRef}
                </span>
              )}
              {study.isBulk && (
                <span className={styles.tag} style={{ background: "#fef3c7", color: "#92400e" }}>
                  <strong>Bulk</strong>
                </span>
              )}
            </div>
          </div>

          <div className={styles.bannerRight}>
            <button onClick={() => navigate("/LabStudies")} className={styles.btnGhost}>
              <FaArrowLeft /> Back
            </button>
            {canEdit && !isLocked && (
              <button onClick={handleSave} disabled={saving} className={styles.btnPrimary}>
                <FaSave /> {saving ? "Saving…" : "Save"}
              </button>
            )}
            {canEdit && !isLocked && (
              <button onClick={handleCancel} className={styles.btnGhost}>
                <FaBan /> Cancel study
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete} className={styles.btnDanger}>
                <FaTrash /> Delete
              </button>
            )}
          </div>
        </div>

        {/* ------------------ Main 2-col grid ------------------ */}
        <fieldset disabled={!canEdit || isLocked} style={{ border: "none", padding: 0, margin: 0 }}>
          <div className={styles.grid}>
            {/* ------------- Left (main) column ------------- */}
            <div className={styles.col}>
              {/* ---- Context (sample / customer / project) ---- */}
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>
                    <FaFlask style={{ marginRight: 6, color: "#4570B6" }} />
                    Study Context
                  </h3>
                  <span className={styles.cardSubtitle}>From parent sample submission</span>
                </div>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Sample</span>
                    <span className={styles.fieldValue}>
                      {study.sampleCode || "—"}
                      {study.sampleId && (
                        <OpenRecordLink
                          to={`/SampleSubmission/SSDetail/${study.sampleId}`}
                          title="Open sample submission"
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Customer</span>
                    <span className={styles.fieldValue}>
                      {study.customerBpName || "—"}
                      {study.customerBpCode && (
                        <span className={styles.fieldValueMuted}> · {study.customerBpCode}</span>
                      )}
                    </span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Project</span>
                    <span className={styles.fieldValue}>{study.projectName || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Sample Name</span>
                    <span className={styles.fieldValue}>{study.sampleName || "—"}</span>
                  </div>
                </div>
              </div>

              {/* ---- Test detail ---- */}
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>Test Details</h3>
                </div>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>GRK Code</span>
                    <span className={styles.fieldValue}>{study.grkCode || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Description</span>
                    <span className={styles.fieldValue}>{study.testDescription || study.testCodeRef || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Quality</span>
                    <span className={styles.fieldValue}>{study.quality || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Category</span>
                    <span className={styles.fieldValue}>{study.category || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Extract Based</span>
                    <span className={styles.fieldValue}>{study.extractBased || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Extraction Time</span>
                    <span className={styles.fieldValue}>{study.extractionTime || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Extraction Temp</span>
                    <span className={styles.fieldValue}>{study.extractionTemp || "—"}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Samples Submitted</span>
                    <span className={styles.fieldValue}>{study.samplesSubmitted || "—"}</span>
                  </div>
                </div>
              </div>

              {/* ---- Vendor assignment + status ---- */}
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>
                    <FaBuilding style={{ marginRight: 6, color: "#4570B6" }} />
                    Vendor & Status
                  </h3>
                </div>
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Vendor (Lab)</span>
                    <Select
                      className={styles.select}
                      value={study.vendorBpId || ""}
                      onChange={(e) => setField("vendorBpId", e.target.value)}
                    >
                      <option value="">Select vendor</option>
                      {eligibleVendors.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name}{v.partnerNumber ? ` · ${v.partnerNumber}` : ""}
                        </option>
                      ))}
                    </Select>
                    {eligibleVendors.length === 0 && (
                      <div className={styles.warn}>
                        No vendor lists this test code. Attach it to a vendor in Business Partners first.
                      </div>
                    )}
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <Select
                      className={styles.select}
                      value={study.status || "Assigned"}
                      onChange={(e) => setField("status", e.target.value)}
                    >
                      {Object.keys(STATUS_PALETTE).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className={styles.field} style={{ marginTop: 14 }}>
                  <span className={styles.fieldLabel}>Internal Notes</span>
                  <textarea
                    rows={3}
                    value={study.notes || ""}
                    onChange={(e) => setField("notes", e.target.value)}
                    className={styles.textarea}
                    placeholder="Notes for the lab / coordinator (not shown to the vendor)."
                  />
                </div>

                <div className={styles.field} style={{ marginTop: 14 }}>
                  <span className={styles.fieldLabel}>Result Summary</span>
                  <textarea
                    rows={3}
                    value={study.result || ""}
                    onChange={(e) => setField("result", e.target.value)}
                    className={styles.textarea}
                    placeholder="Final result summary from the vendor."
                  />
                </div>
              </div>

              {/* ---- Instances table ---- */}
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>Assigned Instances</h3>
                  <span className={styles.cardSubtitle}>
                    {(study.instances || []).length} instance{(study.instances || []).length === 1 ? "" : "s"}
                  </span>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Instance Code</th>
                      <th>Lot #</th>
                      <th style={{ width: 80, textAlign: "right" }}>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(study.instances || []).length === 0 ? (
                      <tr>
                        <td colSpan="4" className={styles.emptyRow}>
                          No instances assigned.
                        </td>
                      </tr>
                    ) : study.instances.map((i, idx) => (
                      <tr key={String(i.instanceId)}>
                        <td>{idx + 1}</td>
                        <td>{i.instanceCode || "—"}</td>
                        <td>{i.lotNo || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          {i.instanceId && (
                            <OpenRecordLink to={`/Instance/${i.instanceId}`} title="Open instance" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ------------- Right (side) column ------------- */}
            <div className={styles.col}>
              {/* ---- Quick stats ---- */}
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>
                    <FaUserTie style={{ marginRight: 6, color: "#4570B6" }} />
                    At a Glance
                  </h3>
                </div>
                <div>
                  <div className={styles.sideStat}>
                    <span>Status</span>
                    <span><StatusPill value={study.status} /></span>
                  </div>
                  <div className={styles.sideStat}>
                    <span>Vendor</span>
                    <span>{study.vendorBpName || "Not assigned"}</span>
                  </div>
                  <div className={styles.sideStat}>
                    <span>Vendor Code</span>
                    <span>{study.vendorBpCode || "—"}</span>
                  </div>
                  <div className={styles.sideStat}>
                    <span>Instances</span>
                    <span>{(study.instances || []).length}</span>
                  </div>
                  <div className={styles.sideStat}>
                    <span>Bulk Sample</span>
                    <span>{study.isBulk ? "Yes" : "No"}</span>
                  </div>
                  <div className={styles.sideStat}>
                    <span>Quality</span>
                    <span>{study.quality || "—"}</span>
                  </div>
                </div>
              </div>

              {/* ---- Report file ---- */}
              {study.reportFile?.fileUrl && (
                <div className={styles.card}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.cardTitle}>Report</h3>
                  </div>
                  <a
                    href={study.reportFile.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnPrimary}
                    style={{ textDecoration: "none" }}
                  >
                    Open report ({study.reportFile.fileName || "file"})
                  </a>
                  {study.reportFile.uploadedAt && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                      Uploaded {fmtDate(study.reportFile.uploadedAt)}
                    </div>
                  )}
                </div>
              )}

              {/* ---- Audit / timestamps ---- */}
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3 className={styles.cardTitle}>Audit</h3>
                </div>
                <div className={styles.sideStat}>
                  <span>Created</span>
                  <span>{fmtDate(study.createdAt)}</span>
                </div>
                <div className={styles.sideStat}>
                  <span>Updated</span>
                  <span>{fmtDate(study.updatedAt)}</span>
                </div>
                {study.sentAt && (
                  <div className={styles.sideStat}>
                    <span>Sent</span>
                    <span>{fmtDate(study.sentAt)}</span>
                  </div>
                )}
                {study.completedAt && (
                  <div className={styles.sideStat}>
                    <span>Completed</span>
                    <span>{fmtDate(study.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </>
  );
}
