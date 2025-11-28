import React from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./ProjectList.module.css";
import { useState, useEffect } from "react";
import { FaSearch, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// const projectData = [
//   {
//     id: "GRK-25035-01",
//     desc: "Viewpoint Medical - Plug & Stay Chemistry & Toxicology",
//     start: "1/3/2025",
//     due: "2/21/2025",
//   },
//   {
//     id: "GRK-25052-01",
//     desc: "Eakin Healthcare ISO 18562 Gas Pathway Remediation",
//     start: "2/20/2025",
//     due: "4/11/2025",
//   },
//   {
//     id: "GRK-25062-01",
//     desc: "Stratasys Material Evaluation",
//     start: "3/3/2025",
//     due: "4/28/2025",
//   },
//   {
//     id: "GRK-24004-01",
//     desc: "VacHeal Biocompatibility Evaluation & Testing (Medisurge)",
//     start: "1/4/2024",
//     due: "4/15/2025",
//   },
//   {
//     id: "GRK-25121-01",
//     desc: "Diamatrix Xpand NT Ready-Loaded Iris Speculum Biocompatibility",
//     start: "5/1/2025",
//     due: "6/1/2025",
//   },
// ];

export default function ProjectList() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const Navigate = useNavigate();
  const [projectData, setProjectData] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5174/api/projects")
      .then((response) => response.json())
      .then((data) => {
        setProjectData(data);
        setFilteredProjects(data);
      })
      .catch((error) => console.error("Error fetching project data:", error));
  }, []);

  useEffect(() => {
    const value = inputValue.toLowerCase();
    setFilteredProjects(
      projectData.filter(
        (project) =>
          project.projectID?.toLowerCase().includes(value) ||
          project.description?.toLowerCase().includes(value) ||
          project.startDate?.toLowerCase().includes(value) ||
          project.endDate?.toLowerCase().includes(value)
      )
    );
  }, [inputValue, projectData]);

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

  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const pagedData = filteredProjects.slice((page - 1) * pageSize, page * pageSize);

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSubmit = () => {
    console.log("Search submitted:", inputValue);
  };
  const HandleAddProject = () => {
    Navigate("/Projects/ProjectDetails/add");
    console.log("Add Project button clicked");
  };

  return (
    <>
      <h2 className={styles.title}>Projects</h2>
      <WhiteIsland className="WhiteIsland">
        <div className={styles.projectsPage}>
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
              onClick={() => HandleAddProject()}
            >
              <FaPlus />
              <span>Add</span>
            </button>
          </header>

          <table className={styles.partnerTable}>
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Description</th>
                <th>Start</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((project) => (
                <tr
                  key={project._id}
                  onClick={() => Navigate(`/Projects/ProjectDetails/${project._id}`)}
                >
                  <td>{project.projectID}</td>
                  <td>{project.description}</td>
                  <td>{project.startDate ? project.startDate.split("T")[0] : "" }</td>
                  <td>{project.endDate ? project.endDate.split("T")[0] : "" }</td>
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
