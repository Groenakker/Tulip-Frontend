import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { FaHome, FaClipboardList } from "react-icons/fa";
import { useVendorAuth } from "../../context/VendorAuthContext";
import PortalSidebar from "../CustomerPortal/PortalSidebar";

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export default function VendorLayout() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useVendorAuth();
  const [counts, setCounts] = useState({ openOrders: 0 });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/vendor/login", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portal/vendor/dashboard/summary`, { credentials: "include" });
      if (res.ok) setCounts(await res.json());
    } catch { /* swallow */ }
  }, []);

  useEffect(() => { if (isAuthenticated) refresh(); }, [isAuthenticated, refresh]);

  if (isLoading || !isAuthenticated) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/vendor/login", { replace: true });
  };

  const menuItems = [
    { label: "Dashboard", icon: <FaHome />, path: "/vendor/dashboard" },
    { label: "Orders", icon: <FaClipboardList />, path: "/vendor/orders", badge: counts.openOrders },
  ];

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
        <Outlet />
      </main>
    </>
  );
}
