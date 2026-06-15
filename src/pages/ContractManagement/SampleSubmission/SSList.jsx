import WhiteIsland from "../../../components/Whiteisland";
import styles from "./SSList.module.css";
import { useState, useEffect } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import { useAuth } from "../../../context/AuthContext";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { useTableControls } from "../../../hooks/useTableControls";
import SortableTh from "../../../components/SortableTh";
import BulkDeleteToolbar from "../../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../../components/BulkDelete/bulkDeleteApi";
const SampleData = [];

export default function SSList() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("Samples", "delete");

  const fetchSamples = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch samples');
      const data = await res.json();
      setRows(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

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

  useEffect(() => {
    fetchSamples();
  }, []);

  const { processed: filteredRows, getSortProps } = useTableControls(rows, inputValue);

  useEffect(() => {
    setPage(1);
  }, [inputValue]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const pagedData = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const selection = useBulkSelection({
    visibleItems: pagedData,
    allItems: filteredRows,
  });

  const handleBulkDelete = async () => {
    setDeleting(true);
    const result = await runBulkDelete({
      url: `${import.meta.env.VITE_BACKEND_URL}/api/samples/bulk-delete`,
      ids: selection.selectedIdArray,
      entityLabel: "sample",
    });
    setDeleting(false);
    if (result) {
      setConfirmOpen(false);
      selection.clear();
      fetchSamples();
    }
  };

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log("Search submitted:", inputValue);
  };
  const HandleAddSample = async () => {
    // try {
    //   const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples`, {
    //     method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Draft' })
    //   });
    //   if (!res.ok) throw new Error('Failed to create');
    //   const created = await res.json();
    //   navigate(`/SampleSubmission/SSDetail/${created._id}`);
    // } catch (e) { console.error(e); }
    navigate('/SampleSubmission/SSDetail/add');
  };

  return (
    <>  
      {/* <h2 className={styles.title}>Sample Submission List</h2> */}
      <Header title="Sample Submission List" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.samplePage}>
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
                  entityLabel="sample"
                />
              )}
              <button
                className={styles.addButton}
                onClick={() => HandleAddSample()}
              >
                <FaPlus />
                <span>Add Sample</span>
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
                <SortableTh sortProps={getSortProps("sampleCode")}>Sample ID</SortableTh>
                <SortableTh sortProps={getSortProps("recordStatus")}>Record</SortableTh>
                <SortableTh sortProps={getSortProps("bPartnerCode")}>Client</SortableTh>
                <SortableTh sortProps={getSortProps("description")}>Description</SortableTh>
                <SortableTh sortProps={getSortProps("status")}>Status</SortableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canDelete ? "6" : "5"} style={{textAlign:'center',padding:'10px'}}>Loading...</td></tr>
              ) : pagedData.length === 0 ? (
                <tr><td colSpan={canDelete ? "6" : "5"} style={{textAlign:'center',padding:'10px'}}>No submissions</td></tr>
              ) : (
                pagedData.map((row) => {
                  const isSelected = selection.isSelected(row._id);
                  return (
                    <tr
                      key={row._id}
                      className={isSelected ? "bulkSelectedRow" : ""}
                      onClick={() => navigate(`/SampleSubmission/SSDetail/${row._id}`)}
                      style={{cursor:'pointer'}}
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
                            aria-label={`Select sample ${row.sampleCode || row._id}`}
                          />
                        </td>
                      )}
                      <td>
                        {row.sampleCode || row._id}
                        {row.submittedByCustomer && (
                          <span
                            title="Submitted by client via the Customer Portal"
                            style={{
                              display: 'inline-block',
                              marginLeft: 8,
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: '#dbeafe',
                              color: '#1e40af',
                            }}
                          >
                            by client
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: row.recordStatus === 'Closed' ? '#fef3f2' : '#ecfdf3',
                            color: row.recordStatus === 'Closed' ? '#b42318' : '#027a48',
                          }}
                        >
                          {row.recordStatus === 'Closed' ? 'Closed' : 'Open'}
                        </span>
                      </td>
                      <td>{row.formData?.client || row.bPartnerCode || '-'}</td>
                      <td>{row.formData?.sampleDescription || row.description || '-'}</td>
                      <td>{row.status}</td>
                    </tr>
                  );
                })
              )}
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
        entityLabel="sample"
        previewItems={selection.selectedItems}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        deleting={deleting}
      />
    </>
  );
}
