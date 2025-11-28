import React, { useEffect , useState, useMemo } from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./Pdetail.module.css";
import TabbedTable from "../../../components/TabbedTable";
import { FaSave, FaTrash, FaImage } from "react-icons/fa";
import { useParams } from "react-router-dom";
import Modal from "../../../components/Modal";
import TestCodesChecklist from "../../../components/modals/TestCodeChecklist";
import ContactsForm from "../../../components/modals/ContactsForm";

// export default function Pdetail() {
//   const [partner, setPartner] = useState({
//     id: "C00030",
//     name: "Element Materials Technology - Cincinnati",
//     category: "Client & Vendor",
//     status: "Active",
//     address1: "3701 Port Union Road",
//     address2: "",
//     city: "Fairfield",
//     state: "OH",
//     zip: "45014",
//     country: "USA",
//     image: null,
//   });
export default function Pdetail() {
  const { id } = useParams();
  console.log("ID from params:", id);
  const [partner, setPartner] = useState({
    partnerNumber: "",
    name: "",
    category: "",
    phone: "",
    email: "",
    status: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    image: null,
  });
  const isEdit = Boolean(id);
  console.log("Is Edit Mode:", isEdit);

  const [related, setRelated] = useState(null);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetch(`http://localhost:5174/api/bpartners/${id}`)
        .then((res) => res.json())
        .then((data) => setPartner(data))
        .catch((err) => console.error("Failed to fetch partner:", err));
      setLoadingRelated(true);
      fetch(`http://localhost:5174/api/bpartners/${id}/related`)
        .then((res) => res.json())
        .then((data) => setRelated(data))
        .catch((err) => console.error("Failed to fetch related data:", err))
        .finally(() => setLoadingRelated(false));
    } else {
      // Reset to empty for add mode
      setPartner({
        partnerNumber: "",
        name: "",
        category: "",
        phone: "",
        email: "",
        status: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        image: null,
      });
      setRelated(null);
    }
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPartner((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPartner((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPartner((prev) => ({
          ...prev,
          image: reader.result, // This will be a base64 string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
    const partnerData = {
      ...partner,
      status: partner.status || "Active", // Default to "Active" if not set
    };
    // Validate required fields
    const requiredFields = ["partnerNumber", "name", "category"];
    const missingFields = requiredFields.filter((field) => !partner[field]);

    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }

    if (isEdit) {
      const response = await fetch(
        `http://localhost:5174/api/bpartners/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partnerData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update partner");
      }

      alert("Partner updated successfully!");
      
    } else {
      console.log("Creating new partner:", partnerData);
      const response = await fetch(`http://localhost:5174/api/bpartners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partnerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create partner");
      }

      // const data = await response.json();
      alert("Partner created successfully!");
      
    }
  } catch (error) {
    console.error("Error saving partner:", error);
    alert(`Error: ${error.message}`);
  }
  };
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this partner?")) {
      fetch(`http://localhost:5174/api/bpartners/${id}`, {
        method: "DELETE",
      })
        .then(() => {
          alert("Partner deleted!");
          window.location.href = "/BuisnessPartner";
        })
        .catch((err) => console.error("Failed to delete partner:", err));
    }
  };


  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  };

  const data = useMemo(() => {
    const projects = related?.projects?.data || [];
    const shipments = related?.shipments?.data || [];
    const samples = related?.samples?.data || [];
    const contacts = related?.contacts?.data || [];
    const testCodes = related?.testCodes?.data || [];

    return {
      Projects: {
        columns: [
          { label: "ID", key: "id" },
          { label: "Description", key: "desc" },
          { label: "Start Date", key: "start" },
          { label: "Due Date", key: "due" },
        ],
        rows: projects.map((p) => ({
          id: p._id || "",
          desc: p.description || p.name || "",
          start: formatDate(p.startDate),
          due: formatDate(p.endDate),
        })),
      },

      Shipments: {
        columns: [
          { label: "ID", key: "id" },
          { label: "Description", key: "desc" },
          { label: "Ship Date", key: "start" },
          { label: "Delivery Date", key: "due" },
        ],
        rows: shipments.map((s) => ({
          id: s._id || "",
          desc: s.note || `${s.shipmentOrigin || ""} → ${s.shipmentDestination || ""}`.trim(),
          start: formatDate(s.shipmentDate),
          due: formatDate(s.estimatedArrivalDate || s.estDate),
        })),
      },

      Reports: {
        columns: [
          { label: "ID", key: "id" },
          { label: "Title", key: "desc" },
          { label: "Created On", key: "start" },
          { label: "Approved On", key: "due" },
        ],
        rows: samples.map((s) => ({
          id: s._id || "",
          desc: s.description || s.name || "",
          start: formatDate(s.startDate),
          due: formatDate(s.endDate),
        })),
      },

      Contacts: {
        columns: [
          { label: "Name", key: "name" },
          { label: "Email", key: "email" },
          { label: "Phone", key: "phone" },
        ],
        rows: contacts.map((c) => ({
          name: [c.firstName, c.lastName].filter(Boolean).join(" "),
          email: c.email || "",
          phone: c.phone || "",
        })),
      },

      "Test Codes": {
        columns: [
          { label: "GRK Test Code", key: "id" },
          { label: "Description", key: "desc" },
          { label: "Category", key: "cate" },
        ],
        rows: testCodes.map((t) => ({
          id: t.code || t._id || "",
          desc: t.descriptionShort || "",
          cate: t.category || "",
        })),
      },
    };
  }, [related]);

    const [activeModal, setActiveModal] = useState(null);
    const handleAddClick = (tab) => {
      if (tab === "Contacts") {
        setActiveModal("contacts");
      } else if (tab === "Test Codes") {
        setActiveModal("testcodes");
      }
    };

    const handleOnClose = () => {
      setActiveModal(null);
    };
  
  return (
    <>
      <h2 className={styles.bHeading}>Business Partner Detail</h2>
      <div className={styles.detailPage}>
        <div className={styles.leftGrid}>
          <WhiteIsland className={styles.bigIsland}>
            <h3>Partner Info</h3>
            <div className={styles.main}>
              <div className={styles.picture}>
                <img
                  src={partner.image ? partner.image : "/SmallLogo.png"}
                  width={128}
                  height={128}
                  alt="Partner"
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
                {/* detail line 1 */}
                <div className={styles.details}>
                  <div className={styles.info} style={{ width: "15%" }}>
                    <div className={styles.infoDetail}>SAP Partner ID</div>
                    <input
                      name="partnerNumber"
                      value={partner.partnerNumber}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info} style={{ width: "60%" }}>
                    <div className={styles.infoDetail}>Name</div>
                    <input
                      name="name"
                      value={partner.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Category</div>
                    <select
                      className={styles.dropdown}
                      name="category"
                      value={partner.category}
                      onChange={handleChange}
                    >
                      <option value="Vendor">Vendor</option>
                      <option value="Client">Client</option>
                      <option value="Client & Vendor">
                        Client &amp; Vendor
                      </option>
                    </select>
                  </div>
                </div>

                {/* details line 2 */}
                <div className={styles.details2}>
                  <div className={styles.info} style={{ width: "15%" }}>
                    <div className={styles.infoDetail}>Status</div>
                    <select
                      className={styles.dropdown}
                      name="status"
                      value={partner.status || "Active"}
                      onChange={handleChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className={styles.info2} style={{ width: "60%" }}>
                    <div className={styles.infoDetail}>Email</div>
                    <input
                      name="email"
                      value={partner.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info2} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Phone number</div>
                    <input
                      name="phone"
                      value={partner.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* detail line 3 */}
                <div className={styles.details2}>
                  <div className={styles.info2} style={{ width: "100%" }}>
                    <div className={styles.infoDetail}>Address 1</div>
                    <input
                      name="address1"
                      value={partner.address1}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info2} style={{ width: "100%" }}>
                    <div className={styles.infoDetail}>Address 2</div>
                    <input
                      name="address2"
                      value={partner.address2}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* detail line 4 */}
                <div className={styles.details}>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>City</div>
                    <input
                      name="city"
                      value={partner.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>State</div>
                    <input
                      name="state"
                      value={partner.state}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Zip</div>
                    <input
                      name="zip"
                      value={partner.zip}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Country</div>
                    <input
                      name="country"
                      value={partner.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.saves}>
              <button className={styles.deleteButton} onClick={handleDelete}>
                <FaTrash />
                Delete{" "}
              </button>
              <button className={styles.saveButton} onClick={handleSave}>
                <FaSave />
                Save{" "}
              </button>
            </div>
          </WhiteIsland>
        </div>

        <div className="table">
          {/* Table data passing with clicks and modalWindows */}
          <TabbedTable
            data={data}
            showAddButtonForTabs={["Contacts", "Test Codes"]}
            onAddClick={handleAddClick}
          />
          {loadingRelated && <div style={{ padding: 12 }}>Loading related data...</div>}
          {activeModal && (
            <Modal onClose={() => setActiveModal(null)}>
              {activeModal === "contacts" && (
                <ContactsForm onClose={handleOnClose} bPartnerID={id} />
              )}
              {activeModal === "testcodes" && (
                <TestCodesChecklist onClose={handleOnClose} />
              )}
            </Modal>
          )}
        </div>
      </div>
    </>
  );
}