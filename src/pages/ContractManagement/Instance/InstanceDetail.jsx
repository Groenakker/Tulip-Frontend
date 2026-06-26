import React, { useEffect, useState } from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./InstanceDetail.module.css";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaTrash } from "react-icons/fa";
import Header from "../../../components/Header";
import OpenRecordLink from "../../../components/RecordLink/OpenRecordLink";

// Status palette shared with the Lab Studies pages so the pill colours
// match wherever a study appears.
const LAB_STUDY_STATUS_PALETTE = {
  Draft: ["#f3f4f6", "#374151"],
  Assigned: ["#dbeafe", "#1e40af"],
  "In Progress": ["#fef3c7", "#92400e"],
  Completed: ["#dcfce7", "#166534"],
  Cancelled: ["#fee2e2", "#991b1b"],
};

export default function InstanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState({
    instanceCode: "",
    sampleCode: "",
    lotNo: "",
    status: "",
    idSample: null,
  });
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);
  // Lab studies this instance is currently assigned to (one instance
  // can be part of multiple studies on a bulk sample). Surfacing the
  // list here gives lab users a single jump-off point to every test
  // currently consuming the physical sample.
  const [labStudies, setLabStudies] = useState([]);
  const [loadingStudies, setLoadingStudies] = useState(true);

  useEffect(() => {
    if (id) {
      // Fetch instance details
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setInstance(data.instance || data);
          setLoading(false);
          console.log('instance data' , data);
        })
        .catch((err) => {
          console.error("Failed to fetch instance:", err);
          setLoading(false);
        });

      // Fetch movements separately
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instance-movements/instance/${id}`)
        .then((res) => res.json())
        .then((data) => {
          // Handle both array response and object with movements array
          const movementsData = Array.isArray(data) ? data : (data.movements || []);
          setMovements(movementsData);
          setLoadingMovements(false);
          console.log('movements data' , movementsData);
        })
        .catch((err) => {
          console.error("Failed to fetch movements:", err);
          setMovements([]);
          setLoadingMovements(false);
        });

      // Fetch related lab studies (instances[].instanceId === id).
      fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/lab-studies?instanceId=${id}`,
        { credentials: "include" }
      )
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          setLabStudies(Array.isArray(data) ? data : []);
          setLoadingStudies(false);
        })
        .catch((err) => {
          console.error("Failed to fetch related lab studies:", err);
          setLabStudies([]);
          setLoadingStudies(false);
        });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInstance((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instance),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update instance");
      }

      alert("Instance updated successfully!");
    } catch (error) {
      console.error("Error saving instance:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this instance?")) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/instances/${id}`, {
        method: "DELETE",
      })
        .then(() => {
          alert("Instance deleted!");
          navigate("/Instance");
        })
        .catch((err) => console.error("Failed to delete instance:", err));
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  };
  console.log(instance);
  
  if (loading) {
    return <div>Loading instance details...</div>;
  }

  return (
    <>
      {/* <h2 className={styles.bHeading}>Instance Detail</h2> */}
      <Header title="Instance Detail" />
      <div className={styles.detailPage}>
        <div className={styles.leftGrid}>
          <WhiteIsland className={styles.bigIsland}>
            <h3>Instance Info</h3>
            <div className={styles.main}>
              <div className={styles.detailContainer}>
                {/* detail line 1 */}
                <div className={styles.details}>
                  <div className={styles.info} style={{ width: "50%" }}>
                    <div className={styles.infoDetail}>Instance Code</div>
                    <input
                      name="instanceCode"
                      value={instance.instanceCode || ""}
                      onChange={handleChange}
                      readOnly
                    />
                  </div>
                  <div className={styles.info} style={{ width: "50%" }}>
                    <div className={styles.infoDetail}>
                      Sample Code
                      {(instance.idSample?._id || instance.idSample) && (
                        <OpenRecordLink
                          to={`/SampleSubmission/SSDetail/${instance.idSample?._id || instance.idSample}`}
                          title="Open sample submission"
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </div>
                    <input
                      name="sampleCode"
                      value={instance.sampleCode || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* details line 2 */}
                <div className={styles.details2}>
                  <div className={styles.info} style={{ width: "50%" }}>
                    <div className={styles.infoDetail}>Lot No</div>
                    <input
                      name="lotNo"
                      value={instance.lotNo || ""}
                      onChange={handleChange}
                    />
                  </div>
                  <div className={styles.info} style={{ width: "50%" }}>
                    <div className={styles.infoDetail}>Status</div>
                    <select
                      className={styles.dropdown}
                      name="status"
                      value={instance.status || "Pending"}
                      onChange={handleChange}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Testing">In Testing</option>
                      <option value="Completed">Completed</option>
                      <option value="Failed">Failed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* detail line 3 */}
                <div className={styles.details2}>
                  <div className={styles.info2} style={{ width: "100%" }}>
                    <div className={styles.infoDetail}>Created At</div>
                    <input
                      value={formatDate(instance.createdAt)}
                      readOnly
                    />
                  </div>
                </div>

                {/* detail line 4 */}
                <div className={styles.details2}>
                  <div className={styles.info2} style={{ width: "100%" }}>
                    <div className={styles.infoDetail}>Updated At</div>
                    <input
                      value={formatDate(instance.updatedAt)}
                      readOnly
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

        {/* ---------- Related Lab Studies ---------- */}
        <div className={styles.studiesSection}>
          <WhiteIsland className={styles.bigIsland}>
            <h3>Related Lab Studies</h3>
            {loadingStudies ? (
              <div style={{ padding: 12 }}>Loading lab studies…</div>
            ) : labStudies.length === 0 ? (
              <div className={styles.emptyStudies}>
                This instance isn't assigned to any lab studies yet.
              </div>
            ) : (
              <div className={styles.movementsTable}>
                <table className={styles.studiesTable}>
                  <thead>
                    <tr>
                      <th>Study #</th>
                      <th>Test</th>
                      <th>Vendor</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labStudies.map((study) => {
                      const [bg, color] =
                        LAB_STUDY_STATUS_PALETTE[study.status] ||
                        LAB_STUDY_STATUS_PALETTE.Draft;
                      return (
                        <tr key={study._id}>
                          <td>{study.studyCode || "—"}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{study.grkCode || "—"}</div>
                            {study.testCodeRef && (
                              <div style={{ fontSize: 12, color: "#6b7280" }}>
                                {study.testCodeRef}
                              </div>
                            )}
                          </td>
                          <td>{study.vendorBpName || "Not assigned"}</td>
                          <td>{study.customerBpName || "—"}</td>
                          <td>
                            <span className={styles.studyStatusPill} style={{ background: bg, color }}>
                              {study.status || "Draft"}
                            </span>
                          </td>
                          <td>
                            <OpenRecordLink
                              to={`/LabStudies/${study._id}`}
                              title="Open lab study"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </WhiteIsland>
        </div>

        <div className={styles.movementsSection}>
          <WhiteIsland className={styles.bigIsland}>
            <h3>Movement History</h3>
            {loadingMovements ? (
              <div style={{ padding: 12 }}>Loading movements...</div>
            ) : movements.length === 0 ? (
              <div style={{ padding: 12 }}>No movements recorded yet.</div>
            ) : (
              <div className={styles.movementsTable}>
                <table className={styles.movementTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Location/Warehouse</th>
                      <th>Receiving/Shipping</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr key={movement._id}>
                        <td>{formatDate(movement.movementDate)}</td>
                        <td>
                          <span className={`${styles.movementBadge} ${styles[movement.movementType.toLowerCase().replace(' ', '')]}`}>
                            {movement.movementType}
                          </span>
                        </td>
                        <td>
                          {movement.warehouseId?._id ? (
                            <OpenRecordLink
                              to={`/Warehouse/${movement.warehouseId._id}`}
                              title="Open warehouse"
                            >
                              {movement.warehouseId.warehouseID || movement.warehouseID || movement.location || "-"}
                            </OpenRecordLink>
                          ) : (
                            movement.warehouseId?.warehouseID || movement.warehouseID || movement.location || "-"
                          )}
                          {movement.warehouseId?.address && (
                            <div style={{ fontSize: "11px", color: "#666" }}>
                              {movement.warehouseId.address}
                            </div>
                          )}
                        </td>
                        <td>
                          {movement.receivingId && (
                            <div>
                              <div>
                                Receiving:{" "}
                                <OpenRecordLink
                                  to={movement.receivingId._id ? `/RecieveLog/RecieveDetails/${movement.receivingId._id}` : ""}
                                  title="Open receiving log"
                                >
                                  {movement.receivingId.receivingCode}
                                </OpenRecordLink>
                              </div>
                              <div style={{ fontSize: "11px", color: "#666" }}>
                                {movement.receivingId.origin} → {movement.receivingId.destination}
                              </div>
                            </div>
                          )}
                          {movement.shippingId && (
                            <div>
                              <div>
                                Shipping:{" "}
                                <OpenRecordLink
                                  to={movement.shippingId._id ? `/ShippingLog/${movement.shippingId._id}` : ""}
                                  title="Open shipping log"
                                >
                                  {movement.shippingId.shippingCode}
                                </OpenRecordLink>
                              </div>
                              <div style={{ fontSize: "11px", color: "#666" }}>
                                {movement.shippingId.shipmentOrigin} → {movement.shippingId.shipmentDestination}
                              </div>
                            </div>
                          )}
                          {!movement.receivingId && !movement.shippingId && "-"}
                        </td>
                        <td>{movement.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </WhiteIsland>
        </div>
      </div>
    </>
  );
}

