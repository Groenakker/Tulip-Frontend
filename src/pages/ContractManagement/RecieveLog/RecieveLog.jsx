import React from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './RecieveLog.module.css';
import { useState, useEffect } from 'react';
import { FaSearch, FaPlus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';




export default function RecieveLog() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [pageSize, setPageSize] = useState(9);
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    const fetchRows = async () => {
      try {
        const res = await fetch('http://localhost:5174/api/receivings');
        if (!res.ok) throw new Error('Failed to fetch receivings');
        const data = await res.json();
        setRows(data);
        setFilteredRows(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRows();
  }, []);

  useEffect(() => {
    const v = inputValue.toLowerCase();
    setFilteredRows(rows.filter(r =>
      r.receivingCode?.toLowerCase().includes(v) ||
      r.origin?.toLowerCase().includes(v) ||
      r.projectDesc?.toLowerCase().includes(v)
    ));
  }, [inputValue, rows]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const pagedData = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log('Search submitted:', inputValue);
  };
  const HandleAddrecieve = async () => {
    // Create a minimal receiving then navigate to detail
    try {
      const res = await fetch('http://localhost:5174/api/receivings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: 'Unknown' })
      });
      if (!res.ok) throw new Error('Failed to create receiving');
      const created = await res.json();
      navigate(`/RecieveLog/RecieveDetails/${created._id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRowClick = (row) => {
    navigate(`/RecieveLog/RecieveDetails/${row._id}`);
  };

  return (
    <>
      <h2 className={styles.title}>Recieve Log</h2>
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

            <button className={styles.addButton} onClick={() => HandleAddrecieve()}>
              <FaPlus />
              <span>Add Recieve Log</span>
            </button>
          </header>

          <table className={styles.recieveTable}>
            <thead>
              <tr>
                <th>Receiving Code</th>
                <th>Origin</th>
                <th>Project</th>
                <th>Arrival</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{textAlign:'center',padding:'20px'}}>Loading...</td></tr>
              ) : pagedData.length === 0 ? (
                <tr><td colSpan="4" style={{textAlign:'center',padding:'20px'}}>No receivings</td></tr>
              ) : (
                pagedData.map((recieve) => (
                  <tr key={recieve._id} onClick={() => handleRowClick(recieve)} style={{cursor:'pointer'}}>
                    <td>{recieve.receivingCode}</td>
                    <td>{recieve.origin}</td>
                    <td>{recieve.projectDesc}</td>
                    <td>{recieve.arrivedDate ? new Date(recieve.arrivedDate).toLocaleDateString() : '-'}</td>
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