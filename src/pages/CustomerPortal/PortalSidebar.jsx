import React, { useCallback, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaChevronDown, FaSignOutAlt, FaQuestionCircle, FaRedo } from "react-icons/fa";
import { GoSidebarExpand } from "react-icons/go";
// Reuses the exact same stylesheet the internal Sidebar uses so the
// look (white panel, blue active tint, 260px/80px collapsed widths,
// chevron animation, hover states) stays in lock-step with the main
// app. We deliberately don't fork the CSS — the portal sidebar is
// supposed to feel like the same product.
import "../../components/Sidebar.css";

// Generic sidebar used by both Customer Portal and Vendor Portal.
//
// `menuItems` mirrors the internal app's shape:
//   { label, icon, path?, submenu?: [{ name, menuIcon, path, badge? }], badge? }
//
// The Customer / Vendor Layout passes its own menu definition + a
// custom brand block (logo + tagline) + a small `user` payload for
// the bottom profile card. All sign-out / refresh / help wiring is
// shared.
export default function PortalSidebar({
  menuItems = [],
  user,
  onSignOut,
  helpHref,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);

  const isPathActive = useCallback(
    (target) => {
      if (!target) return false;
      const norm = (p) => p.replace(/\/+$/, "");
      const t = norm(target);
      const c = norm(location.pathname);
      return c === t || c.startsWith(`${t}/`);
    },
    [location.pathname]
  );

  const isItemActive = useCallback(
    (item) => {
      if (item.path && isPathActive(item.path)) return true;
      if (item.submenu) return item.submenu.some((sub) => isPathActive(sub.path));
      return false;
    },
    [isPathActive]
  );

  // Auto-open the dropdown whose child is currently active so the
  // active row is always visible without the user having to click
  // the parent first.
  const initiallyOpen = useMemo(() => {
    const active = menuItems.find((it) => it.submenu && it.submenu.some((s) => isPathActive(s.path)));
    return active?.label || null;
  }, [menuItems, isPathActive]);

  React.useEffect(() => {
    if (initiallyOpen) setOpenDropdown(initiallyOpen);
  }, [initiallyOpen]);

  return (
    <div className={`sidebarContainer ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebarTop">
        <div className="logoContainer">
          {!collapsed && (
            <h2 className="logoImg">
              <img src="/BigLogo.png" height={69} width={150} alt="Logo" />
            </h2>
          )}
          <button className="toggleButton" onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar">
            {collapsed ? <img src="/SmallLogo.png" className="toggleIcon" alt="Expand" /> : <GoSidebarExpand />}
          </button>
        </div>

        <ul className="menuList">
          {menuItems.map((item) => (
            <div key={item.label}>
              <li
                title={collapsed ? item.label : ""}
                className={`menuItem ${isItemActive(item) ? "active" : ""}`}
                onClick={() => {
                  if (collapsed) setCollapsed(false);
                  if (item.path) {
                    navigate(item.path);
                    setOpenDropdown(null);
                  } else if (item.submenu) {
                    setOpenDropdown(openDropdown === item.label ? null : item.label);
                  }
                }}
                style={{ position: "relative" }}
              >
                {item.icon}
                {!collapsed && (
                  <span className="menuLabel" style={{ display: "inline-flex", alignItems: "center", flex: 1 }}>
                    {item.label}
                    {item.submenu && (
                      <FaChevronDown
                        className="dropdownIcon"
                        style={{
                          marginLeft: 8,
                          transform: openDropdown === item.label ? "rotate(0deg)" : "rotate(-90deg)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    )}
                  </span>
                )}
                {item.badge > 0 && (
                  <span
                    title={`${item.badge} item${item.badge > 1 ? "s" : ""} need your attention`}
                    style={{
                      position: "absolute",
                      right: collapsed ? 8 : 14,
                      top: collapsed ? 8 : "50%",
                      transform: collapsed ? "none" : "translateY(-50%)",
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "#ef4444",
                      boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.18)",
                    }}
                  />
                )}
              </li>

              {!collapsed && item.submenu && openDropdown === item.label && (
                <ul className="submenu">
                  {item.submenu.map((subItem) => (
                    <li
                      key={subItem.name}
                      className={`submenuItem ${isPathActive(subItem.path) ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (subItem.path) navigate(subItem.path);
                      }}
                      style={{ position: "relative" }}
                    >
                      <div className="submenuIcon">
                        {subItem.menuIcon}
                        {subItem.name}
                      </div>
                      {subItem.badge > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#ef4444",
                            boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.18)",
                          }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </ul>
      </div>

      <div className="sidebarBottom">
        <div
          className="sidebarOption"
          title={collapsed ? "Refresh" : ""}
          style={{ cursor: "pointer" }}
          onClick={() => window.location.reload()}
        >
          <FaRedo /> {!collapsed && <span>Refresh</span>}
        </div>
        <div className="sidebarOption" title={collapsed ? "Help Center" : ""}>
          <FaQuestionCircle /> {!collapsed && <span>Help Center</span>}
        </div>
        <div
          className="sidebarOption"
          title={collapsed ? "Sign out" : ""}
          style={{ cursor: "pointer" }}
          onClick={onSignOut}
        >
          <FaSignOutAlt /> {!collapsed && <span>Sign out</span>}
        </div>

        <div className="profile">
          <img src={user?.profilePicture || "https://i.pravatar.cc/40"} alt="profile" />
          {!collapsed && (
            <div>
              <p className="profileName">{user?.name || "User"}</p>
              <p className="profileEmail">
                {(() => {
                  const email = user?.email || "";
                  return email.length > 18 ? email.substring(0, 18) + "…" : email;
                })()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
