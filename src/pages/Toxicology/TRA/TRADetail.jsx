import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaPlus, FaTrash, FaStethoscope } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import toast from "../../../components/Toaster/toast";
import {
  getTRAProject,
  updateTRAProject,
  listTRACompounds,
  addTRACompound,
  removeTRACompound,
} from "./tra.api";
import { listLibrary } from "../Library/library.api";
import styles from "./TRADetail.module.css";

/**
 * TRA Project detail page.
 *
 * Header summarises the project, plus an editable description, an
 * "add compound from library" form, and a table of currently assigned
 * compounds with review status. Clicking a row goes to the per-
 * assignment Review workspace.
 */
export default function TRADetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, lib] = await Promise.all([
        getTRAProject(id),
        listTRACompounds(id),
        listLibrary({ page_size: 200 }),
      ]);
      setProject(p);
      setCompounds(Array.isArray(c?.items) ? c.items : Array.isArray(c) ? c : []);
      setLibrary(Array.isArray(lib?.items) ? lib.items : []);
      setDescription(p?.description ?? "");
    } catch (err) {
      toast.error(err?.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveDescription = async () => {
    setSaving(true);
    try {
      const updated = await updateTRAProject(id, { description });
      setProject(updated);
      toast.success("Project updated");
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCompound = async (e) => {
    e.preventDefault();
    if (!selectedLibraryId) return;
    setAdding(true);
    try {
      await addTRACompound(id, { library_compound_id: selectedLibraryId });
      toast.success("Compound assigned");
      setSelectedLibraryId("");
      const c = await listTRACompounds(id);
      setCompounds(Array.isArray(c?.items) ? c.items : Array.isArray(c) ? c : []);
    } catch (err) {
      toast.error(err?.message || "Assign failed");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveCompound = async (assignmentId, e) => {
    e.stopPropagation();
    if (!window.confirm("Remove this compound from the project?")) return;
    try {
      await removeTRACompound(id, assignmentId);
      toast.success("Removed");
      setCompounds((rows) => rows.filter((r) => r.id !== assignmentId));
    } catch (err) {
      toast.error(err?.message || "Remove failed");
    }
  };

  if (loading) {
    return (
      <>
        <Header title="TRA project" />
        <WhiteIsland className="WhiteIsland">
          <p className={styles.loading}>Loading project...</p>
        </WhiteIsland>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Header title="TRA project" />
        <WhiteIsland className="WhiteIsland">
          <p className={styles.loading}>Project not found.</p>
        </WhiteIsland>
      </>
    );
  }

  return (
    <>
      <Header title={project.name || "TRA project"} />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/Toxicology/TRA")}
          >
            <FaArrowLeft />
            <span>Back to projects</span>
          </button>
        </div>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h3>Project profile</h3>
            <dl className={styles.kv}>
              <Field label="Code" value={project.project_code} />
              <Field label="Status" value={project.status} />
              <Field label="Exposure route" value={project.exposure_route} />
              <Field label="Contact category" value={project.device_contact_category} />
              <Field label="Contact duration" value={project.contact_duration_category} />
              <Field label="Patient population" value={project.patient_population} />
              <Field
                label="Created"
                value={
                  project.created_date
                    ? new Date(project.created_date).toLocaleString()
                    : "—"
                }
              />
              <Field
                label="Modified"
                value={
                  project.modified_date
                    ? new Date(project.modified_date).toLocaleString()
                    : "—"
                }
              />
            </dl>
          </section>

          <section className={styles.card}>
            <h3>Description</h3>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add an internal description / scope..."
            />
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSaveDescription}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </section>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Assigned compounds</h3>
            <form onSubmit={handleAddCompound} className={styles.assignForm}>
              <select
                value={selectedLibraryId}
                onChange={(e) => setSelectedLibraryId(e.target.value)}
              >
                <option value="">Pick a library compound...</option>
                {library.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.cas_number ? `(${c.cas_number})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={adding || !selectedLibraryId}
              >
                <FaPlus />
                <span>{adding ? "Assigning..." : "Assign"}</span>
              </button>
            </form>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Compound</th>
                <th>CAS</th>
                <th>POD source</th>
                <th>Review</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {compounds.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    No compounds yet. Pick one from the library above.
                  </td>
                </tr>
              ) : (
                compounds.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/Toxicology/TRA/${id}/review?assignment=${row.id}`)}
                  >
                    <td>{row.library_compound?.name || row.compound_name || row.id}</td>
                    <td>{row.library_compound?.cas_number || row.cas_number || "—"}</td>
                    <td>{row.pod_source || "—"}</td>
                    <td>
                      <span className={`${styles.reviewBadge} ${styles[row.review_status || "draft"]}`}>
                        {row.review_status || "draft"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.primary}`}
                        title="Open review"
                        onClick={() => navigate(`/Toxicology/TRA/${id}/review?assignment=${row.id}`)}
                      >
                        <FaStethoscope />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.danger}`}
                        title="Remove"
                        onClick={(e) => handleRemoveCompound(row.id, e)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
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
