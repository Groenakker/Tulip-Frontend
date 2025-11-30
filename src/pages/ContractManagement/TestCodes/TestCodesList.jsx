import React from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./TestCodesList.module.css";
import { useState, useEffect } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// const testData = [
//   {
//     "GRK  test code": "BC-GP-VOCP",
//     "Test Description": "Gas Pathway : 48 hour VOC and Particulate Sampling",
//     "Test Category": "Physical and chemical",
//     "Extracted Basis": "No",
//   },
//   {
//     "GRK  test code": "BC-GP-VOCP2",
//     "Test Description": "Gas Pathway : 48 hour VOC and Particulate Sampling",
//     "Test Category": "Physical and chemical",
//     "Extracted Basis": "No",
//   },
//   {
//     "GRK  test code": "BC-GP-VOCP3",
//     "Test Description": "Gas Pathway : 48 hour VOC and Particulate Sampling",
//     "Test Category": "Physical and chemical",
//     "Extracted Basis": "No",
//   },
//   {
//     "GRK  test code": "BC-GP-VOCP4",
//     "Test Description": "Gas Pathway : 48 hour VOC and Particulate Sampling",
//     "Test Category": "Physical and chemical",
//     "Extracted Basis": "No",
//   },
//   {
//     "GRK  test code": "BC-GP-VOCP5",
//     "Test Description": "Gas Pathway : 48 hour VOC and Particulate Sampling",
//     "Test Category": "Physical and chemical",
//     "Extracted Basis": "No",
//   },
// ];

export default function TestCodesList() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const Navigate = useNavigate();
  const [testData, setTestData] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes`)
      .then((response) => response.json())
      .then((data) => {
        setTestData(data);
        setFilteredTests(data);
      })
      .catch((error) => console.error("Error fetching test data:", error));
  }, []);

  useEffect(() => {
    const value = inputValue.toLowerCase();
    setFilteredTests(
      testData.filter((test) =>
        Object.values(test).some((val) =>
          String(val).toLowerCase().includes(value)
        )
      )
    );
  }, [inputValue, testData]);

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

  const totalPages = Math.ceil(filteredTests.length / pageSize);
  const pagedData = filteredTests.slice((page - 1) * pageSize, page * pageSize);

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log("Search submitted:", inputValue);
  };
  const HandleAddTestCode = () => {
    Navigate("/Testcodes/TestCodesDetails/add");
    console.log("Add Test Code button clicked");
  };

  return (
    <>
      <h2 className={styles.title}>Test Codes</h2>
      <WhiteIsland className="WhiteIsland">
        <div className={styles.testsPage}>
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
              onClick={() => HandleAddTestCode()}
            >
              <FaPlus />
              <span>Add</span>
            </button>
          </header>

          <table className={styles.partnerTable}>
            <thead>
              <tr>
                <th>GRK Test Code</th>
                <th>Description</th>
                <th>Category</th>
                <th>Extracted Basis</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((test) => (
                <tr key={test._id} onClick={() => Navigate(`/TestCodes/TestCodesDetails/${test._id}`)}>
                  <td>{test.code}</td>
                  <td>{test.descriptionShort}</td>
                  <td>{test.category}</td>
                  <td>{test.extractBased}</td>
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
