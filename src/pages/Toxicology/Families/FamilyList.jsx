import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import Header from "../../../components/Header";
import SortableTh from "../../../components/SortableTh";
import { useTableControls } from "../../../hooks/useTableControls";
import toast from "../../../components/Toaster/toast";
import { listFamilies } from "./families.api";
import styles from "./FamilyList.module.css";

/**
 * Compound Families list. Same table+search pattern as the other
 * list pages. Click-through routes to /Toxicology/Families/:id.
 */
export default function FamilyList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFamilies();
      setRows(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load families");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { processed, getSortProps } = useTableControls(rows, inputValue, {
    defaultSortKey: "name",
  });

  return (
    <>
      <Header title="Compound Families" />
      <WhiteIsland className="WhiteIsland">
        <header className={styles.headerRow}>
          <div className={styles.searchBar}>
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search families..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="button" className={styles.searchButton} aria-label="search">
              <FaSearch />
            </button>
          </div>
        </header>

        <table className={styles.table}>
          <thead>
            <tr>
              <SortableTh sortProps={getSortProps("family_id")}>ID</SortableTh>
              <SortableTh sortProps={getSortProps("name")}>Name</SortableTh>
              <SortableTh sortProps={getSortProps("family_type")}>Type</SortableTh>
              <SortableTh sortProps={getSortProps("member_count")}>Members</SortableTh>
              <SortableTh sortProps={getSortProps("regulatory_basis")}>Regulatory basis</SortableTh>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={styles.empty}>Loading...</td>
              </tr>
            ) : processed.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {inputValue ? "No matching families" : "No families yet."}
                </td>
              </tr>
            ) : (
              processed.map((row, idx) => (
                <tr
                  key={row.family_id || row.id || idx}
                  onClick={() =>
                    navigate(`/Toxicology/Families/${row.family_id || row.id}`)
                  }
                >
                  <td className={styles.mono}>{row.family_id || row.id}</td>
                  <td>{row.name || row.family_name || "—"}</td>
                  <td>{row.family_type || "—"}</td>
                  <td>{row.member_count ?? row.members?.length ?? "—"}</td>
                  <td>{row.regulatory_basis || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </WhiteIsland>
    </>
  );
}
