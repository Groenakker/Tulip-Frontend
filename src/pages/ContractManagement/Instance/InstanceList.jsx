import React from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './InstanceList.module.css';
import { useState, useEffect } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';



export default function InstanceList() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [inputValue, setInputValue] = useState('');
    const [pageSize, setPageSize] = useState(9);
    const [instances, setInstances] = useState([]);
    const [filteredInstances, setFilteredInstances] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch instances from API
    useEffect(() => {
        const fetchInstances = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances`);
                if (!response.ok) {
                    throw new Error('Failed to fetch instances');
                }
                const data = await response.json();
                setInstances(data);
                setFilteredInstances(data);
            } catch (error) {
                console.error('Error fetching instances:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInstances();
    }, []);

    // Filter instances based on search input
    useEffect(() => {
        const value = inputValue.toLowerCase();
        setFilteredInstances(
            instances.filter(
                (instance) =>
                    instance.instanceCode?.toLowerCase().includes(value) ||
                    instance.sampleCode?.toLowerCase().includes(value) ||
                    instance.lotNo?.toLowerCase().includes(value) ||
                    instance.status?.toLowerCase().includes(value)
            )
        );
    }, [inputValue, instances]);

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
            <h2 className={styles.title}>Instances</h2>
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

                        <button className={styles.addButton} onClick={() => HandleAddInstance()}>
                            <FaPlus />
                            <span>Add Instance</span>
                        </button>
                    </header>

                    <table className={styles.partnerTable}>
                        <thead>
                            <tr>
                                <th>Instance Code</th>
                                <th>Sample Code</th>
                                <th>Lot No</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th>Updated At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                                        Loading instances...
                                    </td>
                                </tr>
                            ) : pagedData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                                        No instances found
                                    </td>
                                </tr>
                            ) : (
                                pagedData.map((instance) => (
                                    <tr 
                                        key={instance._id}
                                        onClick={() => navigate(`/Instance/${instance._id}`)}
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                                    >
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
                                ))
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