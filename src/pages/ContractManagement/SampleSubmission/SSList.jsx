import WhiteIsland from "../../../components/Whiteisland";
import styles from "./SSList.module.css";
import { useState, useEffect } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

const SampleData = [];

export default function SSList() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
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
    const load = async () => {
      try {
        const res = await fetch('http://localhost:5174/api/samples');
        if (!res.ok) throw new Error('Failed to fetch samples');
        const data = await res.json();
        setRows(data);
        setFilteredRows(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    const v = inputValue.toLowerCase();
    setFilteredRows(rows.filter(r =>
      (r._id || '').toLowerCase().includes(v) ||
      (r.status || '').toLowerCase().includes(v) ||
      (r.description || '').toLowerCase().includes(v)
    ));
  }, [inputValue, rows]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const pagedData = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log("Search submitted:", inputValue);
  };
  const HandleAddSample = async () => {
    try {
      const res = await fetch('http://localhost:5174/api/samples', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Draft' })
      });
      if (!res.ok) throw new Error('Failed to create');
      const created = await res.json();
      navigate(`/SampleSubmission/SSDetail/${created._id}`);
    } catch (e) { console.error(e); }
  };

  return (
    <>
      <h2 className={styles.title}>Sample Submission List</h2>
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

            <button
              className={styles.addButton}
              onClick={() => HandleAddSample()}
            >
              <FaPlus />
              <span>Add Sample</span>
            </button>
          </header>

          <table className={styles.partnerTable}>
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Client</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{textAlign:'center',padding:'10px'}}>Loading...</td></tr>
              ) : pagedData.length === 0 ? (
                <tr><td colSpan="4" style={{textAlign:'center',padding:'10px'}}>No submissions</td></tr>
              ) : (
                pagedData.map((row) => (
                  <tr key={row._id} onClick={() => navigate(`/SampleSubmission/SSDetail/${row._id}`)} style={{cursor:'pointer'}}>
                    <td>{row.sampleCode || row._id}</td>
                    <td>{row.formData?.client || row.bPartnerCode || '-'}</td>
                    <td>{row.formData?.sampleDescription || row.description || '-'}</td>
                    <td>{row.status}</td>
                  </tr>
                ))
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
    </>
  );
}
