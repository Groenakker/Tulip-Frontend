import React from 'react';
import WhiteIsland from '../../components/Whiteisland';
import styles from './Warehouse.module.css';
import { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaEdit, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import toast from '../../components/Toaster/toast';

export default function Warehouse() {
    const [page, setPage] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [pageSize, setPageSize] = useState(9);
    const [editingRows, setEditingRows] = useState({}); // Track which rows are being edited
    const [warehouseData, setWarehouseData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);

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

    // Handle field changes
    const handleFieldChange = (warehouseId, field, value) => {
        setWarehouseData(prevData =>
            prevData.map(warehouse =>
                warehouse._id === warehouseId
                    ? { ...warehouse, [field]: value }
                    : warehouse
            )
        );
    };

    // Toggle edit mode and save changes
    const toggleEditMode = async (warehouse) => {
        const warehouseId = warehouse._id;
        const isEditing = editingRows[warehouseId];

        if (isEditing) {
            // Save changes
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/warehouses/${warehouseId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        warehouseID: warehouse.warehouseID,
                        address: warehouse.address,
                        storage: warehouse.storage,
                        space: warehouse.space
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || 'Failed to update warehouse');
                }

                const updated = await res.json();
                setWarehouseData(prevData =>
                    prevData.map(w => w._id === warehouseId ? updated : w)
                );
                setEditingRows(prev => ({ ...prev, [warehouseId]: false }));
                toast.success('Warehouse updated successfully!');
            } catch (error) {
                console.error('Error updating warehouse:', error);
                toast.error(error.message || 'Failed to update warehouse');
                // Reload data to revert changes
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/warehouses`);
                if (res.ok) {
                    const data = await res.json();
                    setWarehouseData(data);
                }
            }
        } else {
            // Enter edit mode
            setEditingRows(prev => ({
                ...prev,
                [warehouseId]: true
            }));
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

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const pagedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

    const handleChangePage = (p) => {
        if (p < 1 || p > totalPages) return;
        setPage(p);
    };

    const handleSubmit = () => {
        // Search is handled by useEffect
    };

    const HandleAddWarehouse = async () => {
        try {
            const newWarehouse = {
                warehouseID: `WH-${Date.now()}`,
                address: 'New Warehouse Address',
                storage: '0',
                space: 'Empty'
            };

            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/warehouses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWarehouse)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create warehouse');
            }

            const created = await res.json();
            setWarehouseData(prev => [created, ...prev]);
            toast.success('Warehouse added successfully!');
            
            // Enter edit mode for the new warehouse
            setEditingRows(prev => ({
                ...prev,
                [created._id]: true
            }));
        } catch (error) {
            console.error('Error adding warehouse:', error);
            toast.error(error.message || 'Failed to add warehouse');
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

    return (
        <>
            <h2 className={styles.title}>Warehouses</h2>
            <WhiteIsland className='WhiteIsland'>
                <div className={styles.warehousesPage}>

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

                        <button className={styles.addButton} onClick={() => HandleAddWarehouse()}>
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
                                    const isEditing = editingRows[warehouse._id];
                                    return (
                                        <tr key={warehouse._id}>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={warehouse.warehouseID || ''}
                                                        onChange={(e) => handleFieldChange(warehouse._id, 'warehouseID', e.target.value)}
                                                        className={styles.tableInput}
                                                    />
                                                ) : (
                                                    <span className={styles.tableText}>{warehouse.warehouseID}</span>
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={warehouse.address || ''}
                                                        onChange={(e) => handleFieldChange(warehouse._id, 'address', e.target.value)}
                                                        className={styles.tableInput}
                                                    />
                                                ) : (
                                                    <span className={styles.tableText}>{warehouse.address}</span>
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        value={warehouse.storage || ''}
                                                        onChange={(e) => handleFieldChange(warehouse._id, 'storage', e.target.value)}
                                                        className={styles.tableInput}
                                                    />
                                                ) : (
                                                    <span className={styles.tableText}>{warehouse.storage}</span>
                                                )}
                                            </td>
                                            <td>
                                                {isEditing ? (
                                                    <select
                                                        value={warehouse.space || 'Empty'}
                                                        onChange={(e) => handleFieldChange(warehouse._id, 'space', e.target.value)}
                                                        className={styles.tableSelect}
                                                    >
                                                        <option value="Full">Full</option>
                                                        <option value="Space Available">Space Available</option>
                                                        <option value="Empty">Empty</option>
                                                    </select>
                                                ) : (
                                                    <span className={styles.tableText}>{warehouse.space}</span>
                                                )}
                                            </td>
                                            <td>
                                                <button 
                                                    className={styles.editButton}
                                                    onClick={() => toggleEditMode(warehouse)}
                                                >
                                                    {isEditing ? <FaSave /> : <FaEdit />}
                                                </button>
                                                <button 
                                                    className={styles.deleteButton} 
                                                    onClick={() => handleDeleteWarehouse(warehouse)}
                                                >
                                                    <FaTrash />
                                                </button>
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
            </WhiteIsland>
        </>
    );
}