import React from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './InstanceList.module.css';
import { useState, useEffect } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import Header from "../../../components/Header";
import { useAuth } from "../../../context/AuthContext";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { useTableControls } from "../../../hooks/useTableControls";
import SortableTh from "../../../components/SortableTh";
import BulkDeleteToolbar from "../../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../../components/BulkDelete/bulkDeleteApi";



export default function InstanceList() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [pageSize, setPageSize] = useState(9);
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { hasPermission } = useAuth();
    const canDelete = hasPermission("Instances", "delete");

    const fetchInstances = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances`, { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch instances');
            }
            const data = await response.json();
            setInstances(data);
        } catch (error) {
            console.error('Error fetching instances:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstances();
    }, []);

    const { processed: filteredInstances, getSortProps } = useTableControls(
        instances,
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
            const extraRows = Math.floor((window.innerHeight - baseHeight) / incrementPx);
            setPageSize(baseRows + Math.max(0, extraRows));
        };
        updatePageSize();
        window.addEventListener('resize', updatePageSize);
        return () => window.removeEventListener('resize', updatePageSize);
    }, []);

    const totalPages = Math.ceil(filteredInstances.length / pageSize);
    const pagedData = filteredInstances.slice((page - 1) * pageSize, page * pageSize);

    const selection = useBulkSelection({
        visibleItems: pagedData,
        allItems: filteredInstances,
    });

    const handleBulkDelete = async () => {
        setDeleting(true);
        const result = await runBulkDelete({
            url: `${import.meta.env.VITE_BACKEND_URL}/api/instances/bulk-delete`,
            ids: selection.selectedIdArray,
            entityLabel: "instance",
        });
        setDeleting(false);
        if (result) {
            setConfirmOpen(false);
            selection.clear();
            fetchInstances();
        }
    };

    const handleChangePage = (p) => {
        if (p < 1 || p > totalPages) return;
        setPage(p);
    };

    const handleSubmit = () => {
        console.log('Search submitted:', inputValue);
    };
    
    const HandleAddInstance = () => {
        console.log('Add Instance button clicked');
        // TODO: Implement add instance functionality
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <>
            {/* <h2 className={styles.title}>Instances</h2> */}
            <Header title="Instance List" />
            <WhiteIsland className='WhiteIsland'>
                <div className={styles.instancesPage}>

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
                                    entityLabel="instance"
                                />
                            )}
                            <button className={styles.addButton} onClick={() => HandleAddInstance()}>
                                <FaPlus />
                                <span>Add Instance</span>
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
                                <SortableTh sortProps={getSortProps("instanceCode")}>Instance Code</SortableTh>
                                <SortableTh sortProps={getSortProps("sampleCode")}>Sample Code</SortableTh>
                                <SortableTh sortProps={getSortProps("lotNo")}>Lot No</SortableTh>
                                <SortableTh sortProps={getSortProps("status")}>Status</SortableTh>
                                <SortableTh sortProps={getSortProps("createdAt")}>Created At</SortableTh>
                                <SortableTh sortProps={getSortProps("updatedAt")}>Updated At</SortableTh>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canDelete ? "7" : "6"} style={{ textAlign: 'center', padding: '20px' }}>
                                        Loading instances...
                                    </td>
                                </tr>
                            ) : pagedData.length === 0 ? (
                                <tr>
                                    <td colSpan={canDelete ? "7" : "6"} style={{ textAlign: 'center', padding: '20px' }}>
                                        No instances found
                                    </td>
                                </tr>
                            ) : (
                                pagedData.map((instance) => {
                                    const isSelected = selection.isSelected(instance._id);
                                    return (
                                        <tr
                                            key={instance._id}
                                            className={isSelected ? "bulkSelectedRow" : ""}
                                            onClick={() => navigate(`/Instance/${instance._id}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {canDelete && (
                                                <td
                                                    className="bulkCheckboxCell"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        selection.toggleItem(instance._id);
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => selection.toggleItem(instance._id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        aria-label={`Select instance ${instance.instanceCode || instance._id}`}
                                                    />
                                                </td>
                                            )}
                                            <td>{instance.instanceCode || '-'}</td>
                                            <td>{instance.sampleCode || '-'}</td>
                                            <td>{instance.lotNo || '-'}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${styles[instance.status?.toLowerCase().replace(' ', '') || 'pending']}`}>
                                                    {instance.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td>{formatDate(instance.createdAt)}</td>
                                            <td>{formatDate(instance.updatedAt)}</td>
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
                entityLabel="instance"
                previewItems={selection.selectedItems}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={handleBulkDelete}
                deleting={deleting}
            />
        </>
    );
}