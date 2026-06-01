import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import Modal from "../../../components/Modal";
import SortableTh from "../../../components/SortableTh";
import { useTableControls } from "../../../hooks/useTableControls";
import toast from "../../../components/Toaster/toast";
import {
  listTRAProjects,
  createTRAProject,
  deleteTRAProject,
} from "./tra.api";
import styles from "./TRAList.module.css";

/**
 * TRA Projects list page. Behaves the same way as ProjectList.jsx:
 * search-everything, client-side sort + pagination, click-through to
 * detail, modal-based create.
 */
export default function TRAList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [inputValue, setInputValue] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Create-form state. The Tox project schema is large; we capture the
  // most common fields and let the rest fall back to backend defaults.
  const [form, setForm] = useState({
    name: "",
    project_code: "",
    description: "",
    exposure_route: "dermal",
    device_contact_category: "surface",
    contact_duration_category: "limited",
    patient_population: "adult_male",
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTRAProjects({ page_size: 200 });
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load TRA projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    const update = () => {
      const baseHeight = 703;
      const baseRows = 9;
      const incrementPx = 42;
      const extra = Math.floor((window.innerHeight - baseHeight) / incrementPx);
      setPageSize(baseRows + Math.max(0, extra));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => setPage(1), [inputValue]);

  const { processed: filtered, getSortProps } = useTableControls(rows, inputValue, {
    defaultSortKey: "modified_date",
    defaultSortDirection: "desc",
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    setCreating(true);
    try {
      const created = await createTRAProject(form);
      toast.success(`Created "${created.name}"`);
      setShowCreate(false);
      setForm({
        name: "",
        project_code: "",
        description: "",
        exposure_route: "dermal",
        device_contact_category: "surface",
        contact_duration_category: "limited",
        patient_population: "adult_male",
      });
      navigate(`/Toxicology/TRA/${created.id}`);
    } catch (err) {
      toast.error(err?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (row, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${row.name}"?`)) return;
    setBusyId(row.id);
    try {
      await deleteTRAProject(row.id);
      toast.success("Project deleted");
      fetchRows();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Header title="TRA Projects" />
      <WhiteIsland className="WhiteIsland">
        <header className={styles.headerRow}>
          <div className={styles.searchBar}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search projects..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button className={styles.searchButton} type="button" aria-label="search">
              <FaSearch />
            </button>
          </div>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setShowCreate(true)}
          >
            <FaPlus />
            <span>New project</span>
          </button>
        </header>

        <table className={styles.table}>
          <thead>
            <tr>
              <SortableTh sortProps={getSortProps("project_code")}>Code</SortableTh>
              <SortableTh sortProps={getSortProps("name")}>Name</SortableTh>
              <SortableTh sortProps={getSortProps("exposure_route")}>Route</SortableTh>
              <SortableTh sortProps={getSortProps("contact_duration_category")}>Duration</SortableTh>
              <SortableTh sortProps={getSortProps("compound_count")}>Compounds</SortableTh>
              <SortableTh sortProps={getSortProps("status")}>Status</SortableTh>
              <SortableTh sortProps={getSortProps("modified_date")}>Modified</SortableTh>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className={styles.empty}>Loading...</td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>
                  {inputValue ? "No matching projects" : "No projects yet. Create one above."}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/Toxicology/TRA/${row.id}`)}>
                  <td>{row.project_code || "—"}</td>
                  <td>{row.name}</td>
                  <td>{row.exposure_route || "—"}</td>
                  <td>{row.contact_duration_category || "—"}</td>
                  <td>{row.compound_count ?? 0}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    {row.modified_date
                      ? new Date(row.modified_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      title="Delete"
                      disabled={busyId === row.id}
                      onClick={(e) => handleDelete(row, e)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ← Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={p === page ? styles.activePage : ""}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      </WhiteIsland>

      {showCreate && (
      <Modal onClose={() => setShowCreate(false)}>
        <h3 className={styles.modalTitle}>New TRA project</h3>
        <form onSubmit={handleCreate} className={styles.form}>
          <label>
            Project name <span className={styles.req}>*</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            Project code
            <input
              value={form.project_code}
              onChange={(e) => setForm((f) => ({ ...f, project_code: e.target.value }))}
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className={styles.formGrid}>
            <label>
              Exposure route
              <select
                value={form.exposure_route}
                onChange={(e) => setForm((f) => ({ ...f, exposure_route: e.target.value }))}
              >
                <option value="dermal">Dermal</option>
                <option value="oral">Oral</option>
                <option value="inhalation">Inhalation</option>
                <option value="intravenous">Intravenous</option>
                <option value="systemic">Systemic</option>
              </select>
            </label>
            <label>
              Device contact category
              <select
                value={form.device_contact_category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, device_contact_category: e.target.value }))
                }
              >
                <option value="surface">Surface</option>
                <option value="external_communicating">External communicating</option>
                <option value="implant">Implant</option>
              </select>
            </label>
            <label>
              Contact duration
              <select
                value={form.contact_duration_category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact_duration_category: e.target.value }))
                }
              >
                <option value="limited">Limited (&lt;24h)</option>
                <option value="prolonged">Prolonged (24h–30d)</option>
                <option value="permanent">Permanent (&gt;30d)</option>
              </select>
            </label>
            <label>
              Patient population
              <select
                value={form.patient_population}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patient_population: e.target.value }))
                }
              >
                <option value="adult_male">Adult male</option>
                <option value="adult_female">Adult female</option>
                <option value="pediatric">Pediatric</option>
                <option value="elderly">Elderly</option>
              </select>
            </label>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancel
            </button>
            <button type="submit" className={styles.addButton} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>
      )}
    </>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "draft").toLowerCase();
  return <span className={`${styles.statusBadge} ${styles[value] || ""}`}>{value}</span>;
}
