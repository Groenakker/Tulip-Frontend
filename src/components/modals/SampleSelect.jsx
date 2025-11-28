import { useEffect, useState } from 'react';
import styles from './SampleSelect.module.css';
import { FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';

const SampleSelect = ({ onClose, onOpenSampleForm, items, onSelectSample }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [samples, setSamples] = useState(items || []);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch('http://localhost:5174/api/samples');
                let normalized = [];
                if (res.ok) {
                    const data = await res.json();
                    normalized = (data || []).map(s => ({
                        _id: s._id,
                        id: s._id,
                        sampleCode: s.sampleCode,
                        description: s.description || s.name || '-',
                        lot: s.poNumber || s.bPartnerCode || '-',
                        quantity: 1
                    }));
                }
                // Fallback to provided items if API returns empty
                if ((!normalized || normalized.length === 0) && items && items.length) {
                    setSamples(items);
                } else {
                    setSamples(normalized);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className={styles.sampleListContainer}>
            <div className={styles.header}>
                <h2 className={styles.title}>Sample Information Management</h2>
                {/* open blank sample form  */}
                <button className={styles.addButton} onClick={() => onOpenSampleForm(null)}><FaPlus /> Add New Sample</button>
            </div>

            <div className={styles.content}>
                {/* SEARCH BAR */}
                <div className={styles.searchContainer}>
                    <div className={styles.searchInputWrapper}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search samples by ID, description, or lot..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>
                {/* Table of samples  */}
                <div className={styles.tableContainer}>
                    <table className={styles.itemsTable}>
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Description</th>
                                <th>Lot</th>
                                <th>Quantity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{textAlign:'center',padding:'10px'}}>Loading...</td></tr>
                            ) : (
                                (samples
                                    .filter(item => {
                                        const q = searchTerm.toLowerCase();
                                        return (
                                            (item.sampleCode || '').toLowerCase().includes(q) ||
                                            (item.id || '').toLowerCase().includes(q) ||
                                            (item.description || '').toLowerCase().includes(q) ||
                                            (item.lot || '').toLowerCase().includes(q)
                                        );
                                    })
                                ).map((item) => (
                                    <tr key={item._id || item.id}>
                                        <td>{item.sampleCode || item._id || item.id}</td>
                                        <td>{item.description}</td>
                                        <td>{item.lot}</td>
                                        <td>{item.quantity}</td>
                                        <td>
                                            <div className={styles.actionButtons}>
                                                <button className={styles.editBtn} onClick={() => onOpenSampleForm(item)}>
                                                    <FaEdit />
                                                </button>
                                                <button className={styles.addButton} onClick={() => onSelectSample && onSelectSample(item)}>
                                                    Select
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )))
                            }
                            {!loading && samples.length === 0 && (
                                <tr><td colSpan="5" style={{textAlign:'center',padding:'10px'}}>No samples found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            <div className={styles.buttonGroup}>
                <button className={styles.closeBtn} onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default SampleSelect;