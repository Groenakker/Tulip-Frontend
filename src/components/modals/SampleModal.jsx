import { useState } from "react";
import styles from "./SampleModal.module.css";
// import { useNavigate } from "react-router-dom";

const SampleForm = ({ onClose }) => {
//   const navigate = useNavigate();
  const [sampleData, setSampleData] = useState({
    id: "",
    description: "",
    lot: "",
    dcu: "",
    notes: "",
    manufacturer: "",
    sponsor: "",
    testMethod: "",
    exprie: "",
    markets: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSampleData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Sample data submitted:", sampleData);
    onClose();
  };

  const viewFullListing = () => {
    window.open("/SampleSubmission/SSDetail", "_blank");
  };

  return (
    <div className={styles.sampleFormContainer}>
      <h2 className={styles.title}>Add Sample</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.formSection}>
            <div className={styles.field}>
              <div className={styles.infoDetail}>Sample ID</div>
              <input
                className={styles.input}
                name="id"
                value={sampleData.id}
                onChange={handleChange}
                placeholder="GRK-SMPL-XXXXX-XX"
              />
            </div>

            <div className={styles.field}>
              <div className={styles.infoDetail}>Sample Description</div>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                name="description"
                value={sampleData.description}
                onChange={handleChange}
                placeholder="Enter description"
                rows="3"
              />
            </div>

            <div className={styles.field}>
              <div className={styles.infoDetail}>Lot Number</div>
              <input
                className={styles.input}
                name="lot"
                value={sampleData.lot}
                onChange={handleChange}
                placeholder="Enter lot number"
              />
            </div>

            <div className={styles.field}>
              <div className={styles.infoDetail}>Device Clinical Used</div>
              <input
                className={styles.input}
                type="number"
                name="dcu"
                value={sampleData.dcu}
                onChange={handleChange}
                placeholder="Enter Device Clinical used"
              />
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.field}>
              <div className={styles.infoDetail}>Manufacturer Name</div>
              <input
                className={styles.input}
                name="manufacturer"
                value={sampleData.manufacturer}
                onChange={handleChange}
                placeholder="Enter manufacturer"
              />
            </div>

            <div className={styles.field}>
              <div className={styles.infoDetail}>Sponsor</div>
              <input
                className={styles.input}
                name="sponsor"
                value={sampleData.sponsor}
                onChange={handleChange}
                placeholder="Enter sample Sponsor"
              />
            </div>

            <div className={styles.field}>
              <div className={styles.infoDetail}>Test Method</div>
              <input
                className={styles.input}
                name="testMethod"
                value={sampleData.testMethod}
                onChange={handleChange}
                placeholder="Enter test method"
              />
            </div>
            <div className={styles.field}>
              <div className={styles.infoDetail}>Expiration Date</div>
              <input
                className={styles.input}
                name="expire"
                value={sampleData.expire}
                onChange={handleChange}
                placeholder="Enter Expiration date"
              />
            </div>
            <div className={styles.field}>
              <div className={styles.infoDetail}>Desired Market</div>
              <input
                className={styles.input}
                name="markets"
                value={sampleData.markets}
                onChange={handleChange}
                placeholder="Enter desired market"
              />
            </div>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <div className={styles.leftButtons}>
            <button
              type="button"
              className={styles.viewButton}
              onClick={viewFullListing}
            >
              View Full Listing
            </button>
          </div>
          <div className={styles.rightButtons}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn}>
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SampleForm;
