import { useState, useEffect } from "react";
import styles from "./EditProfileModal.module.css";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { FaImage } from "react-icons/fa";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const EditProfileModal = ({ onClose }) => {
  const { user, checkAuth } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    profilePicture: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        profilePicture: user.profilePicture || "",
      });
      setPreviewImage(user.profilePicture || "https://i.pravatar.cc/40");
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user makes changes
    if (saveError) {
      setSaveError(null);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setSaveError("Please select a valid image file.");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSaveError("Image size must be less than 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUrl = reader.result;
        setPreviewImage(imageDataUrl);
        setFormData((prev) => ({ ...prev, profilePicture: imageDataUrl }));
        // Clear error when image is successfully loaded
        if (saveError) {
          setSaveError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    if (!user?._id) {
      setSaveError("User ID not found. Please try again.");
      setSaving(false);
      return;
    }

    try {
      // Prepare request body with only changed fields
      const requestBody = {};
      
      if (formData.name.trim() !== (user.name || "")) {
        requestBody.name = formData.name.trim();
      }
      
      if (formData.profilePicture && formData.profilePicture !== (user.profilePicture || "")) {
        requestBody.profilePicture = formData.profilePicture;
      }

      // Only make API call if there are changes
      if (Object.keys(requestBody).length === 0) {
        onClose();
        return;
      }

      // Update user profile via API
      const response = await fetch(`${API_BASE_URL}/users/${user._id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update profile.");
      }

      // Refresh user data from context
      await checkAuth();

      // Close modal on success
      onClose();
    } catch (error) {
      setSaveError(error.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalContent}>
        <h2 className={styles.title}>Edit Profile</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Profile Picture */}
          <div className={styles.profilePictureSection}>
            <div className={styles.pictureContainer}>
              <img
                src={previewImage || "https://i.pravatar.cc/40"}
                alt="Profile"
                className={styles.profileImage}
              />
            </div>
            <label className={styles.uploadButton}>
              <FaImage />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
            </label>
          </div>

          {/* Name Field */}
          <label className={styles.field}>
            <span className={styles.labelText}>Name</span>
            <input
              className={styles.input}
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={saving}
            />
          </label>

          {/* Email Field */}
          {/* <label className={styles.field}>
            <span className={styles.labelText}>Email</span>
            <input
              className={styles.input}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={saving}
            />
          </label> */}

          {saveError && <div className={styles.errorText}>{saveError}</div>}

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={saving || !formData.name.trim()}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditProfileModal;

