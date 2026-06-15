import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import {
  FaHome,
  FaProjectDiagram,
  FaFlask,
  FaFileSignature,
  FaList,
} from "react-icons/fa";
import { useCustomerAuth } from "../../context/CustomerAuthContext";
import PortalSidebar from "./PortalSidebar";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

// Customer Portal app shell. Reuses `PortalSidebar` so the chrome
// (logo, collapse toggle, hover/active states, profile block) is
// identical to the internal Sidebar.
//
// Menu hierarchy follows the user's preference: "Projects" is the
// parent, with Samples + Documents living under it. Dashboard stays
// at the top as a single entry. Red-dot badges propagate from the
// dashboard-summary endpoint to both the parent ("Projects") and the
// relevant child rows.

export default function CustomerLayout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useCustomerAuth();
  const [counts, setCounts] = useState({ samplesNeedSig: 0, docsNeedApproval: 0 });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/portal/login", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const refreshCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portal/customer/dashboard/summary`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCounts({
          samplesNeedSig: data.samplesNeedSig || 0,
          docsNeedApproval: data.docsNeedApproval || 0,
        });
      }
    } catch { /* swallow */ }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refreshCounts();
  }, [isAuthenticated, refreshCounts]);

  if (isLoading || !isAuthenticated) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/portal/login", { replace: true });
  };

  const actionableBadge = counts.samplesNeedSig + counts.docsNeedApproval;

  const menuItems = [
    {
      label: "Dashboard",
      icon: <FaHome />,
      path: "/portal/dashboard",
    },
    {
      label: "Projects",
      icon: <FaProjectDiagram />,
      // Parent surfaces a badge when ANY child needs the customer.
      badge: actionableBadge,
      submenu: [
        { name: "All Projects", menuIcon: <FaList />, path: "/portal/projects" },
        { name: "Samples", menuIcon: <FaFlask />, path: "/portal/samples", badge: counts.samplesNeedSig },
        { name: "Documents", menuIcon: <FaFileSignature />, path: "/portal/documents", badge: counts.docsNeedApproval },
      ],
    },
  ];

  // Match the internal App.jsx layout: the sidebar is position:fixed
  // so it doesn't sit in the flex flow; the main content uses the
  // shared `.mainContentArea` class which already knows how to react
  // to the sidebar's collapsed state via the adjacent-sibling
  // selector in Sidebar.css.
  return (
    <>
      <PortalSidebar
        menuItems={menuItems}
        user={{
          name: user?.name,
          email: user?.email,
          profilePicture: user?.profilePicture,
        }}
        onSignOut={handleLogout}
      />
      <main
        className="mainContentArea"
        style={{ padding: "32px 36px 60px", height: "auto", minHeight: "100vh" }}
      >
        <Outlet context={{ refreshCounts }} />
      </main>
    </>
  );
}
