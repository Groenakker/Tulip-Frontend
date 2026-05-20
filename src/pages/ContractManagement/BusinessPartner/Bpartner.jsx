import React, { useState, useEffect } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./Bpartner.module.css";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import ImportButton from "../../../components/ImportButton/ImportButton";
import { useAuth } from "../../../context/AuthContext";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { useTableControls } from "../../../hooks/useTableControls";
import SortableTh from "../../../components/SortableTh";
import BulkDeleteToolbar from "../../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../../components/BulkDelete/bulkDeleteApi";

export default function Bpartner() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const Navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { hasPermission } = useAuth();
  const canDelete = hasPermission("Business Partners", "delete");

  const fetchPartners = () => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch partners (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setPartners(data);
      })
      .catch((err) => console.error("Failed to fetch partners:", err));
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  // Deep search across every field on the record (including nested data
  // like contacts) plus per-column sorting via the shared hook.
  const { processed: filteredPartners, getSortProps } = useTableControls(
    partners,
    inputValue
  );

  useEffect(() => {
    setPage(1);
  }, [inputValue]);

  useEffect(() => {
    const updatePageSize = () => {
      const baseHeight = 703;
      const baseRows = 9;
      const incrementPx = 42;
      const extraRows = Math.floor(
        (window.innerHeight - baseHeight) / incrementPx
      );
      setPageSize(baseRows + Math.max(0, extraRows));
    };
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  const totalPages = Math.ceil(filteredPartners.length / pageSize);
  const pagedData = filteredPartners.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const selection = useBulkSelection({
    visibleItems: pagedData,
    allItems: filteredPartners,
  });

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log("Input submitted:", inputValue);
  };

  const HandleAddPartner = () => {
    Navigate("/BuisnessPartner/PartnerDetails/add");
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const result = await runBulkDelete({
      url: `${import.meta.env.VITE_BACKEND_URL}/api/bpartners/bulk-delete`,
      ids: selection.selectedIdArray,
      entityLabel: "business partner",
    });
    setDeleting(false);
    if (result) {
      setConfirmOpen(false);
      selection.clear();
      fetchPartners();
    }
  };

  return (
    <>
      <Header title="Business Partner List" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.partnerPage}>
          <header className={styles.addbtn}>
            <div className={styles.searchBar}>
              <input
                type="search"
                placeholder="Search"
                className={styles.searchInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button className={styles.searchButton} onClick={handleSubmit}>
                <FaSearch />
              </button>
            </div>

            <div className={styles.headerActions}>
              {canDelete && (
                <BulkDeleteToolbar
                  count={selection.count}
                  onClear={selection.clear}
                  onDelete={() => setConfirmOpen(true)}
                  disabled={deleting}
                  entityLabel="business partner"
                />
              )}
              <ImportButton
                endpoint={`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/import`}
                entityName="business partner"
                onComplete={fetchPartners}
              />
              <button
                className={styles.addButton}
                onClick={() => HandleAddPartner()}
              >
                <FaPlus />
                <span>Add</span>
              </button>
            </div>
          </header>

          <table className={styles.partnerTable}>
            <thead>
              <tr>
                {canDelete && (
                  <th className="bulkCheckboxCell">
                    <input {...selection.headerCheckboxProps} />
                  </th>
                )}
                <SortableTh sortProps={getSortProps("partnerNumber")}>Business No</SortableTh>
                <SortableTh sortProps={getSortProps("name")}>Name of Partner</SortableTh>
                <SortableTh sortProps={getSortProps("city")}>Address</SortableTh>
                <SortableTh sortProps={getSortProps("category")}>Category</SortableTh>
                <SortableTh sortProps={getSortProps("status")}>Status</SortableTh>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((row) => {
                const isSelected = selection.isSelected(row._id);
                return (
                  <tr
                    key={row._id}
                    className={isSelected ? "bulkSelectedRow" : ""}
                    onClick={() =>
                      Navigate(`/BuisnessPartner/PartnerDetails/${row._id}`)
                    }
                  >
                    {canDelete && (
                      <td
                        className="bulkCheckboxCell"
                        onClick={(e) => {
                          e.stopPropagation();
                          selection.toggleItem(row._id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => selection.toggleItem(row._id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${row.name || row.partnerNumber}`}
                        />
                      </td>
                    )}
                    <td>{row.partnerNumber}</td>
                    <td>{row.name}</td>
                    <td>{`${row.city || ""}${row.city && row.country ? ", " : ""}${row.country || ""}`}</td>
                    <td>{row.category}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[(row.status || "").toLowerCase()] || ""
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.pagination}>
          <button
            onClick={() => handleChangePage(page - 1)}
            disabled={page === 1}
          >
            ← Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={p === page ? styles.active : ""}
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

      <ConfirmDeleteModal
        open={confirmOpen}
        count={selection.count}
        entityLabel="business partner"
        previewItems={selection.selectedItems}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        deleting={deleting}
      />
    </>
  );
}
