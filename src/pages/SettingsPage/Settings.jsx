import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaEdit,
  FaUsers,
  FaShieldAlt,
  FaBuilding,
  FaBell,
  FaCog,
  FaPlus,
  FaSave,
  FaImage,
} from "react-icons/fa";
import WhiteIsland from "../../components/Whiteisland";
import styles from "./Settings.module.css";
import UserEditModal from "../../components/modals/UserEditModal";
import { useAuth } from "../../context/AuthContext";
import Modal from "../../components/Modal";

const API_BASE_URL = "http://localhost:5174/api";
const DEFAULT_COMPANY_IMAGE =
  "https://via.placeholder.com/120x120.png?text=Company";

const menuOptions = [
  { id: "users", label: "Users", icon: <FaUsers /> },
  { id: "roles", label: "Roles & Permissions", icon: <FaShieldAlt /> },
  { id: "company", label: "Company", icon: <FaBuilding /> },
  { id: "notifications", label: "Notifications", icon: <FaBell /> },
  { id: "system", label: "System Configuration", icon: <FaCog /> },
];

export default function Settings() {
  const [activeMenu, setActiveMenu] = useState("users");
  const [searchValue, setSearchValue] = useState("");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const { user } = useAuth();
  const [companyDetails, setCompanyDetails] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [companyForm, setCompanyForm] = useState({ name: "", address: "", email: "" });
  const [companyUpdateLoading, setCompanyUpdateLoading] = useState(false);
  const [companyUpdateError, setCompanyUpdateError] = useState("");
  const [roleOptions, setRoleOptions] = useState([]);
  
  // Roles & Permissions states
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolesSearchValue, setRolesSearchValue] = useState("");
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [permissionsError, setPermissionsError] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", permissions: [] });
  const [permissionForm, setPermissionForm] = useState({ module: "", availableActions: [], description: "" });
  const [roleFormError, setRoleFormError] = useState("");
  const [permissionFormError, setPermissionFormError] = useState("");
  const [roleFormLoading, setRoleFormLoading] = useState(false);
  const [permissionFormLoading, setPermissionFormLoading] = useState(false);

  useEffect(() => {
    const value = searchValue.toLowerCase();
    setFilteredUsers(
      users.filter(
        (user) =>
          user.name?.toLowerCase().includes(value) ||
          user.email?.toLowerCase().includes(value) ||
          user.role?.toLowerCase().includes(value)
      )
    );
    setPage(1); // Reset to first page when search changes
  }, [searchValue, users]);

  useEffect(() => {
    const updatePageSize = () => {
      const baseHeight = 703;
      const baseRows = 9;
      const incrementPx = 42;
      const extraRows = Math.floor(
        (window.innerHeight - baseHeight) / incrementPx
      );
      setPageSize(baseRows + Math.max(0, extraRows));
    };
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  useEffect(() => {
    if (!user?.companyId) {
      setCompanyDetails(null);
      setCompanyError(null);
      setCompanyLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCompanyDetails = async () => {
      setCompanyLoading(true);
      setCompanyError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/companies/${user.companyId}`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            data?.message || "Failed to load company details.";
          throw new Error(message);
        }

        if (!data) {
          throw new Error("Company details are unavailable.");
        }

        const companyData = {
          name: data.company_name,
          email: data.company_email,
          address: data.address,
          status: data.status,
          image: data.profile_img,
        };
        setCompanyDetails(companyData);
        setCompanyForm({
          name: data.company_name || "",
          address: data.address || "",
          email: data.company_email || "",
        });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setCompanyError(error.message || "Failed to load company details.");
        setCompanyDetails(null);
      } finally {
        if (!controller.signal.aborted) {
          setCompanyLoading(false);
        }
      }
    };

    fetchCompanyDetails();

    return () => controller.abort();
  }, [user?.companyId]);

  useEffect(() => {
    if (!user?.companyId) {
      setUsers([]);
      setFilteredUsers([]);
      setUsersError("No company is associated with your account.");
      setUsersLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCompanyUsers = async () => {
      setUsersLoading(true);
      setUsersError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/companies/${user.companyId}/users`,
          {
            credentials: "include",
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load users.");
        }

        const normalizedUsers = Array.isArray(data)
          ? data.map((item) => {
              const roleNames = Array.isArray(item.roles)
                ? item.roles
                    .map((role) =>
                      typeof role === "string"
                        ? role
                        : role?.name || ""
                    )
                    .filter(Boolean)
                : [];

              // Extract role IDs
              const roleIds = Array.isArray(item.roles)
                ? item.roles
                    .map((role) => {
                      if (typeof role === "string") {
                        // If it's already an ID string, return it
                        return role;
                      }
                      return role?._id || role?.id || null;
                    })
                    .filter(Boolean)
                : [];

              return {
                id: item._id || item.id,
                name: item.name || "",
                email: item.email || "",
                role: roleNames[0] || item.role || "User",
                roles: roleNames,
                roleIds: roleIds,
                status: item.status || "Active",
              };
            })
          : [];

        setUsers(normalizedUsers);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setUsers([]);
        setFilteredUsers([]);
        setUsersError(error.message || "Failed to load users.");
      } finally {
        if (!controller.signal.aborted) {
          setUsersLoading(false);
        }
      }
    };

    fetchCompanyUsers();

    return () => controller.abort();
  }, [user?.companyId]);

  // Fetch roles
  useEffect(() => {
    if (activeMenu !== "roles") return;

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
          ? data.map((item) => ({
              id: item._id || item.id,
              name: item.name || "",
              description: item.description || "",
              permissions: item.permissions || [],
              isActive: item.isActive !== false,
              isSystemRole: item.isSystemRole || false,
            }))
          : [];

        setRoles(normalizedRoles);
        if (normalizedRoles.length > 0 && !selectedRole) {
          setSelectedRole(normalizedRoles[0]);
        }
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setRoles([]);
        setRolesError(error.message || "Failed to load roles.");
      } finally {
        if (!controller.signal.aborted) {
          setRolesLoading(false);
        }
      }
    };

    fetchRoles();

    return () => controller.abort();
  }, [activeMenu]);

  // Fetch permissions
  useEffect(() => {
    if (activeMenu !== "roles") return;

    const controller = new AbortController();

    const fetchPermissions = async () => {
      setPermissionsLoading(true);
      setPermissionsError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/permissions`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load permissions.");
        }

        const normalizedPermissions = Array.isArray(data)
          ? data.map((item) => ({
              id: item._id || item.id,
              module: item.module || "",
              availableActions: item.availableActions || [],
              description: item.description || "",
              isActive: item.isActive !== false,
            }))
          : [];

        setPermissions(normalizedPermissions);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setPermissions([]);
        setPermissionsError(error.message || "Failed to load permissions.");
      } finally {
        if (!controller.signal.aborted) {
          setPermissionsLoading(false);
        }
      }
    };

    fetchPermissions();

    return () => controller.abort();
  }, [activeMenu]);

  // Filter roles based on search
  useEffect(() => {
    const value = rolesSearchValue.toLowerCase();
    setFilteredRoles(
      roles.filter(
        (role) =>
          role.name?.toLowerCase().includes(value) ||
          role.description?.toLowerCase().includes(value)
      )
    );
  }, [rolesSearchValue, roles]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSaveUser = async (updatedUser) => {
    if (updatedUser.action === "delete") {
      // TODO: Implement delete user API call if needed
      setUsers(users.filter((u) => u.id !== updatedUser.id));
      setShowEditModal(false);
      setSelectedUser(null);
      return;
    }

    // Update local state immediately for better UX
    setUsers(
      users.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setShowEditModal(false);
    setSelectedUser(null);

    // Refresh users from API to ensure data consistency
    if (user?.companyId) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/companies/${user.companyId}/users`,
          {
            credentials: "include",
          }
        );

        const data = await response.json().catch(() => null);

        if (response.ok && Array.isArray(data)) {
          const normalizedUsers = data.map((item) => {
            const roleNames = Array.isArray(item.roles)
              ? item.roles
                  .map((role) =>
                    typeof role === "string"
                      ? role
                      : role?.name || ""
                  )
                  .filter(Boolean)
              : [];

            const roleIds = Array.isArray(item.roles)
              ? item.roles
                  .map((role) => {
                    if (typeof role === "string") {
                      return role;
                    }
                    return role?._id || role?.id || null;
                  })
                  .filter(Boolean)
              : [];

            return {
              id: item._id || item.id,
              name: item.name || "",
              email: item.email || "",
              role: roleNames[0] || item.role || "User",
              roles: roleNames,
              roleIds: roleIds,
              status: item.status || "Active",
            };
          });

          setUsers(normalizedUsers);
        }
      } catch (error) {
        console.error("Failed to refresh users:", error);
        // Keep the local update even if refresh fails
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchRoleOptions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/roles`, {
          credentials: "include",
          signal: controller.signal,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load roles.");
        }

        const options = Array.isArray(data)
          ? data
              .filter((role) => role.isActive !== false)
              .map((role) => role.name)
              .filter(Boolean)
          : [];

        setRoleOptions(options);
        if (!inviteRole && options.length) {
          setInviteRole(options[0]);
        }
      } catch (error) {
        console.error("Failed to load invite roles:", error);
        setRoleOptions((prev) => (prev.length ? prev : []));
        setInviteRole((prev) => prev || "");
      }
    };

    fetchRoleOptions();

    return () => controller.abort();
  }, []);

  const handleSearchSubmit = () => {
    console.log("Search submitted:", searchValue);
  };

  const handleOpenInviteModal = () => {
    setInviteEmail("");
    setInviteRole(roleOptions[0] || "");
    setInviteError("");
    setInviteLoading(false);
    setShowInviteModal(true);
  };

  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole(roleOptions[0] || "");
    setInviteError("");
    setInviteLoading(false);
  };

  const handleInviteSubmit = async (event) => {
    event.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Please provide an email address.");
      return;
    }

    setInviteError("");
    setInviteLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to send invitation.");
      }

      alert(`Invitation sent to ${inviteEmail.trim()}`);
      handleCloseInviteModal();
    } catch (error) {
      setInviteError(error.message || "Failed to send invitation.");
      setInviteLoading(false);
    }
  };

  const handleCompanyInputChange = (field) => (event) => {
    const { value } = event.target;
    setCompanyForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCompanySave = async () => {
    if (!user?.companyId) {
      setCompanyUpdateError("No company is associated with your account.");
      return;
    }

    const trimmedName = companyForm.name.trim();
    const trimmedAddress = companyForm.address.trim();
    const trimmedEmail = companyForm.email.trim();

    if (!trimmedName) {
      setCompanyUpdateError("Company name is required.");
      return;
    }

    setCompanyUpdateError("");
    setCompanyUpdateLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/companies/${user.companyId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            company_name: trimmedName,
            address: trimmedAddress,
            company_email: trimmedEmail,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update company.");
      }

      setCompanyDetails((prev) =>
        prev
          ? {
              ...prev,
              name: data?.company_name ?? trimmedName,
              email: data?.company_email ?? trimmedEmail,
              address: data?.address ?? trimmedAddress,
              status: data?.status ?? prev.status,
              image: data?.profile_img ?? prev.image,
            }
          : {
              name: data?.company_name ?? trimmedName,
              email: data?.company_email ?? trimmedEmail,
              address: data?.address ?? trimmedAddress,
              status: data?.status ?? "Active",
              image: data?.profile_img ?? DEFAULT_COMPANY_IMAGE,
            }
      );

      alert("Company details updated successfully!");
    } catch (error) {
      setCompanyUpdateError(
        error?.message || "Failed to update company details."
      );
    } finally {
      setCompanyUpdateLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedData = filteredUsers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleChangePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  // Roles & Permissions handlers
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleOpenRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name || "",
        description: role.description || "",
        permissions: role.permissions || [],
      });
    } else {
      setEditingRole(null);
      setRoleForm({ name: "", description: "", permissions: [] });
    }
    setRoleFormError("");
    setRoleFormLoading(false);
    setShowRoleModal(true);
  };

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setEditingRole(null);
    setRoleForm({ name: "", description: "", permissions: [] });
    setRoleFormError("");
    setRoleFormLoading(false);
  };

  const handleOpenPermissionModal = (permission = null) => {
    if (permission) {
      setEditingPermission(permission);
      setPermissionForm({
        module: permission.module || "",
        availableActions: permission.availableActions || [],
        description: permission.description || "",
      });
    } else {
      setEditingPermission(null);
      setPermissionForm({ module: "", availableActions: [], description: "" });
    }
    setPermissionFormError("");
    setPermissionFormLoading(false);
    setShowPermissionModal(true);
  };

  const handleClosePermissionModal = () => {
    setShowPermissionModal(false);
    setEditingPermission(null);
    setPermissionForm({ module: "", availableActions: [], description: "" });
    setPermissionFormError("");
    setPermissionFormLoading(false);
  };

  const handlePermissionToggle = (permissionId, action) => {
    if (!selectedRole) return;

    const rolePermissions = [...(selectedRole.permissions || [])];
    const permIndex = rolePermissions.findIndex((p) => {
      const pid = typeof p.permissionId === "object" 
        ? (p.permissionId.id || p.permissionId._id) 
        : p.permissionId;
      return pid === permissionId;
    });

    if (permIndex >= 0) {
      const perm = rolePermissions[permIndex];
      const allowedActions = [...(perm.allowedActions || [])];
      const actionIndex = allowedActions.indexOf(action);

      if (actionIndex >= 0) {
        allowedActions.splice(actionIndex, 1);
        if (allowedActions.length === 0) {
          rolePermissions.splice(permIndex, 1);
        } else {
          rolePermissions[permIndex] = {
            ...perm,
            allowedActions,
          };
        }
      } else {
        rolePermissions[permIndex] = {
          ...perm,
          allowedActions: [...allowedActions, action],
        };
      }
    } else {
      rolePermissions.push({
        permissionId,
        allowedActions: [action],
      });
    }

    setSelectedRole({
      ...selectedRole,
      permissions: rolePermissions,
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;

    setRoleFormLoading(true);
    setRoleFormError("");

    try {
      const permissionsData = selectedRole.permissions.map((perm) => ({
        permissionId:
          typeof perm.permissionId === "object"
            ? perm.permissionId.id || perm.permissionId._id
            : perm.permissionId,
        allowedActions: perm.allowedActions || [],
      }));

      const response = await fetch(`${API_BASE_URL}/roles/${selectedRole.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          permissions: permissionsData,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update role permissions.");
      }

      // Refresh roles
      const rolesResponse = await fetch(`${API_BASE_URL}/roles`, {
        credentials: "include",
      });
      const rolesData = await rolesResponse.json();
      if (rolesResponse.ok && Array.isArray(rolesData)) {
        const normalizedRoles = rolesData.map((item) => ({
          id: item._id || item.id,
          name: item.name || "",
          description: item.description || "",
          permissions: item.permissions || [],
          isActive: item.isActive !== false,
          isSystemRole: item.isSystemRole || false,
        }));
        setRoles(normalizedRoles);
        const updatedRole = normalizedRoles.find((r) => r.id === selectedRole.id);
        if (updatedRole) {
          setSelectedRole(updatedRole);
        }
      }
    } catch (error) {
      setRoleFormError(error.message || "Failed to update role permissions.");
    } finally {
      setRoleFormLoading(false);
    }
  };

  const handleRoleFormSubmit = async (event) => {
    event.preventDefault();
    if (!roleForm.name.trim()) {
      setRoleFormError("Role name is required.");
      return;
    }

    setRoleFormError("");
    setRoleFormLoading(true);

    try {
      const permissionsData = roleForm.permissions.map((perm) => ({
        permissionId:
          typeof perm.permissionId === "object"
            ? perm.permissionId.id || perm.permissionId._id
            : perm.permissionId,
        allowedActions: perm.allowedActions || [],
      }));

      const url = editingRole
        ? `${API_BASE_URL}/roles/${editingRole.id}`
        : `${API_BASE_URL}/roles`;
      const method = editingRole ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: roleForm.name.trim(),
          description: roleForm.description.trim(),
          permissions: permissionsData,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Failed to ${editingRole ? "update" : "create"} role.`);
      }

      // Refresh roles
      const rolesResponse = await fetch(`${API_BASE_URL}/roles`, {
        credentials: "include",
      });
      const rolesData = await rolesResponse.json();
      if (rolesResponse.ok && Array.isArray(rolesData)) {
        const normalizedRoles = rolesData.map((item) => ({
          id: item._id || item.id,
          name: item.name || "",
          description: item.description || "",
          permissions: item.permissions || [],
          isActive: item.isActive !== false,
          isSystemRole: item.isSystemRole || false,
        }));
        setRoles(normalizedRoles);
        if (editingRole) {
          const updatedRole = normalizedRoles.find((r) => r.id === editingRole.id);
          if (updatedRole) {
            setSelectedRole(updatedRole);
          }
        } else if (normalizedRoles.length > 0) {
          setSelectedRole(normalizedRoles[normalizedRoles.length - 1]);
        }
      }

      handleCloseRoleModal();
    } catch (error) {
      setRoleFormError(error.message || `Failed to ${editingRole ? "update" : "create"} role.`);
    } finally {
      setRoleFormLoading(false);
    }
  };

  const handlePermissionFormSubmit = async (event) => {
    event.preventDefault();
    if (!permissionForm.module.trim()) {
      setPermissionFormError("Module name is required.");
      return;
    }
    if (!permissionForm.availableActions.length) {
      setPermissionFormError("At least one action is required.");
      return;
    }

    setPermissionFormError("");
    setPermissionFormLoading(true);

    try {
      const url = editingPermission
        ? `${API_BASE_URL}/permissions/${editingPermission.id}`
        : `${API_BASE_URL}/permissions`;
      const method = editingPermission ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          module: permissionForm.module.trim(),
          availableActions: permissionForm.availableActions,
          description: permissionForm.description.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || `Failed to ${editingPermission ? "update" : "create"} permission.`
        );
      }

      // Refresh permissions
      const permissionsResponse = await fetch(`${API_BASE_URL}/permissions`, {
        credentials: "include",
      });
      const permissionsData = await permissionsResponse.json();
      if (permissionsResponse.ok && Array.isArray(permissionsData)) {
        const normalizedPermissions = permissionsData.map((item) => ({
          id: item._id || item.id,
          module: item.module || "",
          availableActions: item.availableActions || [],
          description: item.description || "",
          isActive: item.isActive !== false,
        }));
        setPermissions(normalizedPermissions);
      }

      handleClosePermissionModal();
    } catch (error) {
      setPermissionFormError(
        error.message || `Failed to ${editingPermission ? "update" : "create"} permission.`
      );
    } finally {
      setPermissionFormLoading(false);
    }
  };

  const handleToggleAction = (action) => {
    const actions = [...permissionForm.availableActions];
    const index = actions.indexOf(action);
    if (index >= 0) {
      actions.splice(index, 1);
    } else {
      actions.push(action);
    }
    setPermissionForm({ ...permissionForm, availableActions: actions });
  };

  const availableActionsList = ["read", "write", "update", "delete"];

  const renderContent = () => {
    switch (activeMenu) {
      case "users":
        return (
          <>
            <div className={styles.searchBar}>
              <div className={styles.searchInputGroup}>
                <input
                  type="search"
                  placeholder="Search users..."
                  className={styles.searchInput}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                <button
                  className={styles.searchButton}
                  onClick={handleSearchSubmit}
                >
                  <FaSearch />
                </button>
              </div>
              <button
                className={styles.addUserButton}
                onClick={handleOpenInviteModal}
              >
                <FaPlus />
                Add User
              </button>
            </div>
            <table className={styles.usersTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan="4">Loading users...</td>
                  </tr>
                ) : usersError ? (
                  <tr>
                    <td colSpan="4">{usersError}</td>
                  </tr>
                ) : pagedData.length ? (
                  pagedData.map((user) => {
                    const roleLabel = user.role || "User";
                    const roleClassName = styles[roleLabel.toLowerCase()] || "";

                    return (
                      <tr key={user.id || user._id}>
                        <td>{user.name || "-"}</td>
                        <td>{user.email || "-"}</td>
                        <td>
                          <span
                            className={`${styles.roleBadge} ${roleClassName}`}
                          >
                            {roleLabel}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.editButton}
                            onClick={() => handleEditUser(user)}
                          >
                            <FaEdit />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4">No users found for this company.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className={styles.pagination}>
              <button
                onClick={() => handleChangePage(page - 1)}
                disabled={page === 1}
              >
                ← Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={p === page ? styles.active : ""}
                  onClick={() => handleChangePage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => handleChangePage(page + 1)}
                disabled={page === totalPages}
              >
                Next →
              </button>
            </div>
          </>
        );
      case "roles":
        const hasChanges = selectedRole && !selectedRole.isSystemRole && JSON.stringify(selectedRole.permissions) !== JSON.stringify(roles.find(r => r.id === selectedRole.id)?.permissions || []);
        
        return (
          <div className={styles.rolesContainer}>
            <div className={styles.rolesSidebar}>
              <div className={styles.rolesSearchBar}>
                <input
                  type="search"
                  placeholder="Search roles..."
                  className={styles.searchInput}
                  value={rolesSearchValue}
                  onChange={(e) => setRolesSearchValue(e.target.value)}
                />
                <button className={styles.searchButton}>
                  <FaSearch />
                </button>
              </div>
              {rolesLoading ? (
                <div className={styles.placeholderContent}>Loading roles...</div>
              ) : rolesError ? (
                <div className={styles.placeholderContent}>{rolesError}</div>
              ) : filteredRoles.length === 0 ? (
                <div className={styles.placeholderContent}>No roles found</div>
              ) : (
                <div className={styles.rolesList}>
                  {filteredRoles.map((role) => (
                    <div
                      key={role.id}
                      className={`${styles.roleItem} ${
                        selectedRole?.id === role.id ? styles.active : ""
                      }`}
                      onClick={() => handleRoleSelect(role)}
                    >
                      <div className={styles.roleItemName}>{role.name}</div>
                      {/* {role.description && (
                        <div className={styles.roleItemDescription}>{role.description}</div>
                      )} */}
                    </div>
                  ))}
                </div>
              )}
              <button
                className={styles.addRoleButton}
                onClick={() => handleOpenRoleModal()}
              >
                <FaPlus />
                Add Role
              </button>
            </div>
            <div className={styles.rolesContent}>
              {!selectedRole ? (
                <div className={styles.placeholderContent}>
                  Select a role to view and edit permissions
                </div>
              ) : permissionsLoading ? (
                <div className={styles.placeholderContent}>Loading permissions...</div>
              ) : permissionsError ? (
                <div className={styles.placeholderContent}>{permissionsError}</div>
              ) : (
                <>
                  <div className={styles.permissionsHeader}>
                    <div>
                      <h3 className={styles.roleTitle}>{selectedRole.name}</h3>
                      {selectedRole.description && (
                        <p className={styles.roleDescription}>{selectedRole.description}</p>
                      )}
                    </div>
                    <div className={styles.permissionsActions}>
                      <button
                        className={styles.addPermissionButton}
                        onClick={() => handleOpenPermissionModal()}
                      >
                        <FaPlus />
                        Add Permission
                      </button>
                      {hasChanges && (
                        <button
                          className={styles.saveButton}
                          onClick={handleSaveRolePermissions}
                          disabled={roleFormLoading}
                        >
                          {roleFormLoading ? "Saving..." : "Save Changes"}
                        </button>
                      )}
                    </div>
                  </div>
                  {roleFormError && (
                    <div className={styles.modalError}>{roleFormError}</div>
                  )}
                  {selectedRole.isSystemRole && (
                    <div className={styles.systemRoleNotice}>
                      System roles automatically have full access to every permission.
                    </div>
                  )}
                  <div className={styles.permissionsTableWrapper}>
                    <table className={styles.permissionsTable}>
                      <thead>
                        <tr>
                          <th className={styles.moduleColumn}>Module</th>
                          <th style={{textAlign: 'center'}} >Read</th>
                          <th style={{textAlign: 'center'}} >Write</th>
                          <th style={{textAlign: 'center'}} >Update</th>
                          <th style={{textAlign: 'center'}} >Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {permissions.length === 0 ? (
                          <tr>
                            <td colSpan="7" className={styles.noData}>
                              No permissions found. Click "Add Permission" to create one.
                            </td>
                          </tr>
                        ) : (
                          permissions
                            .filter((p) => p.isActive)
                            .map((permission) => {
                              const rolePermission = selectedRole.permissions.find((p) => {
                                const pid = typeof p.permissionId === "object" 
                                  ? (p.permissionId.id || p.permissionId._id) 
                                  : p.permissionId;
                                return pid === permission.id;
                              });
                              const isSystemRole = Boolean(selectedRole?.isSystemRole);
                              const allowedActions = isSystemRole
                                ? permission.availableActions
                                : rolePermission?.allowedActions || [];

                            return (
                              <tr key={permission.id}>
                                <td className={styles.moduleColumn}>
                                  <div className={styles.moduleName}>{permission.module}</div>
                                  {permission.description && (
                                    <div className={styles.moduleDescription}>
                                      {permission.description}
                                    </div>
                                  )}
                                </td>
                                {availableActionsList.map((action) => {
                                  const isAllowed = allowedActions.includes(action);
                                  const isAvailable = permission.availableActions.includes(action);
                                  
                                  const isCheckboxDisabled = !isAvailable || isSystemRole;
                                  return (
                                    <td key={action} className={styles.checkboxCell}>
                                      {isAvailable ? (
                                        <input
                                          type="checkbox"
                                          checked={isAllowed}
                                          disabled={isCheckboxDisabled}
                                          onChange={() =>
                                            handlePermissionToggle(permission.id, action)
                                          }
                                          className={styles.permissionCheckbox}
                                        />
                                      ) : (
                                        <span className={styles.unavailable}>-</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case "company":
        return (
          <>
            {!user?.companyId ? (
              <div className={styles.placeholderContent}>
                No company is associated with your account.
              </div>
            ) : companyLoading ? (
              <div className={styles.placeholderContent}>
                Loading company details...
              </div>
            ) : companyError ? (
              <div className={styles.placeholderContent}>{companyError}</div>
            ) : !companyDetails ? (
              <div className={styles.placeholderContent}>
                Company details are unavailable.
              </div>
            ) : (
              <WhiteIsland className={styles.bigIsland}>
                <h3>Company Info</h3>
                <div className={styles.main}>
                  <div className={styles.picture}>
                    <img
                      src={companyDetails.image || DEFAULT_COMPANY_IMAGE}
                      width={128}
                      height={128}
                      alt="Company"
                    />
                    <label className={styles.uploadButton}>
                      <FaImage /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setCompanyDetails((prev) => ({
                                ...prev,
                                image: reader.result,
                              }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className={styles.detailContainer}>
                    <div className={styles.details}>
                      <div className={styles.info} style={{ width: "100%" }}>
                        <div className={styles.infoDetail}>Company Name</div>
                        <input
                          name="name"
                          value={companyForm.name}
                          onChange={handleCompanyInputChange("name")}
                          disabled={companyUpdateLoading}
                        />
                      </div>
                    </div>
                    <div className={styles.details2}>
                      <div className={styles.info2} style={{ width: "100%" }}>
                        <div className={styles.infoDetail}>Email</div>
                        <input
                          name="email"
                          type="email"
                          value={companyForm.email}
                          onChange={handleCompanyInputChange("email")}
                          disabled={companyUpdateLoading}
                        />
                      </div>
                    </div>
                    <div className={styles.details2}>
                      <div className={styles.info2} style={{ width: "100%" }}>
                        <div className={styles.infoDetail}>Address</div>
                        <input
                          name="address"
                          value={companyForm.address}
                          onChange={handleCompanyInputChange("address")}
                          disabled={companyUpdateLoading}
                        />
                      </div>
                    </div>
                    <div className={styles.details}>
                      <div className={styles.info} style={{ width: "100%" }}>
                        <div className={styles.infoDetail}>Status</div>
                        <select
                          className={styles.dropdown}
                          name="status"
                          value={companyDetails.status || "Active"}
                          disabled={true}
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    {companyUpdateError && (
                      <div className={styles.errorText} style={{ marginTop: "10px", padding: "8px" }}>
                        {companyUpdateError}
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.saves}>
                  <button
                    className={styles.companySaveButton}
                    onClick={handleCompanySave}
                    disabled={companyUpdateLoading || !companyForm.name.trim()}
                  >
                    <FaSave />
                    {companyUpdateLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </WhiteIsland>
            )}
          </>
        );
      case "notifications":
        return <div className={styles.placeholderContent}>Notification settings coming soon...</div>;
      case "system":
        return <div className={styles.placeholderContent}>System Configuration coming soon...</div>;
      default:
        return null;
    }
  };

  return (
    <>
      <h2 className={styles.title}>Settings</h2>
      <WhiteIsland className="WhiteIsland">
        <div className={styles.settingsContainer}>
          <div className={styles.sidebar}>
            {menuOptions.map((option) => (
              <div
                key={option.id}
                className={`${styles.menuItem} ${
                  activeMenu === option.id ? styles.active : ""
                }`}
                onClick={() => {
                  setActiveMenu(option.id);
                  setPage(1);
                }}
              >
                {option.icon}
                <span>{option.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.content}>{renderContent()}</div>
        </div>
      </WhiteIsland>
      {showInviteModal && (
        <Modal onClose={handleCloseInviteModal}>
          <div className={styles.inviteModalContent}>
            <h3>Invite New User</h3>
            <p className={styles.inviteModalDescription}>
              Enter an email address to send an invitation.
            </p>
            <form className={styles.inviteForm} onSubmit={handleInviteSubmit}>
              <label
                className={styles.modalLabel}
                htmlFor="inviteEmail"
              >
                Email
              </label>
              <input
                id="inviteEmail"
                type="email"
                className={styles.modalInput}
                placeholder="name@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <label className={styles.modalLabel} htmlFor="inviteRole">
                Role
              </label>
              <select
                id="inviteRole"
                className={styles.modalSelect}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                required
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
              {inviteError && (
                <p className={styles.modalError}>{inviteError}</p>
              )}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalSecondaryButton}
                  onClick={handleCloseInviteModal}
                  disabled={inviteLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalPrimaryButton}
                  disabled={!inviteEmail.trim() || inviteLoading}
                >
                  {inviteLoading ? "Sending..." : "Invite"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      {showEditModal && (
        <UserEditModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}
      {showRoleModal && (
        <Modal onClose={handleCloseRoleModal}>
          <div className={styles.inviteModalContent}>
            <h3>{editingRole ? "Edit Role" : "Add Role"}</h3>
            <form className={styles.inviteForm} onSubmit={handleRoleFormSubmit}>
              <label className={styles.modalLabel} htmlFor="roleName">
                Role Name
              </label>
              <input
                id="roleName"
                type="text"
                className={styles.modalInput}
                value={roleForm.name}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, name: e.target.value })
                }
                placeholder="e.g., Admin, Manager"
                disabled={roleFormLoading || (editingRole?.isSystemRole && editingRole)}
                required
              />
              <label className={styles.modalLabel} htmlFor="roleDescription">
                Description
              </label>
              <textarea
                id="roleDescription"
                className={`${styles.modalInput} ${styles.modalTextarea}`}
                value={roleForm.description}
                onChange={(e) =>
                  setRoleForm({ ...roleForm, description: e.target.value })
                }
                placeholder="Describe this role..."
                rows={3}
                disabled={roleFormLoading}
              />
              {roleFormError && (
                <p className={styles.modalError}>{roleFormError}</p>
              )}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalSecondaryButton}
                  onClick={handleCloseRoleModal}
                  disabled={roleFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalPrimaryButton}
                  disabled={roleFormLoading || !roleForm.name.trim()}
                >
                  {roleFormLoading
                    ? editingRole
                      ? "Updating..."
                      : "Creating..."
                    : editingRole
                    ? "Update Role"
                    : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      {showPermissionModal && (
        <Modal onClose={handleClosePermissionModal}>
          <div className={styles.inviteModalContent}>
            <h3>
              {editingPermission ? "Edit Permission" : "Add Permission"}
            </h3>
            <form
              className={styles.inviteForm}
              onSubmit={handlePermissionFormSubmit}
            >
              <label className={styles.modalLabel} htmlFor="permissionModule">
                Module
              </label>
              <select
                id="permissionModule"
                className={styles.modalSelect}
                value={permissionForm.module}
                onChange={(e) =>
                  setPermissionForm({ ...permissionForm, module: e.target.value })
                }
                disabled={permissionFormLoading || !!editingPermission}
                required
              >
                <option value="">Select a module</option>
                {[
                  "Dashboard",
                  "Material Research",
                  "Constituent Research",
                  "Library",
                  "Warehouse",
                  "Projects",
                  "Samples",
                  "Receiving",
                  "Shipping",
                  "Test Codes",
                  "Business Partners",
                  "Users",
                  "Roles",
                  "Permissions",
                  "Settings",
                ]
                  .filter(
                    (module) =>
                      !editingPermission || module === permissionForm.module
                  )
                  .map((module) => (
                    <option key={module} value={module}>
                      {module}
                    </option>
                  ))}
              </select>
              <label className={styles.modalLabel}>Available Actions</label>
              <div className={styles.actionsCheckboxGroup}>
                {availableActionsList.map((action) => (
                  <label key={action} className={styles.actionCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={permissionForm.availableActions.includes(action)}
                      onChange={() => handleToggleAction(action)}
                      disabled={permissionFormLoading}
                      className={styles.actionCheckbox}
                    />
                    <span className={styles.actionLabel}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
              <label className={styles.modalLabel} htmlFor="permissionDescription">
                Description
              </label>
              <textarea
                id="permissionDescription"
                className={`${styles.modalInput} ${styles.modalTextarea}`}
                value={permissionForm.description}
                onChange={(e) =>
                  setPermissionForm({
                    ...permissionForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe this permission..."
                rows={3}
                disabled={permissionFormLoading}
              />
              {permissionFormError && (
                <p className={styles.modalError}>{permissionFormError}</p>
              )}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalSecondaryButton}
                  onClick={handleClosePermissionModal}
                  disabled={permissionFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalPrimaryButton}
                  disabled={
                    permissionFormLoading ||
                    !permissionForm.module.trim() ||
                    !permissionForm.availableActions.length
                  }
                >
                  {permissionFormLoading
                    ? editingPermission
                      ? "Updating..."
                      : "Creating..."
                    : editingPermission
                    ? "Update Permission"
                    : "Create Permission"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}

