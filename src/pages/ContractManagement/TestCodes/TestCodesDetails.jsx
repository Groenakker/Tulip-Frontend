import WhiteIsland from "../../../components/Whiteisland";
import styles from "./TestCodesDetails.module.css";
import { FaSave, FaTrash, FaImage } from "react-icons/fa";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast from "../../../components/Toaster/toast";

export default function TestCodesDetails() {
  const { id } = useParams();
  //DUMMY DATA FOR TEST DETAILS
  // This is a placeholder for the actual data fetching logic.
  const [Test, setTest] = useState({
    code: "",
    descriptionShort: "",
    standard: "",
    STPNumber: "",
    category: "",
    extractBased: "",
    turnAroundTime: "",
    numberOfExtract: "",
    minDevPerExtract: "",
    minMLPerExtract: "",
    minDevPerTest: "",
    
  });
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      // Fetch the test details from the backend using the id
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes/${id}`)
        .then((response) => response.json())
        .then((data) => setTest(data))
        .catch((error) => console.error("Error fetching test details:", error));
    } else {
      // If not editing, set default values or handle accordingly
      setTest({
        code: "",
        descriptionShort: "",
        standard: "",
        STPNumber: "",
        category: "",
        extractBased: "",
        turnAroundTime: "",
        numberOfExtract: "",
        minDevPerExtract: "",
        minMLPerExtract: "",
        minDevPerTest: "",
      });
    }
  }, [id, isEdit]);

  // HANDLING FUNCTIONS FOR BUTTONS AND INPUTS AND Search
  const handleChange = (e) => {
    const { name, value } = e.target;
    setTest((prev) => ({ ...prev, [name]: value }));
  };
//   const handleImageChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setTest((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
//     }
//   };
  const handleSave = async () => {
    if (isEdit) {
      // Update existing test code
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Test),
      });
      toast.success("Test code updated successfully");
    } else {
      // Create new test code
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Test),
      });
      toast.success("Test code created successfully");
      console.log("Test details saved:", Test);
    }
    // Redirect or update state as needed
    // For now, just log the Test object
    console.log("Test details saved:", Test);
  };
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this test code?")) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes/${id}`, {
        method: "DELETE",
      })
        .then((response) => {
          if (response.ok) {
            toast.success("Test code deleted successfully");
            // Redirect or update state as needed
            // For now, just log the deletion
          } else {
            toast.error("Failed to delete test code: " + response.statusText);
            return;
          }
        })
        .catch((error) => {
          toast.error("Failed to delete test code: " + error.message);
        });
    }
    console.log("Test deleted:", Test.id);
  };

  return (
    <>
      <h2 className={styles.bHeading}>Test Detail</h2>
      <div className={styles.detailPage}>
        <div className={styles.leftGrid}>
          <WhiteIsland className={styles.bigIsland}>
            <h3>Test Info</h3>
            <div className={styles.main}>
              {/* <div className={styles.picture}>
                                <img
                                    src={Test.image ? Test.image : "/SampleLogo.jpeg"}
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
                            </div> */}
              <div className={styles.detailContainer}>
                <div className={styles.details}>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Test ID</div>{" "}
                    <input
                      name="code"
                      value={Test.code}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Standard</div>{" "}
                    <input
                      name="standard"
                      value={Test.standard}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>GRK Protocol</div>{" "}
                    <input
                      name="STPNumber"
                      value={Test.STPNumber}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Category</div>{" "}
                    <input
                      name="category"
                      value={Test.category}
                      onChange={handleChange}
                    ></input>
                  </div>
                </div>
                <div className={styles.details2}>
                  <div className={styles.info2} style={{ width: "100%" }}>
                    <div className={styles.infoDetail}>Description</div>{" "}
                    <input
                      name="descriptionShort"
                      value={Test.descriptionShort}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info2}>
                    <div className={styles.infoDetail}>Extracted Basis</div>{" "}
                    <input
                      name="extractBased"
                      value={Test.ExtractBased}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info2}>
                    <div className={styles.infoDetail}>Standard TAT(days)</div>{" "}
                    <input
                      name="turnAroundTime"
                      value={Test.turnAroundTime}
                      onChange={handleChange}
                    ></input>
                  </div>
                  {/* <div className={styles.info2}>
                    <div className={styles.infoDetail}>Expedited TAT(days)</div>{" "}
                    <input
                      name="ExpeditedTAT"
                      value={Test.ExpeditedTAT}
                      onChange={handleChange}
                    ></input>
                  </div> */}
                </div>
                <div className={styles.details3}>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>Extracts Per Test</div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="text"
                      name="numberOfExtract"
                      value={Test.numberOfExtract}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>
                      Minimum Devices per Extract
                    </div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="text"
                      name="minDevPerExtract"
                      value={Test.minDevPerExtract}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>
                      Minimum mL per Extract
                    </div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="text"
                      name="minMLPerExtract"
                      value={Test.minMLPerExtract}
                      onChange={handleChange}
                    ></input>
                  </div>
                  <div className={styles.info} style={{ width: "25%" }}>
                    <div className={styles.infoDetail}>
                      Minimum Dev per Test
                    </div>{" "}
                    <input
                      style={{ height: "20px" }}
                      type="text"
                      name="minDevPerTest"
                      value={Test.minDevPerTest}
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
      </div>
    </>
  );
}
