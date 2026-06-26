import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import WhiteIsland from "../../components/Whiteisland";
import { useAuth } from "../../context/AuthContext";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { useTableControls } from "../../hooks/useTableControls";
import SortableTh from "../../components/SortableTh";
import BulkDeleteToolbar from "../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../components/BulkDelete/bulkDeleteApi";
import styles from "./LabStudiesList.module.css";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Status pill colors — kept in sync with the global status pill
// palette used on the detail page so colors don't drift between
// the list and detail screens.
const STATUS_CLASS = {
  Draft: "statusDraft",
  Assigned: "statusSubmitted",
  "In Progress": "statusProgress",
  Completed: "statusCompleted",
  Cancelled: "statusCancelled",
};

function StatusPill({ value }) {
  const cls = STATUS_CLASS[value] || "statusDraft";
  return <span className={`statusPill ${cls}`}>{value || "Draft"}</span>;
}

// Lab Studies list. One row per study (i.e. per assigned test on a
// sample). Replaces the deprecated Test Orders list as the canonical
// place to see what tests are being performed by which vendor against
// which instances of a sample.
//
// Uses the global table look (matching CM list pages) so the
// experience is identical to Business Partner / Projects / etc.
export default function LabStudiesList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("Lab Studies", "delete");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchStudies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/lab-studies`, { credentials: "include" });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed to load");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudies();
  }, []);

  const { processed, getSortProps } = useTableControls(rows, search);

  const selection = useBulkSelection({
    visibleItems: processed,
    allItems: processed,
  });

  const handleBulkDelete = async () => {
    setDeleting(true);
    const result = await runBulkDelete({
      url: `${API}/lab-studies/bulk-delete`,
      ids: selection.selectedIdArray,
      entityLabel: "lab study",
    });
    setDeleting(false);
    if (result) {
      setConfirmOpen(false);
      selection.clear();
      fetchStudies();
    }
  };

  const totalCols = canDelete ? 8 : 7;

  return (
    <>
      <Header title="Lab Studies" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.page}>
          <div className={styles.toolbar}>
            <input
              type="search"
              placeholder="Search studies, samples, vendors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.search}
            />
            <div className={styles.toolbarRight}>
              {canDelete && (
                <BulkDeleteToolbar
                  count={selection.count}
                  onClear={selection.clear}
                  onDelete={() => setConfirmOpen(true)}
                  disabled={deleting}
                  entityLabel="lab study"
                />
              )}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <table className={styles.table}>
            <thead>
              <tr>
                {canDelete && (
                  <th className={styles.checkboxCell}>
                    <input {...selection.headerCheckboxProps} />
                  </th>
                )}
                <SortableTh sortProps={getSortProps("studyCode")}>Study</SortableTh>
                <SortableTh sortProps={getSortProps("sampleCode")}>Sample</SortableTh>
                <SortableTh sortProps={getSortProps("grkCode")}>Test</SortableTh>
                <SortableTh sortProps={getSortProps("vendorBpName")}>Vendor</SortableTh>
                <th>Instances</th>
                <SortableTh sortProps={getSortProps("status")}>Status</SortableTh>
                <SortableTh sortProps={getSortProps("createdAt")}>Created</SortableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={totalCols} className={styles.empty}>Loading…</td>
                </tr>
              ) : processed.length ? (
                processed.map((s) => {
                  const isSelected = selection.isSelected(s._id);
                  return (
                    <tr
                      key={s._id}
                      className={isSelected ? "bulkSelectedRow" : ""}
                      onClick={() => navigate(`/LabStudies/${s._id}`)}
                    >
                      {canDelete && (
                        <td
                          className={styles.checkboxCell}
                          onClick={(e) => {
                            e.stopPropagation();
                            selection.toggleItem(s._id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => selection.toggleItem(s._id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select study ${s.studyCode}`}
                          />
                        </td>
                      )}
                      <td>
                        <Link
                          to={`/LabStudies/${s._id}`}
                          className={styles.link}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.studyCode}
                        </Link>
                      </td>
                      <td>{s.sampleCode || <span className={styles.muted}>—</span>}</td>
                      <td>{s.grkCode || s.testCodeRef || <span className={styles.muted}>—</span>}</td>
                      <td>{s.vendorBpName || <span className={styles.muted}>—</span>}</td>
                      <td className={styles.instancesCell} title={(s.instances || []).map((i) => i.instanceCode).join(", ")}>
                        {(s.instances || []).map((i) => i.instanceCode).join(", ") || <span className={styles.muted}>—</span>}
                      </td>
                      <td><StatusPill value={s.status} /></td>
                      <td>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={totalCols} className={styles.empty}>
                    No lab studies yet. Assign instances + a vendor to a test on a Sample Submission to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </WhiteIsland>

      <ConfirmDeleteModal
        open={confirmOpen}
        count={selection.count}
        entityLabel="lab study"
        previewItems={selection.selectedItems}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        deleting={deleting}
      />
    </>
  );
}
