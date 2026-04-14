import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WhiteIsland from '../../components/Whiteisland';
import styles from './WarehouseDetails.module.css';
import { FaArrowLeft, FaBox, FaWarehouse, FaTruck, FaChevronDown, FaChevronUp, FaEdit } from 'react-icons/fa';
import Header from '../../components/Header';
import Modal from '../../components/Modal';
import toast from '../../components/Toaster/toast';

export default function WarehouseDetails() {
    const navigate = useNavigate();
    const { warehouseId } = useParams();

    const [warehouse, setWarehouse] = useState(null);
    const [instances, setInstances] = useState([]);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('current');
    const [expandedSample, setExpandedSample] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        warehouseID: '',
        address: '',
        storage: '',
        capacity: 0
    });

    const openEditModal = () => {
        if (!warehouse) return;
        setEditForm({
            warehouseID: warehouse.warehouseID || '',
            address: warehouse.address || '',
            storage: warehouse.storage || '',
            capacity: warehouse.capacity || 0
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        const payload = {
            warehouseID: editForm.warehouseID?.trim(),
            address: editForm.address?.trim(),
            storage: editForm.storage?.trim(),
            capacity: parseInt(editForm.capacity) || 0
        };

        if (!payload.warehouseID || !payload.address || !payload.storage) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/warehouses/${warehouse._id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to update warehouse');
            }

            const updated = await res.json();
            setWarehouse(updated);
            setShowEditModal(false);
            toast.success('Warehouse updated successfully!');
        } catch (error) {
            console.error('Error updating warehouse:', error);
            toast.error(error.message || 'Failed to update warehouse');
        }
    };

    useEffect(() => {
        if (!warehouseId) return;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [whRes, instRes, movRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/warehouses/${warehouseId}`),
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances`),
                    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instance-movements`)
                ]);

                if (whRes.ok) {
                    setWarehouse(await whRes.json());
                }
                if (instRes.ok) {
                    const allInstances = await instRes.json();
                    setInstances(Array.isArray(allInstances) ? allInstances : []);
                }
                if (movRes.ok) {
                    const allMovements = await movRes.json();
                    setMovements(Array.isArray(allMovements) ? allMovements : []);
                }
            } catch (err) {
                console.error('Error fetching warehouse data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [warehouseId]);

    if (loading) {
        return (
            <div className={styles.pageWrap}>
                <Header title="Warehouse Details" />
                <WhiteIsland className={styles.island}>
                    <div className={styles.loadingState}>Loading warehouse data...</div>
                </WhiteIsland>
            </div>
        );
    }

    if (!warehouse) {
        return (
            <div className={styles.pageWrap}>
                <Header title="Warehouse Details" />
                <WhiteIsland className={styles.island}>
                    <div className={styles.loadingState}>Warehouse not found.</div>
                    <button className={styles.backBtn} onClick={() => navigate('/Warehouse')}>
                        <FaArrowLeft /> Back to Warehouses
                    </button>
                </WhiteIsland>
            </div>
        );
    }

    const currentInstances = instances.filter(i =>
        i.warehouseID === warehouseId ||
        i.warehouseID?._id === warehouseId ||
        i.warehouseID === warehouse._id
    );

    const warehouseMovements = movements.filter(m => {
        const mWhId = m.warehouseId?._id || m.warehouseId;
        return mWhId === warehouseId || mWhId === warehouse._id;
    });

    const arrivalMovements = warehouseMovements.filter(m => m.movementType === 'In Warehouse');
    const departureMovements = warehouseMovements.filter(m => m.movementType === 'Shipped');

    // Group current instances by sample
    const sampleGroups = {};
    currentInstances.forEach(inst => {
        const key = inst.sampleCode || inst.idSample || 'Unknown';
        if (!sampleGroups[key]) {
            sampleGroups[key] = { sampleCode: key, instances: [] };
        }
        sampleGroups[key].instances.push(inst);
    });
    const sampleGroupList = Object.values(sampleGroups);

    // Build history entries (arrivals + departures) sorted by date
    const historyEntries = [];
    arrivalMovements.forEach(m => {
        const inst = m.instanceId;
        historyEntries.push({
            _id: m._id,
            type: 'arrival',
            instanceCode: inst?.instanceCode || '-',
            sampleCode: inst?.sampleCode || '-',
            lotNo: inst?.lotNo || '-',
            date: m.movementDate,
            receivingCode: m.receivingId?.receivingCode || null,
            shippingCode: null,
            notes: m.notes
        });
    });
    departureMovements.forEach(m => {
        const inst = m.instanceId;
        historyEntries.push({
            _id: m._id,
            type: 'departure',
            instanceCode: inst?.instanceCode || '-',
            sampleCode: inst?.sampleCode || '-',
            lotNo: inst?.lotNo || '-',
            date: m.movementDate,
            receivingCode: null,
            shippingCode: m.shippingId?.shippingCode || null,
            notes: m.notes
        });
    });
    historyEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    const capacity = warehouse.capacity || 0;
    const occupied = currentInstances.length;
    const available = capacity > 0 ? Math.max(0, capacity - occupied) : null;
    const usagePercent = capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 100)) : null;

    const spaceStatus = occupied === 0
        ? 'Empty'
        : (capacity > 0 && occupied >= capacity) ? 'Full' : 'Space Available';

    const getArrivalDate = (instanceId) => {
        const arrival = arrivalMovements.find(m =>
            (m.instanceId?._id || m.instanceId) === instanceId
        );
        return arrival ? formatDate(arrival.movementDate) : '-';
    };

    const formatDate = (value) => {
        if (!value) return '';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={styles.pageWrap}>
            <Header title="Warehouse Details" />

            {/* Info & Capacity Row */}
            <div className={styles.topRow}>
                <WhiteIsland className={styles.island}>
                    <div className={styles.infoHeader}>
                        <h3 className={styles.whCode}>{warehouse.warehouseID}</h3>
                        <button className={styles.editBtn} onClick={openEditModal}>
                            <FaEdit /> Edit
                        </button>
                    </div>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Address</span>
                            <span className={styles.infoValue}>{warehouse.address}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Storage Type</span>
                            <span className={styles.infoValue}>{warehouse.storage}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Storage Capacity</span>
                            <span className={styles.infoValue}>
                                {warehouse.capacity > 0 ? warehouse.capacity : 'Unlimited'}
                            </span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Space Status</span>
                            <span className={`${styles.spaceBadge} ${styles['space_' + spaceStatus.toLowerCase().replace(/\s/g, '')]}`}>
                                {spaceStatus}
                            </span>
                        </div>
                    </div>
                </WhiteIsland>

                <WhiteIsland className={`${styles.island} ${styles.capacityIsland}`}>
                    <h3 className={styles.sectionTitle}>Capacity</h3>
                    <div className={styles.capacityBody}>
                        <div className={styles.capacityCards}>
                            <div className={styles.capCard}>
                                <FaBox className={styles.capIcon} style={{ color: '#3b82f6' }} />
                                <div className={styles.capNumber}>{occupied}</div>
                                <div className={styles.capLabel}>Occupied</div>
                            </div>
                            <div className={styles.capCard}>
                                <FaWarehouse className={styles.capIcon} style={{ color: '#22c55e' }} />
                                <div className={styles.capNumber}>{available !== null ? available : '\u221E'}</div>
                                <div className={styles.capLabel}>Available</div>
                            </div>
                            <div className={styles.capCard}>
                                <FaTruck className={styles.capIcon} style={{ color: '#f59e0b' }} />
                                <div className={styles.capNumber}>{departureMovements.length}</div>
                                <div className={styles.capLabel}>Shipped Out</div>
                            </div>
                        </div>
                        {capacity > 0 && (
                            <div className={styles.progressWrap}>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{
                                            width: `${usagePercent}%`,
                                            background: usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#3b82f6'
                                        }}
                                    />
                                </div>
                                <span className={styles.progressText}>{usagePercent}% used ({occupied} / {capacity})</span>
                            </div>
                        )}
                        {capacity === 0 && (
                            <div className={styles.capacityNote}>No capacity limit set. Edit warehouse to set a capacity.</div>
                        )}
                    </div>
                </WhiteIsland>
            </div>

            {/* Tabs: Current Inventory / History */}
            <WhiteIsland className={styles.island}>
                <div className={styles.tabBar}>
                    <button
                        className={`${styles.tab} ${activeTab === 'current' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('current')}
                    >
                        Current Inventory ({currentInstances.length})
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Movement History ({historyEntries.length})
                    </button>
                </div>

                {/* Current Inventory Tab */}
                {activeTab === 'current' && (
                    <div className={styles.tabContent}>
                        {sampleGroupList.length === 0 ? (
                            <div className={styles.emptyState}>No instances currently stored in this warehouse.</div>
                        ) : (
                            <div className={styles.sampleGroups}>
                                {sampleGroupList.map(group => {
                                    const isOpen = expandedSample === group.sampleCode;
                                    return (
                                        <div key={group.sampleCode} className={styles.sampleGroup}>
                                            <div
                                                className={styles.sampleGroupHeader}
                                                onClick={() => setExpandedSample(isOpen ? null : group.sampleCode)}
                                            >
                                                <div className={styles.sampleGroupLeft}>
                                                    {isOpen ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                                                    <span className={styles.sampleGroupCode}>{group.sampleCode}</span>
                                                </div>
                                                <span className={styles.sampleGroupCount}>
                                                    {group.instances.length} instance{group.instances.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            {isOpen && (
                                                <table className={styles.instanceTable}>
                                                    <thead>
                                                        <tr>
                                                            <th>Instance Code</th>
                                                            <th>Lot #</th>
                                                            <th>Status</th>
                                                            <th>Arrived</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.instances.map(inst => (
                                                            <tr key={inst._id} onClick={() => navigate(`/Instance/${inst._id}`)} className={styles.clickRow}>
                                                                <td className={styles.codeTd}>{inst.instanceCode}</td>
                                                                <td>{inst.lotNo || '-'}</td>
                                                                <td>
                                                                    <span className={`${styles.statusPill} ${styles['st_' + (inst.status || 'pending').toLowerCase().replace(/\s/g, '')]}`}>
                                                                        {inst.status || 'Pending'}
                                                                    </span>
                                                                </td>
                                                                <td className={styles.dateCol}>{getArrivalDate(inst._id)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className={styles.tabContent}>
                        {historyEntries.length === 0 ? (
                            <div className={styles.emptyState}>No movement history for this warehouse.</div>
                        ) : (
                            <table className={styles.historyTable}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Direction</th>
                                        <th>Instance</th>
                                        <th>Sample</th>
                                        <th>Lot #</th>
                                        <th>Reference</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyEntries.map(entry => (
                                        <tr key={entry._id}>
                                            <td className={styles.dateCol}>{formatDate(entry.date)}</td>
                                            <td>
                                                <span className={`${styles.dirBadge} ${styles[entry.type]}`}>
                                                    {entry.type === 'arrival' ? 'IN' : 'OUT'}
                                                </span>
                                            </td>
                                            <td className={styles.codeTd}>{entry.instanceCode}</td>
                                            <td>{entry.sampleCode}</td>
                                            <td>{entry.lotNo}</td>
                                            <td>
                                                {entry.receivingCode && <span>Recv: {entry.receivingCode}</span>}
                                                {entry.shippingCode && <span>Ship: {entry.shippingCode}</span>}
                                                {!entry.receivingCode && !entry.shippingCode && '-'}
                                            </td>
                                            <td className={styles.notesCol}>{entry.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </WhiteIsland>

            {showEditModal && (
                <Modal onClose={() => setShowEditModal(false)}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>Edit Warehouse</h3>
                        <div className={styles.modalForm}>
                            <label className={styles.modalField}>
                                <span>Warehouse ID</span>
                                <input
                                    type="text"
                                    value={editForm.warehouseID}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, warehouseID: e.target.value }))}
                                    className={styles.modalInput}
                                />
                            </label>
                            <label className={styles.modalField}>
                                <span>Address</span>
                                <input
                                    type="text"
                                    value={editForm.address}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                                    className={styles.modalInput}
                                />
                            </label>
                            <label className={styles.modalField}>
                                <span>Storage Type</span>
                                <input
                                    type="text"
                                    value={editForm.storage}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, storage: e.target.value }))}
                                    className={styles.modalInput}
                                />
                            </label>
                            <label className={styles.modalField}>
                                <span>Storage Capacity (max instances, 0 = unlimited)</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={editForm.capacity}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, capacity: e.target.value }))}
                                    className={styles.modalInput}
                                />
                            </label>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={styles.saveButton}
                                onClick={handleSaveEdit}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
