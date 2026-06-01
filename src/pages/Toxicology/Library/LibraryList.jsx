import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaPlus, FaSyncAlt, FaTrash } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import SortableTh from "../../../components/SortableTh";
import { useTableControls } from "../../../hooks/useTableControls";
import {
  listLibrary,
  deleteLibraryItem,
  refreshLibraryResearch,
  saveFromResearch,
} from "./library.api";
import toast from "../../../components/Toaster/toast";
import styles from "./LibraryList.module.css";

/**
 * Compound Library list page.
 *
 * Modelled on the existing ProjectList page (same header, search bar,
 * pagination, SortableTh, useTableControls). Data comes from
 * `/api/tox/v1/library/` via `library.api.js` — server-side pagination
 * is supported, but for now we ask for a large page and apply
 * client-side filtering/sorting through `useTableControls`, exactly the
 * way ProjectList does. Both styles are valid; client-side keeps the
 * UI snappy when the corpus is small.
 */
export default function LibraryList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [inputValue, setInputValue] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [quickName, setQuickName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      // Ask for up to 200 records and filter on the client. Matches the
      // pagination idiom Tulip uses elsewhere (see ProjectList.jsx).
      const data = await listLibrary({ page: 1, page_size: 200 });
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load compound library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Reactive page sizing copied from ProjectList so list density tracks
  // window height.
  useEffect(() => {
    const update = () => {
      const baseHeight = 703;
      const baseRows = 9;
      const incrementPx = 42;
      const extraRows = Math.floor((window.innerHeight - baseHeight) / incrementPx);
      setPageSize(baseRows + Math.max(0, extraRows));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [inputValue]);

  const { processed: filtered, getSortProps } = useTableControls(rows, inputValue, {
    defaultSortKey: "research_date",
    defaultSortDirection: "desc",
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const q = quickName.trim();
    if (!q) return;
    setCreating(true);
    try {
      const created = await saveFromResearch({ query: q });
      toast.success(`Added "${created?.name || q}" to library`);
      setQuickName("");
      fetchRows();
    } catch (err) {
      toast.error(err?.message || "Failed to research compound");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (row, e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove "${row.name}" from the library?`)) return;
    setBusyId(row.id);
    try {
      await deleteLibraryItem(row.id);
      toast.success("Compound removed");
      fetchRows();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleRefresh = async (row, e) => {
    e.stopPropagation();
    setBusyId(row.id);
    try {
      await refreshLibraryResearch(row.id);
      toast.success("Research refreshed");
      fetchRows();
    } catch (err) {
      toast.error(err?.message || "Refresh failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  return (
    <>
      <Header title="Compound Library" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.page}>
          <header className={styles.headerRow}>
            <div className={styles.searchBar}>
              <input
                type="search"
                placeholder="Search compounds..."
                className={styles.searchInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button className={styles.searchButton} type="button" aria-label="search">
                <FaSearch />
              </button>
            </div>

            <form className={styles.quickAdd} onSubmit={handleQuickAdd}>
              <input
                type="text"
                placeholder="Compound name or CAS"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className={styles.quickAddInput}
              />
              <button
                type="submit"
                className={styles.addButton}
                disabled={creating || !quickName.trim()}
              >
                <FaPlus />
                <span>{creating ? "Researching..." : "Research & save"}</span>
              </button>
            </form>
          </header>

          <table className={styles.table}>
            <thead>
              <tr>
                <SortableTh sortProps={getSortProps("name")}>Name</SortableTh>
                <SortableTh sortProps={getSortProps("cas_number")}>CAS</SortableTh>
                <SortableTh sortProps={getSortProps("molecular_weight")}>MW</SortableTh>
                <SortableTh sortProps={getSortProps("overall_risk")}>Risk</SortableTh>
                <SortableTh sortProps={getSortProps("literature_count")}>References</SortableTh>
                <SortableTh sortProps={getSortProps("research_date")}>Researched</SortableTh>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>Loading...</td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    {inputValue ? "No matches" : "No saved compounds yet. Add one above."}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/Toxicology/Library/${row.id}`)}
                  >
                    <td>{row.name}</td>
                    <td>{row.cas_number || "—"}</td>
                    <td>
                      {Number.isFinite(row.molecular_weight)
                        ? Number(row.molecular_weight).toFixed(2)
                        : "—"}
                    </td>
                    <td>
                      <RiskBadge value={row.overall_risk} />
                    </td>
                    <td>{row.literature_count ?? 0}</td>
                    <td>
                      {row.research_date
                        ? new Date(row.research_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="Refresh research"
                        disabled={busyId === row.id}
                        onClick={(e) => handleRefresh(row, e)}
                      >
                        <FaSyncAlt />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconButton} ${styles.danger}`}
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
        </div>

        <div className={styles.pagination}>
          <button onClick={() => handleChangePage(page - 1)} disabled={page === 1}>
            ← Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={p === page ? styles.activePage : ""}
              onClick={() => handleChangePage(p)}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => handleChangePage(page + 1)}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      </WhiteIsland>
    </>
  );
}

function RiskBadge({ value }) {
  const v = String(value || "").toLowerCase();
  const tone =
    v === "low" ? "low" : v === "high" ? "high" : v === "critical" ? "high" : "moderate";
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unknown";
  return <span className={`${styles.riskBadge} ${styles[tone]}`}>{label}</span>;
}
