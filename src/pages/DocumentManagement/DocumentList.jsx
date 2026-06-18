import React, { useMemo } from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentList.module.css";
import { useState, useEffect } from "react";
import { FaSearch, FaPlus, FaFile, FaEllipsisV } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { useTableControls } from "../../hooks/useTableControls";
import SortableTh from "../../components/SortableTh";
import BulkDeleteToolbar from "../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../components/BulkDelete/bulkDeleteApi";

export default function DocumentList() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const [activeTab, setActiveTab] = useState("active");
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("Documents", "delete");

  const fetchDocuments = () => {
    setLoading(true);
    setError(null);
    return fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Access denied" : "Failed to load documents");
        return res.json();
      })
      .then((data) => {
        setDocumentData(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err.message);
        setDocumentData([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Pre-filter by the Active/Archived tab before the deep-search hook runs,
  // so search + sort only operate on rows the tab is currently showing.
  const tabFilteredDocuments = useMemo(() => {
    return documentData.filter((document) => {
      const isArchived = (document.status || "").toLowerCase() === "archived";
      if (activeTab === "archived") return isArchived;
      return !isArchived;
    });
  }, [documentData, activeTab]);

  const { processed: filteredDocuments, getSortProps } = useTableControls(
    tabFilteredDocuments,
    inputValue
  );

  // Reset paging whenever the visible result set could shift.
  useEffect(() => {
    setPage(1);
  }, [inputValue, activeTab]);

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

  const totalPages = Math.ceil(filteredDocuments.length / pageSize);
  const pagedData = filteredDocuments.slice((page - 1) * pageSize, page * pageSize);

  const selection = useBulkSelection({
    visibleItems: pagedData,
    allItems: filteredDocuments,
  });

  // Documents in Published / Archived state can't be deleted (server enforces
  // this too). Surface the warning up-front so the user isn't surprised when
  // the server skips some rows.
  const selectedHasProtected = selection.selectedItems.some((d) =>
    ["published", "archived"].includes((d.status || "").toLowerCase())
  );

  const handleBulkDelete = async () => {
    setDeleting(true);
    const result = await runBulkDelete({
      url: `${import.meta.env.VITE_BACKEND_URL}/api/documents/bulk-delete`,
      ids: selection.selectedIdArray,
      entityLabel: "document",
    });
    setDeleting(false);
    if (result) {
      setConfirmOpen(false);
      selection.clear();
      fetchDocuments();
    }
  };

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log("Search submitted:", inputValue);
  };

  const handleAddDocument = () => {
    navigate("/DocumentManagement/DocumentDetails/add");
    console.log("Add Document button clicked");
  };

  const handleActionClick = (e, documentId) => {
    e.stopPropagation();
    console.log("Action clicked for document:", documentId);
    // Add menu logic here
  };

  // Always land users on the document detail page so they can see
  // versions/status. The detail page itself surfaces a banner with
  // a deep-link to the source shipping/receiving record for any
  // auto-managed document.
  const openDocument = (document) => {
    navigate(`/DocumentManagement/DocumentDetails/${document._id}`);
  };

  const getStatusClass = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "PUBLISHED":
        return styles.statusPublished;
      case "REVIEW":
        return styles.statusReview;
      case "APPROVED":
        return styles.statusApproved;
      case "CREATION":
      case "DRAFT":
        return styles.statusDraft;
      case "REJECTED":
        return styles.statusRejected;
      case "ARCHIVED":
        return styles.statusArchived;
      default:
        return styles.statusDefault;
    }
  };

  return (
    <>
      {/* <h2 className={styles.title}>Document Registry</h2> */}
      <Header title="Document Registry" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.documentsPage}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>All Documents</h3>
          </div>

          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${activeTab === "active" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("active")}
            >
              Active
              <span className={styles.tabCount}>
                {documentData.filter((d) => (d.status || "").toLowerCase() !== "archived").length}
              </span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === "archived" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("archived")}
            >
              Archived
              <span className={styles.tabCount}>
                {documentData.filter((d) => (d.status || "").toLowerCase() === "archived").length}
              </span>
            </button>
          </div>

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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {canDelete && (
                <BulkDeleteToolbar
                  count={selection.count}
                  onClear={selection.clear}
                  onDelete={() => setConfirmOpen(true)}
                  disabled={deleting}
                  entityLabel="document"
                />
              )}
              <button
                className={styles.addButton}
                onClick={() => handleAddDocument()}
              >
                <FaPlus />
                <span>Add Document</span>
              </button>
            </div>
          </header>

          <table className={styles.documentTable}>
            <thead>
              <tr>
                {canDelete && (
                  <th className="bulkCheckboxCell">
                    <input {...selection.headerCheckboxProps} />
                  </th>
                )}
                <SortableTh sortProps={getSortProps("documentID")}>ID</SortableTh>
                <SortableTh sortProps={getSortProps("title")}>Title</SortableTh>
                <SortableTh sortProps={getSortProps("category")}>Category</SortableTh>
                <SortableTh sortProps={getSortProps("status")}>Status</SortableTh>
                <SortableTh sortProps={getSortProps("version")}>Version</SortableTh>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className={styles.loadingCell}>
                    Loading documents…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className={styles.errorCell}>
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && pagedData.length === 0 && (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className={styles.emptyCell}>
                    No documents found
                  </td>
                </tr>
              )}
              {!loading && !error && pagedData.map((document) => {
                const isSelected = selection.isSelected(document._id);
                return (
                  <tr
                    key={document._id}
                    onClick={() => openDocument(document)}
                    className={`${styles.rowClickable} ${isSelected ? "bulkSelectedRow" : ""}`}
                  >
                    {canDelete && (
                      <td
                        className="bulkCheckboxCell"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (document.isAutoManaged) return;
                          selection.toggleItem(document._id);
                        }}
                      >
                        {document.isAutoManaged ? (
                          <span className={styles.lockedDot} title="Managed by linked record" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => selection.toggleItem(document._id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select document ${document.documentID || document.title || document._id}`}
                          />
                        )}
                      </td>
                    )}
                    <td>{document.documentID}</td>
                    <td>
                      <div className={styles.titleCell}>
                        <FaFile className={styles.documentIcon} />
                        <span>{document.title ?? document.name}</span>
                        {document.linkedEntity?.type && (
                          <span
                            className={styles.linkedBadge}
                            title={`Linked to ${document.linkedEntity.type} ${document.linkedEntity.code || ""}`}
                          >
                            {document.linkedEntity.type === "shipping" ? "Shipping" : "Receiving"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{document.category}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusClass(document.status)}`}>
                        {document.status}
                      </span>
                    </td>
                    <td>{document.version ?? document.currentVersion}</td>
                    <td>
                      <button
                        className={styles.actionButton}
                        onClick={(e) => handleActionClick(e, document._id)}
                      >
                        <FaEllipsisV />
                      </button>
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
              className={p === page ? "active" : ""}
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
        entityLabel="document"
        previewItems={selection.selectedItems}
        description={
          selectedHasProtected
            ? "This action is permanent. Published or Archived documents will be skipped automatically to preserve audit history."
            : undefined
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        deleting={deleting}
      />
    </>
  );
}
