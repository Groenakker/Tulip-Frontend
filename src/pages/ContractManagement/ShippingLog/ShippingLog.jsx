import React from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './ShippingLog.module.css';
import { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaRoute } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import { useAuth } from "../../../context/AuthContext";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { useTableControls } from "../../../hooks/useTableControls";
import SortableTh from "../../../components/SortableTh";
import BulkDeleteToolbar from "../../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../../components/BulkDelete/bulkDeleteApi";
// const shipData = [
//   { id: 'GRK-25035-01', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' },
//   { id: 'GRK-25035-02', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' },
//   { id: 'GRK-25035-03', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' },
//   { id: 'GRK-25035-04', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' },
//   { id: 'GRK-25035-05', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' },
//   { id: 'GRK-25035-06', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' },
//   { id: 'GRK-25035-07', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' },
//   { id: 'GRK-25035-08', destination: 'Element Material Technology - Cincinnati', project: 'Eakin Healthcare ISO 18562 Gas Pathway Remediation', departure: '2/21/2025' }
// ];



export default function ShippingLog() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [pageSize, setPageSize] = useState(9);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("Shipping", "delete");

  const fetchRows = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/shipping`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch shipping');
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
      url: `${import.meta.env.VITE_BACKEND_URL}/api/shipping/bulk-delete`,
      ids: selection.selectedIdArray,
      entityLabel: "shipment",
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
  const HandleAddShipping = () => {
    navigate('/ShippingLog/add');
  };

  const handleRowClick = (row) => {
    navigate(`/ShippingLog/${row._id}`);
  };

  // Navigate to the shipping details page and jump to the inline tracking
  // section. We append #tracking-section so ShippingDetails can scroll it
  // into view after it mounts. Stop propagation so the row click (which
  // also navigates to details, but without the hash) doesn't override this.
  const handleTrackClick = (e, row) => {
    e.stopPropagation();
    navigate(`/ShippingLog/${row._id}#tracking-section`);
  };

  return (
    <>
      {/* <h2 className={styles.title}>Shipping Log</h2> */}
      <Header title="Shipping Log" />
      <WhiteIsland className='WhiteIsland'>
        <div className={styles.shippingPage}>

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
                  entityLabel="shipment"
                />
              )}
              <button className={styles.addButton} onClick={() => HandleAddShipping()}>
                <FaPlus />
                <span>Add Shipping Log</span>
              </button>
            </div>
          </header>

          <table className={styles.shippingTable}>
            <thead>
              <tr>
                {canDelete && (
                  <th className="bulkCheckboxCell">
                    <input {...selection.headerCheckboxProps} />
                  </th>
                )}
                <SortableTh sortProps={getSortProps("shippingCode")}>Shipping Code</SortableTh>
                <SortableTh sortProps={getSortProps("recordStatus")}>Record</SortableTh>
                <SortableTh sortProps={getSortProps("shipmentDestination")}>Destination</SortableTh>
                <SortableTh sortProps={getSortProps("projectDesc")}>Project</SortableTh>
                <SortableTh sortProps={getSortProps("carrier")}>Carrier</SortableTh>
                <SortableTh sortProps={getSortProps("trackingNumber")}>Tracking</SortableTh>
                <SortableTh sortProps={getSortProps("shipmentDate")}>Departure</SortableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canDelete ? "8" : "7"} style={{textAlign:'center',padding:'20px'}}>Loading...</td></tr>
              ) : pagedData.length === 0 ? (
                <tr><td colSpan={canDelete ? "8" : "7"} style={{textAlign:'center',padding:'20px'}}>No shipping records</td></tr>
              ) : (
                pagedData.map((shipping) => {
                  const isSelected = selection.isSelected(shipping._id);
                  return (
                    <tr
                      key={shipping._id}
                      className={isSelected ? "bulkSelectedRow" : ""}
                      onClick={() => handleRowClick(shipping)}
                      style={{cursor:'pointer'}}
                    >
                      {canDelete && (
                        <td
                          className="bulkCheckboxCell"
                          onClick={(e) => {
                            e.stopPropagation();
                            selection.toggleItem(shipping._id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => selection.toggleItem(shipping._id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select shipment ${shipping.shippingCode || shipping._id}`}
                          />
                        </td>
                      )}
                      <td>{shipping.shippingCode || '-'}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: shipping.recordStatus === 'Closed' ? '#fef3f2' : '#ecfdf3',
                            color: shipping.recordStatus === 'Closed' ? '#b42318' : '#027a48',
                          }}
                        >
                          {shipping.recordStatus === 'Closed' ? 'Closed' : 'Open'}
                        </span>
                      </td>
                      <td>{shipping.shipmentDestination || '-'}</td>
                      <td>{shipping.projectDesc || shipping.projectID || '-'}</td>
                      <td>{shipping.carrier ? shipping.carrier.toUpperCase() : '-'}</td>
                      <td>
                        {shipping.trackingNumber ? (
                          <button
                            type='button'
                            className={styles.trackBtn}
                            onClick={(e) => handleTrackClick(e, shipping)}
                            title='View in-app tracking'
                            data-status={shipping.trackingStatus || 'UNKNOWN'}
                          >
                            <FaRoute />
                            <span className={styles.trackBtnText}>
                              {shipping.trackingNumber}
                            </span>
                            {shipping.trackingStatus && (
                              <span className={styles.trackStatusPill}>
                                {shipping.trackingStatus.replace(/_/g, ' ')}
                              </span>
                            )}
                          </button>
                        ) : '-'}
                      </td>
                      <td>{shipping.shipmentDate ? new Date(shipping.shipmentDate).toLocaleDateString() : '-'}</td>
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
        entityLabel="shipment"
        previewItems={selection.selectedItems}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        deleting={deleting}
      />
    </>
  );
}