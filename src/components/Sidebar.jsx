import React, { useCallback, useMemo, useState } from 'react';
import './Sidebar.css';
import { FaWallet, FaRedo, FaHome, FaCog, FaQuestionCircle, FaChevronDown, FaShippingFast, FaWarehouse } from 'react-icons/fa';
import { HiArrowLeftEndOnRectangle } from "react-icons/hi2";
import { GiRolledCloth, GiTestTubes } from "react-icons/gi";
import { RiHexagonFill } from "react-icons/ri";
import { IoLibrary, IoBusiness } from "react-icons/io5";
import { FaDiagramProject, FaFileWaveform } from "react-icons/fa6";
import { SiAftership } from "react-icons/si";
import { PiEyedropperSampleFill } from "react-icons/pi";
import { BiSolidReport } from "react-icons/bi";
import { TbReportAnalytics } from "react-icons/tb";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfilePopup from './ProfilePopup';



const menuItems = [
  { label: 'Dashboard', icon: <FaHome />, path: '/Dashboard', permission: { module: 'Dashboard', actions: 'read' } },
  { label: 'Material Research', icon: <GiRolledCloth />, path: '/MaterialResearch', permission: { module: 'Material Research', actions: 'read' } },
  { label: 'Constituent Research', icon: <RiHexagonFill />, path: '/ConstituentResearch', permission: { module: 'Constituent Research', actions: 'read' } },
  { label: 'Library', icon: <IoLibrary />, path: '/Library', permission: { module: 'Library', actions: 'read' } },
  { label: 'Warehouse', icon: <FaWarehouse />, path: '/Warehouse', permission: { module: 'Warehouse', actions: 'read' } },
  {
    label: 'Contract Management',
    icon: <FaWallet />,
    submenu: [
      { name: 'Buisness Partner', menuIcon: <IoBusiness />, path: '/BuisnessPartner', permission: { module: 'Business Partners', actions: 'read' } },
      { name: 'Projects', menuIcon: <FaDiagramProject />, path: '/Projects', permission: { module: 'Projects', actions: 'read' } },
      { name: 'Shipping Log', menuIcon: <FaShippingFast />, path: '/ShippingLog', permission: { module: 'Shipping', actions: 'read' } },
      { name: 'Recieve Log', menuIcon: <SiAftership />, path: '/RecieveLog', permission: { module: 'Receiving', actions: 'read' } },
      { name: 'Create Sample', menuIcon: <PiEyedropperSampleFill />, path: '/CreateSample', permission: { module: 'Create Sample', actions: 'read' } },
      { name: 'Sample Submission', menuIcon: <FaFileWaveform />, path: '/SampleSubmission', permission: { module: 'Sample Submission', actions: 'read' } },
      { name: 'Lab Studies', menuIcon: <GiTestTubes />, path: '/LabStudies', permission: { module: 'Lab Studies', actions: 'read' } },
      { name: 'Reports', menuIcon: <BiSolidReport />, path: '/Reports', permission: { module: 'Reports', actions: 'read' } },
      { name: 'Test Codes', menuIcon: <TbReportAnalytics />, path: '/TestCodes', permission: { module: 'Test Codes', actions: 'read' } },
      { name: 'Instance', menuIcon: <GiTestTubes />, path: '/Instance', permission: { module: 'Instances', actions: 'read' } },
    ],
  },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const { user, hasPermission, permissionsLoading } = useAuth();
  const isPathActive = useCallback(
    (targetPath) => {
      if (!targetPath) return false;

      const normalizePath = (path) => path.replace(/\/+$/, '');
      const normalizedTarget = normalizePath(targetPath);
      const normalizedCurrent = normalizePath(location.pathname);

      return (
        normalizedCurrent === normalizedTarget ||
        normalizedCurrent.startsWith(`${normalizedTarget}/`)
      );
    },
    [location.pathname]
  );

  const isItemActive = useCallback(
    (item) => {
      if (item.path && isPathActive(item.path)) {
        return true;
      }

      if (item.submenu) {
        return item.submenu.some((subItem) => isPathActive(subItem.path));
      }

      return false;
    },
    [isPathActive]
  );

  const filteredMenuItems = useMemo(() => {
    if (permissionsLoading) {
      return [];
    }

    const canShow = (permission) => {
      if (!permission) return true;
      return hasPermission(permission.module, permission.actions || 'read');
    };

    return menuItems
      .map((item) => {
        if (item.submenu) {
          const visibleSubmenu = item.submenu.filter((subItem) =>
            canShow(subItem.permission)
          );

          if (visibleSubmenu.length === 0) {
            return null;
          }

          return { ...item, submenu: visibleSubmenu };
        }

        if (!canShow(item.permission)) {
          return null;
        }

        return item;
      })
      .filter(Boolean);
  }, [permissionsLoading, hasPermission]);

  const canAccessSettings = hasPermission('Settings', 'read');

  return (
    <div className={`sidebarContainer ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebarTop">

        {/* LOGO PART  */}
        <div className="logoContainer">
          {!collapsed && <h2 className="logoImg"><img src="/BigLogo.png" height={69} width={150} /></h2>}
          <button className="toggleButton" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <img src='/SmallLogo.png' className='toggleIcon' /> : <HiArrowLeftEndOnRectangle />}
          </button>
        </div>
        {/* MENU PART   */}
        <ul className="menuList">
          {permissionsLoading ? (
            <li className="menuItem" style={{ cursor: 'default' }}>
              Loading menu...
            </li>
          ) : (
            filteredMenuItems.map((item) => (
              <div key={item.label}>
                <li
                  title={collapsed ? item.label : ''}
                  className={`menuItem ${
                    isItemActive(item) ? 'active' : ''
                  }`}
                  onClick={() => {
                    if (collapsed) setCollapsed(false);
                    if (item.path) {
                      navigate(item.path);
                      setOpenDropdown(null);
                    } else if (item.submenu) {
                      setOpenDropdown(
                        openDropdown === item.label ? null : item.label
                      );
                    }
                  }}
                >
                  {item.icon}{' '}
                  {!collapsed && (
                    <span className="menuLabel">
                      {item.label}
                      {item.submenu && (
                        <FaChevronDown
                          className="dropdownIcon"
                          style={{
                            marginLeft: '8px',
                            transform:
                              openDropdown === item.label
                                ? 'rotate(0deg)'
                                : 'rotate(-90deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      )}
                    </span>
                  )}
                </li>

                {/* onlywhen not collapse show item menu  */}
                {!collapsed && item.submenu && openDropdown === item.label && (
                  <ul className="submenu">
                    {item.submenu.map((subItem) => (
                      <li
                        key={subItem.name}
                        className={`submenuItem ${
                          isPathActive(subItem.path) ? 'active' : ''
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (subItem.path) {
                            navigate(subItem.path);
                          }
                        }}
                      >
                        <div className="submenuIcon">
                          {subItem.menuIcon}
                          {subItem.name}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </ul>

      </div>
      <div className="sidebarBottom">

        <div className="sidebarOption" title={collapsed ? 'Refresh' : ''} style={{ cursor: 'pointer' }} onClick={() => window.location.reload()}><FaRedo /> {!collapsed && <span>Refresh</span>}</div>
        {canAccessSettings && (
          <div 
            className={`sidebarOption ${isPathActive('/Settings') ? 'active' : ''}`}
            title={collapsed ? 'Settings' : ''}
            onClick={() => navigate('/Settings')}
            style={{ cursor: 'pointer' }}
          >
            <FaCog /> {!collapsed && <span>Settings</span>}
          </div>
        )}
        <div className="sidebarOption" title={collapsed ? 'Help Center' : ''}><FaQuestionCircle /> {!collapsed && <span>Help Center</span>}
        </div>
        <div 
        className="profile"
        onClick={() => setShowProfilePopup(!showProfilePopup)}
        style={{ cursor: 'pointer' }}
        >
          <img src="https://i.pravatar.cc/40" alt="profile" />
          {!collapsed && (
            <div>
              <p className="profileName">{user?.name || 'User'}</p>
              <p className="profileEmail">
                {(() => {
                  const email = user?.email || 'user@email.com';
                  return email.length > 18 ? email.substring(0, 18) + '...' : email;
                })()}
              </p>
            </div>
          )}
        </div>
        {showProfilePopup && <ProfilePopup onClose={() => setShowProfilePopup(false)} />}
      </div>
    </div>
  );
};

export default Sidebar;
