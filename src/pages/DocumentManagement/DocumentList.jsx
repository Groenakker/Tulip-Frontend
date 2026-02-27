import React from "react";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./DocumentList.module.css";
import { useState, useEffect } from "react";
import { FaSearch, FaPlus, FaFile, FaEllipsisV } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";

export default function DocumentList() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const navigate = useNavigate();
  const [documentData, setDocumentData] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? "Access denied" : "Failed to load documents");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setDocumentData(Array.isArray(data) ? data : []);
          setFilteredDocuments(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setDocumentData([]);
          setFilteredDocuments([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const value = inputValue.toLowerCase();
    setFilteredDocuments(
      documentData.filter(
        (document) =>
          document.documentID?.toLowerCase().includes(value) ||
          document.title?.toLowerCase().includes(value) ||
          document.category?.toLowerCase().includes(value) ||
          document.status?.toLowerCase().includes(value) ||
          document.version?.toLowerCase().includes(value)
      )
    );
  }, [inputValue, documentData]);

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

  const getStatusClass = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "PUBLISHED":
        return styles.statusPublished;
      case "REVIEW":
        return styles.statusReview;
      case "CREATION":
      case "DRAFT":
        return styles.statusDraft;
      case "UPDATE":
      case "REJECTED":
        return styles.statusDefault;
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

            <button
              className={styles.addButton}
              onClick={() => handleAddDocument()}
            >
              <FaPlus />
              <span>Add Document</span>
            </button>
          </header>

          <table className={styles.documentTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Version</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className={styles.loadingCell}>
                    Loading documents…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className={styles.errorCell}>
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && pagedData.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    No documents found
                  </td>
                </tr>
              )}
              {!loading && !error && pagedData.map((document) => (
                <tr
                  key={document._id}
                  onClick={() => navigate(`/DocumentManagement/DocumentDetails/${document._id}`)}
                  className={styles.rowClickable}
                >
                  <td>{document.documentID}</td>
                  <td>
                    <div className={styles.titleCell}>
                      <FaFile className={styles.documentIcon} />
                      <span>{document.title ?? document.name}</span>
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
              ))}
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
    </>
  );
}
