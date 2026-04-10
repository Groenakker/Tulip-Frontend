import React from 'react';
import WhiteIsland from '../../components/Whiteisland';
import styles from './Warehouse.module.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';
import toast from '../../components/Toaster/toast';
import Modal from '../../components/Modal';

export default function Warehouse() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [pageSize, setPageSize] = useState(9);
    const [warehouseData, setWarehouseData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [formData, setFormData] = useState({
        _id: null,
        warehouseID: '',
        address: '',
        storage: '',
        space: 'Empty'
    });

    // Fetch warehouses from backend
    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/warehouses`);
                if (!res.ok) throw new Error('Failed to fetch warehouses');
                const data = await res.json();
                setWarehouseData(data);
                setFilteredData(data);
            } catch (error) {
                console.error('Error fetching warehouses:', error);
                toast.error('Failed to load warehouses');
            } finally {
                setLoading(false);
            }
        };
        fetchWarehouses();
    }, []);

    // Filter warehouses based on search input
    useEffect(() => {
        const searchTerm = inputValue.toLowerCase();
        const filtered = warehouseData.filter(warehouse =>
            warehouse.warehouseID?.toLowerCase().includes(searchTerm) ||
            warehouse.address?.toLowerCase().includes(searchTerm) ||
            warehouse.storage?.toLowerCase().includes(searchTerm) ||
            warehouse.space?.toLowerCase().includes(searchTerm)
        );
        setFilteredData(filtered);
        setPage(1); // Reset to first page when filtering
    }, [inputValue, warehouseData]);

    const openAddModal = () => {
        setFormData({
            _id: null,
            warehouseID: `WH-${Date.now()}`,
            address: '',
            storage: '',
            space: 'Empty'
        });
        setActiveModal('warehouse');
    };

    const openEditModal = (warehouse) => {
        setFormData({
            _id: warehouse._id,
            warehouseID: warehouse.warehouseID || '',
            address: warehouse.address || '',
            storage: warehouse.storage || '',
            space: warehouse.space || 'Empty'
        });
        setActiveModal('warehouse');
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

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const pagedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

    const handleChangePage = (p) => {
        if (p < 1 || p > totalPages) return;
        setPage(p);
    };

    const handleSubmit = () => {
        // Search is handled by useEffect
    };

    const handleSaveWarehouse = async () => {
        const payload = {
            warehouseID: formData.warehouseID?.trim(),
            address: formData.address?.trim(),
            storage: formData.storage?.trim(),
            space: formData.space
        };

        if (!payload.warehouseID || !payload.address || !payload.storage || !payload.space) {
            toast.error('Please fill all required fields');
            return;
        }

        const isEdit = Boolean(formData._id);

        try {
            const endpoint = isEdit
                ? `${import.meta.env.VITE_BACKEND_URL}/api/warehouses/${formData._id}`
                : `${import.meta.env.VITE_BACKEND_URL}/api/warehouses`;
            const res = await fetch(endpoint, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Failed to ${isEdit ? 'update' : 'create'} warehouse`);
            }

            const savedWarehouse = await res.json();
            if (isEdit) {
                setWarehouseData(prev => prev.map(w => (w._id === savedWarehouse._id ? savedWarehouse : w)));
                toast.success('Warehouse updated successfully!');
            } else {
                setWarehouseData(prev => [savedWarehouse, ...prev]);
                toast.success('Warehouse added successfully!');
            }
            setActiveModal(null);
        } catch (error) {
            console.error(`Error ${isEdit ? 'updating' : 'adding'} warehouse:`, error);
            toast.error(error.message || `Failed to ${isEdit ? 'update' : 'add'} warehouse`);
        }
    };

    const handleDeleteWarehouse = async (warehouse) => {
        if (!window.confirm(`Are you sure you want to delete warehouse "${warehouse.warehouseID}"?`)) {
            return;
        }

        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/warehouses/${warehouse._id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to delete warehouse');
            }

            setWarehouseData(prev => prev.filter(w => w._id !== warehouse._id));
            toast.success('Warehouse deleted successfully!');
        } catch (error) {
            console.error('Error deleting warehouse:', error);
            toast.error(error.message || 'Failed to delete warehouse');
        }
    };

    useEffect(() => {
        const handleOutsideClick = () => {
            setOpenActionMenuId(null);
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    return (
        <>
            <h2 className={styles.title}>Warehouses</h2>
            <WhiteIsland className='WhiteIsland'>
                <div className={styles.warehousesPage}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>All Warehouses</h3>
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
                            <button className={styles.searchButton} onClick={handleSubmit}><FaSearch /></button>
                        </div>

                        <button className={styles.addButton} onClick={openAddModal}>
                            <FaPlus />
                            <span>Add Warehouse</span>
                        </button>
                    </header>

                    <table className={styles.warehouseTable}>
                        <thead>
                            <tr>
                                <th>Warehouse ID</th>
                                <th>Address</th>
                                <th>Storage</th>
                                <th>Space</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                        Loading...
                                    </td>
                                </tr>
                            ) : pagedData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                        No warehouses found
                                    </td>
                                </tr>
                            ) : (
                                pagedData.map((warehouse) => {
                                    return (
                                        <tr
                                            key={warehouse._id}
                                            onClick={() => navigate(`/Warehouse/${encodeURIComponent(warehouse.warehouseID || warehouse._id)}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <span className={styles.tableText}>{warehouse.warehouseID}</span>
                                            </td>
                                            <td>
                                                <span className={styles.tableText}>{warehouse.address}</span>
                                            </td>
                                            <td>
                                                <span className={styles.tableText}>{warehouse.storage}</span>
                                            </td>
                                            <td>
                                                <span className={styles.tableText}>{warehouse.space}</span>
                                            </td>
                                            <td>
                                                <div className={styles.actionMenuWrapper}>
                                                    <button
                                                        className={styles.actionButton}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenActionMenuId(openActionMenuId === warehouse._id ? null : warehouse._id);
                                                        }}
                                                        aria-label="Open warehouse actions"
                                                    >
                                                        <FaEllipsisV />
                                                    </button>
                                                    {openActionMenuId === warehouse._id && (
                                                        <div
                                                            className={styles.actionMenu}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                className={styles.actionMenuItem}
                                                                onClick={() => {
                                                                    openEditModal(warehouse);
                                                                    setOpenActionMenuId(null);
                                                                }}
                                                            >
                                                                <FaEdit />
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                className={`${styles.actionMenuItem} ${styles.actionMenuItemDelete}`}
                                                                onClick={() => {
                                                                    handleDeleteWarehouse(warehouse);
                                                                    setOpenActionMenuId(null);
                                                                }}
                                                            >
                                                                <FaTrash />
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
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
                {activeModal === 'warehouse' && (
                    <Modal onClose={() => setActiveModal(null)}>
                        <div className={styles.modalContent}>
                            <h3 className={styles.modalTitle}>
                                {formData._id ? 'Edit Warehouse' : 'Add Warehouse'}
                            </h3>
                            <div className={styles.modalForm}>
                                <label className={styles.modalField}>
                                    <span>Warehouse ID</span>
                                    <input
                                        type="text"
                                        value={formData.warehouseID}
                                        onChange={(e) => setFormData(prev => ({ ...prev, warehouseID: e.target.value }))}
                                        className={styles.modalInput}
                                    />
                                </label>
                                <label className={styles.modalField}>
                                    <span>Address</span>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                        className={styles.modalInput}
                                    />
                                </label>
                                <label className={styles.modalField}>
                                    <span>Storage</span>
                                    <input
                                        type="text"
                                        value={formData.storage}
                                        onChange={(e) => setFormData(prev => ({ ...prev, storage: e.target.value }))}
                                        className={styles.modalInput}
                                    />
                                </label>
                                <label className={styles.modalField}>
                                    <span>Space</span>
                                    <select
                                        value={formData.space}
                                        onChange={(e) => setFormData(prev => ({ ...prev, space: e.target.value }))}
                                        className={styles.modalSelect}
                                    >
                                        <option value="Full">Full</option>
                                        <option value="Space Available">Space Available</option>
                                        <option value="Empty">Empty</option>
                                    </select>
                                </label>
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton}
                                    onClick={() => setActiveModal(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={styles.saveButton}
                                    onClick={handleSaveWarehouse}
                                >
                                    {formData._id ? 'Save Changes' : 'Add Warehouse'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </WhiteIsland>
        </>
    );
}