import React, { useEffect, useState } from "react";
import WhiteIsland from "../../../components/Whiteisland";
import styles from "./InstanceDetail.module.css";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaTrash } from "react-icons/fa";

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

  useEffect(() => {
    if (id) {
      // Fetch instance details
      fetch(`http://localhost:5174/api/instances/${id}/movements`)
        .then((res) => res.json())
        .then((data) => {
          setInstance(data.instance);
          setMovements(data.movements || []);
          setLoading(false);
          setLoadingMovements(false);
        })
        .catch((err) => {
          console.error("Failed to fetch instance:", err);
          setLoading(false);
          setLoadingMovements(false);
        });
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInstance((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:5174/api/instances/${id}`, {
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
      fetch(`http://localhost:5174/api/instances/${id}`, {
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

  if (loading) {
    return <div>Loading instance details...</div>;
  }

  return (
    <>
      <h2 className={styles.bHeading}>Instance Detail</h2>
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
                    <div className={styles.infoDetail}>Sample Code</div>
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
                          {movement.warehouseId?.warehouseID || movement.warehouseID || movement.location || "-"}
                          {movement.warehouseId?.address && (
                            <div style={{ fontSize: "11px", color: "#666" }}>
                              {movement.warehouseId.address}
                            </div>
                          )}
                        </td>
                        <td>
                          {movement.receivingId && (
                            <div>
                              <div>Receiving: {movement.receivingId.receivingCode}</div>
                              <div style={{ fontSize: "11px", color: "#666" }}>
                                {movement.receivingId.origin} → {movement.receivingId.destination}
                              </div>
                            </div>
                          )}
                          {movement.shippingId && (
                            <div>
                              <div>Shipping: {movement.shippingId.shippingCode}</div>
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

