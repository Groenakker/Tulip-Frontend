import React, { useEffect } from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./Projectdetails.module.css";
import TabbedTable from "../../../components/TabbedTable";
import { FaSave, FaTrash, FaImage } from "react-icons/fa";
import { useState } from "react";
import { useParams } from "react-router-dom";

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState({
    projectID: "",
    bPartnerID: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "",
    actDate: "",
    estDate: "",
    poNumber: "",
    poDate: "",
    commitDate: "",
    quoteNumber: "",
    salesOrderNumber: "",
    image: null,
  });
  const isEdit = Boolean(id);
  console.log("Project ID:", id);
  console.log("Is Edit Mode:", isEdit);
  useEffect(() => {
    if (isEdit) {
      fetch(`http://localhost:5174/api/projects/${id}`)
        .then((res) => res.json())
        .then((data) => setProject(data))
        .catch((error) => console.error("Error fetching project:", error));
    } else {
      // Initialize with default values if creating a new project
      setProject({
        projectID: "",
        bPartnerID: "",
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "",
        actDate: "",
        estDate: "",
        poNumber: "",
        poDate: "",
        commitDate: "",
        quoteNumber: "",
        salesOrderNumber: "",
        image: null,
      });
    }
  }, [id, isEdit]);

  const [partners, setPartners] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:5174/api/bpartners`)
      .then((res) => res.json())
      .then((data) => setPartners(data))
      .catch((err) => console.error("Failed to fetch partners:", err));
  }, []);
        
      
  const pdata = {
    Shipments: [
      {
        id: "SHP-101",
        desc: "Shipment to MedLabs Inc.",
        start: "2/2/2025",
        due: "2/10/2025",
      },
      {
        id: "SHP-102",
        desc: "Test Kit delivery to BioCore",
        start: "3/5/2025",
        due: "3/12/2025",
      },
    ],
    Reports: [
      {
        id: "REP-301",
        desc: "Final Biocompatibility Report",
        start: "1/1/2025",
        due: "1/15/2025",
      },
    ],
    Sample: [
      {
        id: "SMP-301",
        desc: "Sample Collection for Testing",
        start: "3/1/2025",
        due: "3/5/2025",
      },
      {
        id: "SMP-302",
        desc: "Sample Analysis Report",
        start: "3/15/2025",
        due: "3/20/2025",
      },
    ],
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProject((prev) => ({ ...prev, [name]: value }));
  };
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProject((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setProject((prev) => ({
          ...prev,
          image: reader.result, // This will be a base64 string
        }));
      };
      reader.readAsDataURL(file);
    }
  };
  const handleSave = async () => {
    if (isEdit) {
      // Update existing project
      try {
        const response = await fetch(
          `http://localhost:5174/api/projects/${id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(project),
          }
        );
        if (!response.ok) throw new Error("Failed to update project");
        console.log("Project updated successfully");
      } catch (error) {
        console.error("Error updating project:", error);
      }
    } else {
      // Create new project
      await fetch(`http://localhost:5174/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(project),
      });
      console.log("New project created successfully");
    }
  };
  const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this project?")) {
      fetch(`http://localhost:5174/api/projects${id}`, {
        method: "DELETE",
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to delete project");
          alert("Project deleted successfully");
          window.location.href = "/projects"; // Redirect to projects list
          // Optionally redirect or reset state after deletion
        })
        .catch((error) => console.error("Error deleting project:", error));
    }
  };
  console.log("Project Data:", project);

  return (
    <>
      <h2 className={styles.bHeading}>Business Project Detail</h2>
      <div className={styles.detailPage}>
        <div className={styles.leftGrid}>
          <WhiteIsland className={styles.bigIsland}>
            <h3>Project Info</h3>
            <div className={styles.main}>
              <div className={styles.picture}>
                <img
                  src={project.image ? project.image : "/ProjectLogo.JPG"}
                  width={128}
                  height={128}
                  alt="Project"
                />
                <label className={styles.uploadButton}>
                  <FaImage /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              <div className={styles.detailContainer}>
                <div className={styles.details}>
                  <div className={styles.info} style={{ width: "15%" }}>
                    <div className={styles.infoDetail}>SAP Project ID</div>{" "}
                    <input
                      name="projectID"
                      value={project.projectID}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "15%" }}>
                    <div className={styles.infoDetail}>SAP Partner ID</div>{" "}
                    <select
                      name="bPartnerID"
                      value={project.bPartnerID}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedPartner = partners.find(
                          (p) => p.partnerNumber === selectedId
                        );
                        setProject((prev) => ({
                          ...prev,
                          bPartnerID: selectedId,
                          name: selectedPartner ? selectedPartner.name : "",
                        }));
                      }}
                    >
                      <option value="">{project.bPartnerID}</option>
                      {partners.map((partner) => (
                        <option
                          key={partner.partnerNumber}
                          value={partner.partnerNumber}
                        >
                          {partner.partnerNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.info} style={{ width: "55%" }}>
                    <div className={styles.infoDetail}>Name</div>{" "}
                    <input
                      name="name"
                      value={project.name}
                      // onChange={handleChange}
                      readOnly
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "15%" }}>
                    <div className={styles.infoDetail}>Sponsor</div>{" "}
                    <input
                      name="contactID"
                      value={project.contactID}
                      onChange={handleChange}
                    ></input>
                  </div>
                </div>
                <div className={styles.details2}>
                  <div className={styles.info2} style={{ width: "100%" }}>
                    <div className={styles.infoDetail}>Description</div>{" "}
                    <input
                      name="description"
                      value={project.description}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info2}>
                    <div className={styles.infoDetail}>Client PO</div>{" "}
                    <input
                      name="poNumber"
                      value={project.poNumber}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info2}>
                    <div className={styles.infoDetail}>Quote</div>{" "}
                    <input
                      name="quoteNumber"
                      value={project.quoteNumber}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info2}>
                    <div className={styles.infoDetail}>Sales Order</div>{" "}
                    <input
                      name="salesOrderNumber"
                      value={project.salesOrderNumber}
                      onChange={handleChange}
                    ></input>
                  </div>
                </div>
                <div className={styles.details3}>
                  <div className={styles.info} style={{ width: "20%" }}>
                    <div className={styles.infoDetail}>Start Date</div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="date"
                      name="startDate"
                      value={
                        project.startDate ? project.startDate.split("T")[0] : ""
                      }
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "20%" }}>
                    <div className={styles.infoDetail}>Desired Date</div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="date"
                      name="desired"
                      value={
                        project.endDate ? project.endDate.split("T")[0] : ""
                      }
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "20%" }}>
                    <div className={styles.infoDetail}>Est. Date</div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="date"
                      name="estDate"
                      value={
                        project.estDate ? project.estDate.split("T")[0] : ""
                      }
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "20%" }}>
                    <div className={styles.infoDetail}>Commit Date</div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="date"
                      name="commitDate"
                      value={
                        project.commitDate
                          ? project.commitDate.split("T")[0]
                          : ""
                      }
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "20%" }}>
                    <div className={styles.infoDetail}>PO Delivery Date</div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="date"
                      name="delivery"
                      value={
                        project.commitDate
                          ? project.commitDate.split("T")[0]
                          : ""
                      }
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "20%" }}>
                    <div className={styles.infoDetail}>Actual Completion</div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="date"
                      name="actDate"
                      value={
                        project.actDate ? project.actDate.split("T")[0] : ""
                      }
                      onChange={handleChange}
                    ></input>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.saves}>
              <button className={styles.deleteButton} onClick={handleDelete}>
                <FaTrash /> Delete{" "}
              </button>
              <button className={styles.saveButton} onClick={handleSave}>
                <FaSave /> Save{" "}
              </button>
            </div>
          </WhiteIsland>
        </div>

        <div className="table">
          <TabbedTable data={pdata} />
        </div>
      </div>
    </>
  );
}
