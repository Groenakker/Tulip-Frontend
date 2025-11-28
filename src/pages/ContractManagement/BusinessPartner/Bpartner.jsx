import React, { useState, useEffect } from "react";
import { FaPlus, FaSearch } from "react-icons/fa";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./Bpartner.module.css";
import { useNavigate } from "react-router-dom";



// const samplePeople = Array.from({ length: 40 }, (_, i) => {
//   const num = 102100 + i;
//   const first = [
//     "John",
//     "Jane",
//     "Alex",
//     "Priya",
//     "Li",
//     "Arjun",
//     "Sara",
//     "Mateo",
//     "Aisha",
//     "Omar",
//   ][i % 10];
//   const last = [
//     "Smith",
//     "Khan",
//     "Patel",
//     "Garcia",
//     "Kim",
//     "Singh",
//     "Brown",
//     "Lopez",
//     "Chen",
//     "Das",
//   ][9 - (i % 10)];
//   const cities = [
//     "New York",
//     "Delhi",
//     "London",
//     "Tokyo",
//     "Berlin",
//     "Sydney",
//     "Dubai",
//     "Toronto",
//     "Cape Town",
//     "São Paulo",
//   ];
//   return {
//     bookingNumber: `#${num}`,
//     name: `${first} ${last}`,
//     address: `${cities[i % 10]}, ${i % 2 ? "USA" : "India"}`,
//     category: i % 2 === 0 ? "Vendor" : "Client",
//     status: i % 3 === 0 ? "Inactive" : "Active",
//   };
// });

export default function Bpartner() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const Navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5174/api/bpartners")
      .then((res) => res.json()).then((data) => {
        setPartners(data);
        setFilteredPartners(data);
      })
      .catch((err) => console.error("Failed to fetch partners:", err));
  }, []);

  useEffect(() => {
    const value = inputValue.toLowerCase();
    setFilteredPartners(
      partners.filter(
        (row) =>
          row.partnerNumber?.toLowerCase().includes(value) ||
          row.name?.toLowerCase().includes(value) ||
          row.city?.toLowerCase().includes(value) ||
          row.country?.toLowerCase().includes(value) ||
          row.category?.toLowerCase().includes(value) ||
          row.status?.toLowerCase().includes(value)
      )
    );
  }, [inputValue, partners]);

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

  const totalPages = Math.ceil(filteredPartners.length / pageSize);
  const pagedData = filteredPartners.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log("Input submitted:", inputValue);
  };
  const HandleAddPartner = () => {
    Navigate("/BuisnessPartner/PartnerDetails/add");
    console.log("Add Project button clicked");
  };

  return (
    <>
      <h2 className={styles.title}>
        Business Partner List
      </h2>
      <WhiteIsland className="WhiteIsland">
        <div className={styles.partnerPage}>
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
              onClick={() => HandleAddPartner()}
            >
              <FaPlus />
              <span>Add</span>
            </button>
          </header>

          <table className={styles.partnerTable}>
            
            <thead>
              <tr>
                <th>Business No</th>
                <th>Name of Partner</th>
                <th>Address</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((row) => (
                // Use Navigate from react-router-dom to handle navigation
                
                <tr key={row._id} onClick = {() => Navigate(`/BuisnessPartner/PartnerDetails/${row._id}`)}>
                  <td>{row.partnerNumber}</td>
                  <td>{row.name}</td>
                  <td>{`${row.city}, ${row.country}`}</td>
                  <td>{row.category}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[row.status.toLowerCase()]
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
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
              className={p === page ? styles.active : ""}
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
