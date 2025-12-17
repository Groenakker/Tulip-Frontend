import React, { useEffect, useMemo, useState } from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./ProjectDetails.module.css";
import TabbedTable from "../../../components/TabbedTable";
import { FaSave, FaTrash, FaImage } from "react-icons/fa";
import { useLocation, useParams } from "react-router-dom";
import toast from "../../../components/Toaster/toast";

export default function ProjectDetails() {
  const { id } = useParams();
  const location = useLocation();
  const prefillProject = location?.state?.prefillProject;
  const [project, setProject] = useState({
    projectID: "",
    bPartnerID: "",
    bPartnerCode: "",
    name: "",
    contact: "",
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
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`)
        .then((res) => res.json())
        .then((data) => setProject(data))
        .catch((error) => console.error("Error fetching project:", error));
    } else {
      // Initialize with default values if creating a new project
      setProject({
        projectID: "",
        bPartnerID: "",
        bPartnerCode: "",
        name: "",
        contact: "",
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
        ...(prefillProject || {}),
      });
    }
  }, [id, isEdit, prefillProject]);

  const [partners, setPartners] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners`)
      .then((res) => res.json())
      .then((data) => setPartners(data))
      .catch((err) => console.error("Failed to fetch partners:", err));
  }, []);

  const selectedPartner = useMemo(() => {
    return (
      partners.find(
        (p) =>
          p._id === project.bPartnerID || p.partnerNumber === project.bPartnerCode
      ) || null
    );
  }, [partners, project.bPartnerID, project.bPartnerCode]);

  const contactOptions = selectedPartner?.contacts || [];

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

  const requiredFields = [
    "projectID",
    "bPartnerCode",
    "bPartnerID",
    "name",
    "contact",
    "status",
    "description",
    "poNumber",
    "quoteNumber",
    "salesOrderNumber",
    "startDate",
    "endDate",
    "estDate",
    "commitDate",
    "poDate",
    "actDate",
  ];

  const isFormComplete = requiredFields.every((key) => {
    const value = project?.[key];
    if (typeof value === "string") return value.trim().length > 0;
    return Boolean(value);
  });

  const handleSave = async () => {
    if (!isFormComplete) {
      toast.warning("Please fill all fields before saving.");
      return;
    }
    if (isEdit) {
      // Update existing project
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`,
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
        toast.success("Project updated successfully");
      } catch (error) {
        console.error("Error updating project:", error);
        toast.error("Failed to update project");
      }
    } else {
      // Create new project
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(project),
      });
      console.log("New project created successfully");
      toast.success("Project created successfully");
    }
  };
  const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this project?")) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`, {
        method: "DELETE",
      })
        .then((response) => {
          if (!response.ok) throw new Error("Failed to delete project");
          
          window.location.href = "/projects"; // Redirect to projects list
          // Optionally redirect or reset state after deletion
          toast.success("Project deleted successfully");
        })
        .catch((error) => {
          console.error("Error deleting project:", error);
          toast.error("Failed to delete project");
        });
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
                    <div className={styles.infoDetail}>SAP Partner Code</div>{" "}
                    <select
                      name="bPartnerCode"
                      value={project.bPartnerCode}
                      onChange={(e) => {
                        const selectedCode = e.target.value;
                        const partnerMatch = partners.find(
                          (p) => p.partnerNumber === selectedCode
                        );
                        setProject((prev) => {
                          const partnerChanged = prev.bPartnerCode !== selectedCode;
                          return {
                            ...prev,
                            bPartnerCode: selectedCode,
                            bPartnerID: partnerMatch ? partnerMatch._id : "",
                            name: partnerMatch ? partnerMatch.name : "",
                            contact: partnerChanged ? "" : prev.contact,
                          };
                        });
                      }}
                    >
                      <option value="">{project.bPartnerCode || "Select Partner Code"}</option>
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
                    <select
                      name="contact"
                      value={project.contact}
                      onChange={handleChange}
                      disabled={!contactOptions.length}
                    >
                      <option value="">
                        {contactOptions.length
                          ? "Select Contact"
                          : "No contacts available"}
                      </option>
                      {contactOptions.map((contact) => {
                        const optionLabel =
                          contact.name ||
                          contact.email ||
                          "Unnamed Contact";
                        const optionSuffix = contact.jobTitle
                          ? ` - ${contact.jobTitle}`
                          : "";
                        return (
                          <option
                            key={contact._id || contact.name || contact.email}
                            value={contact.name || contact.email || ""}
                          >
                            {`${optionLabel}${optionSuffix}`}
                          </option>
                        );
                      })}
                      {!contactOptions.length && project.contact ? (
                        <option value={project.contact}>{project.contact}</option>
                      ) : null}
                    </select>
                  </div>
                  <div className={styles.info} style={{ width: "15%" }}>
                    <div className={styles.infoDetail}>Status</div>{" "}
                    <select
                      name="status"
                      value={project.status}
                      onChange={handleChange}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
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
                      name="endDate"
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
                      name="poDate"
                      value={
                        project.poDate ? project.poDate.split("T")[0] : ""
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
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={!isFormComplete}
              >
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
