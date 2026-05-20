import React from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './RecieveLog.module.css';
import { useState, useEffect } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import { useAuth } from "../../../context/AuthContext";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { useTableControls } from "../../../hooks/useTableControls";
import SortableTh from "../../../components/SortableTh";
import BulkDeleteToolbar from "../../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../../components/BulkDelete/bulkDeleteApi";



export default function RecieveLog() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [pageSize, setPageSize] = useState(9);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("Receiving", "delete");

  const fetchRows = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/receivings`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch receivings');
      const data = await res.json();
      setRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const updatePageSize = () => {
      const baseHeight = 703;
      const baseRows = 9;
      const incrementPx = 42;
      const extraRows = Math.floor((window.innerHeight - baseHeight) / incrementPx);
      setPageSize(baseRows + Math.max(0, extraRows));
    };
    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  useEffect(() => {
    fetchRows();
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
      url: `${import.meta.env.VITE_BACKEND_URL}/api/receivings/bulk-delete`,
      ids: selection.selectedIdArray,
      entityLabel: "receiving",
    });
    setDeleting(false);
    if (result) {
      setConfirmOpen(false);
      selection.clear();
      fetchRows();
    }
  };

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log('Search submitted:', inputValue);
  };
  const HandleAddrecieve = () => {
    navigate('/RecieveLog/RecieveDetails/add');
  };

  const handleRowClick = (row) => {
    navigate(`/RecieveLog/RecieveDetails/${row._id}`);
  };

  return (
    <>
      {/* <h2 className={styles.title}>Recieve Log</h2> */}
      <Header title="Recieve Log" />
      <WhiteIsland className='WhiteIsland'>
        <div className={styles.recievesPage}>

          <header className={styles.addbtn}>
            <div className={styles.searchBar}>
              <input
                type="search"
                placeholder="Search"
                className={styles.searchInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button className={styles.searchButton} onClick={handleSubmit}><FaSearch /></button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {canDelete && (
                <BulkDeleteToolbar
                  count={selection.count}
                  onClear={selection.clear}
                  onDelete={() => setConfirmOpen(true)}
                  disabled={deleting}
                  entityLabel="receiving"
                />
              )}
              <button className={styles.addButton} onClick={() => HandleAddrecieve()}>
                <FaPlus />
                <span>Add Recieve Log</span>
              </button>
            </div>
          </header>

          <table className={styles.recieveTable}>
            <thead>
              <tr>
                {canDelete && (
                  <th className="bulkCheckboxCell">
                    <input {...selection.headerCheckboxProps} />
                  </th>
                )}
                <SortableTh sortProps={getSortProps("receivingCode")}>Receiving Code</SortableTh>
                <SortableTh sortProps={getSortProps("origin")}>Origin</SortableTh>
                <SortableTh sortProps={getSortProps("projectDesc")}>Project</SortableTh>
                <SortableTh sortProps={getSortProps("arrivedDate")}>Arrival</SortableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canDelete ? "5" : "4"} style={{textAlign:'center',padding:'20px'}}>Loading...</td></tr>
              ) : pagedData.length === 0 ? (
                <tr><td colSpan={canDelete ? "5" : "4"} style={{textAlign:'center',padding:'20px'}}>No receivings</td></tr>
              ) : (
                pagedData.map((recieve) => {
                  const isSelected = selection.isSelected(recieve._id);
                  return (
                    <tr
                      key={recieve._id}
                      className={isSelected ? "bulkSelectedRow" : ""}
                      onClick={() => handleRowClick(recieve)}
                      style={{cursor:'pointer'}}
                    >
                      {canDelete && (
                        <td
                          className="bulkCheckboxCell"
                          onClick={(e) => {
                            e.stopPropagation();
                            selection.toggleItem(recieve._id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => selection.toggleItem(recieve._id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select receiving ${recieve.receivingCode || recieve._id}`}
                          />
                        </td>
                      )}
                      <td>{recieve.receivingCode}</td>
                      <td>{recieve.origin}</td>
                      <td>{recieve.projectDesc}</td>
                      <td>{recieve.arrivedDate ? new Date(recieve.arrivedDate).toLocaleDateString() : '-'}</td>
                    </tr>
                  );
                })
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
              className={p === page ? 'active' : ''}
              onClick={() => handleChangePage(p)}
            >
              {p}
            </button>
          ))}
          <button onClick={() => handleChangePage(page + 1)} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      </WhiteIsland>

      <ConfirmDeleteModal
        open={confirmOpen}
        count={selection.count}
        entityLabel="receiving"
        previewItems={selection.selectedItems}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        deleting={deleting}
      />
    </>
  );
}