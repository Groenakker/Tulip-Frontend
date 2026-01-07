import { useState } from "react";
import styles from "./SampleModal.module.css";
import toast from "../Toaster/toast";

const SampleForm = ({ onClose, projectId, project }) => {
  const [sampleData, setSampleData] = useState({
    id: "",
    description: "",
    lot: "",
    dcu: "",
    notes: "",
    manufacturer: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSampleData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Button Clicked");
    
    // Validate required fields
    if (!sampleData.id || !sampleData.description) {
      toast.error("Please fill in Sample ID and Description");
      //return;
    }

    // Check if project is selected
    if (!projectId) {
      toast.error("Please select a project in the receiving page first");
     // return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Fetch project details to get business partner ID
      const projectRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${projectId}`);
      if (!projectRes.ok) {
        throw new Error('Failed to fetch project details');
      }
      const projectData = await projectRes.json();

      // Step 2: Fetch business partner details from the project
      let businessPartnerData = null;
      if (projectData.bPartnerID) {
        const bpRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${projectData.bPartnerID}`);
        if (bpRes.ok) {
          businessPartnerData = await bpRes.json();
          console.log("BPartner Data:", businessPartnerData);
        }
        else {
          throw new Error('Failed to fetch business partner details');
        }
      }

      // Step 3: Create sample with form data and business partner details
      const samplePayload = {
        sampleCode: sampleData.id,
        description: sampleData.description,
        lot: sampleData.lot || '',
        dcu: sampleData.dcu || '',
        notes: sampleData.notes || '',
        manufacturer: sampleData.manufacturer || '',
        status: 'Draft',
        // Include business partner details if available
        ...(businessPartnerData && {
          bPartnerID: businessPartnerData._id || projectData.bPartnerID,
          client: businessPartnerData.name || '',
          bPartnerCode: businessPartnerData.partnerNumber || '',
          SAPid: businessPartnerData.SAPid || '',
          address: businessPartnerData.address1 & businessPartnerData.city & businessPartnerData.state & businessPartnerData.zip & businessPartnerData.country || '',
          
          phone: businessPartnerData.phone || '',
          email: businessPartnerData.email || '',
        }),
        // Include project reference
        projectID: projectData.projectID,
        projectName: projectData.name || projectData.projectID || '',
        // Store form data
        formData: {
          ...sampleData,
          projectId: projectData.projectId,
          projectName: projectData.name || projectData.projectID || '',
        }
      };
      console.log("Sample Payload:", samplePayload);
      // Step 4: Create the sample via API
      const createRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload)
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({ message: 'Failed to create sample' }));
        throw new Error(errorData.message || 'Failed to create sample');
      }

      const createdSample = await createRes.json();
      toast.success('Sample created successfully!');
      onClose();
      
      // Optionally refresh the page or trigger a callback
     // if (window.location.reload) {
        // You might want to add a callback prop instead of reloading
       // setTimeout(() => window.location.reload(), 500);
     // }
    } catch (error) {
      console.error('Error creating sample:', error);
      toast.error(error.message || 'Failed to create sample');
    } finally {
      setIsSubmitting(false);
    }
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
            <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SampleForm;
