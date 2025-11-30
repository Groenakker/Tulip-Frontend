import { useState, useEffect } from "react";
import styles from "./UserEditModal.module.css";
import { IoMdClose } from "react-icons/io";
import { FaTrash } from "react-icons/fa";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const UserEditModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    roleIds: user?.roleIds || [],
  });
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch roles from database
  useEffect(() => {
    const controller = new AbortController();

    const fetchRoles = async () => {
      setRolesLoading(true);
      setRolesError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/roles`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load roles.");
        }

        const normalizedRoles = Array.isArray(data)
          ? data
              .filter((role) => role.isActive !== false)
              .map((role) => ({
                id: role._id || role.id,
                name: role.name || "",
              }))
          : [];

        setRoles(normalizedRoles);

        // Initialize formData with user's current role IDs
        if (user) {
          // Extract role IDs from user object
          const userRoleIds = [];
          
          // First, try to get role IDs directly
          if (user.roleIds && Array.isArray(user.roleIds)) {
            userRoleIds.push(...user.roleIds.filter(Boolean));
          }
          
          // Also check if roles array contains IDs or objects with IDs
          if (user.roles && Array.isArray(user.roles)) {
            user.roles.forEach((role) => {
              if (typeof role === "string") {
                // Check if it's an ID (MongoDB ObjectId format) or a role name
                // MongoDB ObjectIds are 24 hex characters
                if (/^[0-9a-fA-F]{24}$/.test(role)) {
                  userRoleIds.push(role);
                }
              } else if (role && typeof role === "object") {
                // If it's a role object, extract the ID
                if (role._id) {
                  userRoleIds.push(role._id);
                } else if (role.id) {
                  userRoleIds.push(role.id);
                }
              }
            });
          }

          // Match role IDs first
          let matchedIds = normalizedRoles
            .filter((role) => userRoleIds.includes(role.id))
            .map((role) => role.id);

          // If no IDs matched, try matching by role names
          if (matchedIds.length === 0 && user.roles && Array.isArray(user.roles)) {
            const roleNames = user.roles
              .map((role) => (typeof role === "string" ? role : role?.name))
              .filter(Boolean);
            
            matchedIds = normalizedRoles
              .filter((role) => roleNames.includes(role.name))
              .map((role) => role.id);
          }

          setFormData((prev) => ({
            ...prev,
            roleIds: matchedIds,
          }));
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setRolesError(error.message || "Failed to load roles.");
      } finally {
        if (!controller.signal.aborted) {
          setRolesLoading(false);
        }
      }
    };

    fetchRoles();

    return () => controller.abort();
  }, [user]);

  const handleNameChange = (e) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleRoleToggle = (roleId) => {
    setFormData((prev) => {
      const currentRoleIds = prev.roleIds || [];
      if (currentRoleIds.includes(roleId)) {
        return {
          ...prev,
          roleIds: currentRoleIds.filter((id) => id !== roleId),
        };
      } else {
        return {
          ...prev,
          roleIds: [...currentRoleIds, roleId],
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      // Update user roles via API
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          roleIds: formData.roleIds,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update user roles.");
      }

      // Update user name if changed (if there's an endpoint for that)
      if (formData.name !== user.name) {
        // Note: You may need to add an endpoint to update user name
        // For now, we'll just update roles
      }

      // Call onSave with updated user data
      onSave({
        ...user,
        name: formData.name,
        roleIds: formData.roleIds,
        roles: roles
          .filter((role) => formData.roleIds.includes(role.id))
          .map((role) => role.name),
        role: roles.find((r) => formData.roleIds.includes(r.id))?.name || "",
      });
    } catch (error) {
      setSaveError(error.message || "Failed to save user changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    onSave({
      ...user,
      action: "delete",
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <IoMdClose />
        </button>
        <h2 className={styles.title}>Edit User</h2>

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.labelText}>Name</span>
              <input
                className={styles.input}
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelText}>Roles</span>
              {rolesLoading ? (
                <div className={styles.loadingText}>Loading roles...</div>
              ) : rolesError ? (
                <div className={styles.errorText}>{rolesError}</div>
              ) : roles.length === 0 ? (
                <div className={styles.errorText}>No roles available</div>
              ) : (
                <div className={styles.rolesContainer}>
                  {roles.map((role) => (
                    <label key={role.id} className={styles.roleCheckbox}>
                      <input
                        type="checkbox"
                        checked={formData.roleIds?.includes(role.id) || false}
                        onChange={() => handleRoleToggle(role.id)}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </label>

            {saveError && (
              <div className={styles.errorText}>{saveError}</div>
            )}

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <FaTrash />
                Delete User
              </button>
              <div className={styles.rightButtons}>
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
                  disabled={saving || rolesLoading || formData.roleIds?.length === 0}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className={styles.deleteConfirm}>
            <h3>Are you sure you want to delete this user?</h3>
            <p>This action cannot be undone.</p>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.deleteConfirmBtn}
                onClick={handleDelete}
              >
                <FaTrash />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserEditModal;

