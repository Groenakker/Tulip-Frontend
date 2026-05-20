import React from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./TestCodesList.module.css";
import { useState, useEffect } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Header from '../../../components/Header';
import ImportButton from "../../../components/ImportButton/ImportButton";
import { useAuth } from "../../../context/AuthContext";
import { useBulkSelection } from "../../../hooks/useBulkSelection";
import { useTableControls } from "../../../hooks/useTableControls";
import SortableTh from "../../../components/SortableTh";
import BulkDeleteToolbar from "../../../components/BulkDelete/BulkDeleteToolbar";
import ConfirmDeleteModal from "../../../components/BulkDelete/ConfirmDeleteModal";
import { runBulkDelete } from "../../../components/BulkDelete/bulkDeleteApi";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("Test Codes", "delete");

  const fetchTestCodes = () => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        setTestData(data);
      })
      .catch((error) => console.error("Error fetching test data:", error));
  };

  useEffect(() => {
    fetchTestCodes();
  }, []);

  const { processed: filteredTests, getSortProps } = useTableControls(testData, inputValue);

  useEffect(() => {
    setPage(1);
  }, [inputValue]);

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

  const selection = useBulkSelection({
    visibleItems: pagedData,
    allItems: filteredTests,
  });

  const handleBulkDelete = async () => {
    setDeleting(true);
    const result = await runBulkDelete({
      url: `${import.meta.env.VITE_BACKEND_URL}/api/testcodes/bulk-delete`,
      ids: selection.selectedIdArray,
      entityLabel: "test code",
    });
    setDeleting(false);
    if (result) {
      setConfirmOpen(false);
      selection.clear();
      fetchTestCodes();
    }
  };

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
      {/* <h2 className={styles.title}>Test Codes</h2> */}
      <Header title="Test Codes" />
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

            <div className={styles.headerActions}>
              {canDelete && (
                <BulkDeleteToolbar
                  count={selection.count}
                  onClear={selection.clear}
                  onDelete={() => setConfirmOpen(true)}
                  disabled={deleting}
                  entityLabel="test code"
                />
              )}
              <ImportButton
                endpoint={`${import.meta.env.VITE_BACKEND_URL}/api/testcodes/import`}
                entityName="test code"
                onComplete={fetchTestCodes}
              />
              <button
                className={styles.addButton}
                onClick={() => HandleAddTestCode()}
              >
                <FaPlus />
                <span>Add</span>
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
                <SortableTh sortProps={getSortProps("code")}>GRK Test Code</SortableTh>
                <SortableTh sortProps={getSortProps("descriptionShort")}>Description</SortableTh>
                <SortableTh sortProps={getSortProps("category")}>Category</SortableTh>
                <SortableTh sortProps={getSortProps("extractBased")}>Extracted Basis</SortableTh>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((test) => {
                const isSelected = selection.isSelected(test._id);
                return (
                  <tr
                    key={test._id}
                    className={isSelected ? "bulkSelectedRow" : ""}
                    onClick={() => Navigate(`/TestCodes/TestCodesDetails/${test._id}`)}
                  >
                    {canDelete && (
                      <td
                        className="bulkCheckboxCell"
                        onClick={(e) => {
                          e.stopPropagation();
                          selection.toggleItem(test._id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => selection.toggleItem(test._id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select test code ${test.code || test._id}`}
                        />
                      </td>
                    )}
                    <td>{test.code}</td>
                    <td>{test.descriptionShort}</td>
                    <td>{test.category}</td>
                    <td>{test.extractBased}</td>
                  </tr>
                );
              })}
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

      <ConfirmDeleteModal
        open={confirmOpen}
        count={selection.count}
        entityLabel="test code"
        previewItems={selection.selectedItems}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        deleting={deleting}
      />
    </>
  );
}
