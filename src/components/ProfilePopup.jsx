import React, { useState } from 'react';
import './ProfilePopup.css';
import { FaPlus, FaChevronRight, FaCog } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { FaHeadphones } from 'react-icons/fa6';
import { HiArrowRightOnRectangle } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfilePopup = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    onClose();
  };

  return (
    <>
      <div className="profilePopupOverlay" onClick={onClose}></div>
      <div className="profilePopupCard" onClick={(e) => e.stopPropagation()}>
        {/* User Info Header */}
        <div className="profilePopupHeader">
          <img 
            src={"https://i.pravatar.cc/40" || user?.profilePicture} 
            alt="profile" 
            className="profilePopupAvatar"
          />
          <div className="profilePopupUserInfo">
            <p className="profilePopupName">{user?.name || 'User'}</p>
            <p className="profilePopupEmail">{user?.email || 'user@email.com'}</p>
          </div>
        </div>

        {/* Account Actions */}
        <div className="profilePopupSection">
          <div className="profilePopupItem" onClick={() => {/* TODO: Add Account */}}>
            <FaPlus className="profilePopupIcon" />
            <span className="profilePopupText">Add Account</span>
            <FaChevronRight className="profilePopupChevron" />
          </div>
          <div className="profilePopupItem" onClick={() => {/* TODO: Edit Profile */}}>
            <MdRefresh className="profilePopupIcon" />
            <span className="profilePopupText">Edit Profile</span>
            <FaChevronRight className="profilePopupChevron" />
          </div>
        </div>

        {/* Security & Privacy */}
        <div className="profilePopupSection">
          <div className="profilePopupItem" onClick={() => {/* TODO: Change Password */}}>
            <FaCog className="profilePopupIcon" />
            <span className="profilePopupText">Change Password</span>
            <FaChevronRight className="profilePopupChevron" />
          </div>
          <div className="profilePopupItem" onClick={() => {/* TODO: Share Profile Info */}}>
            <FaHeadphones className="profilePopupIcon" />
            <span className="profilePopupText">Share Profile Info</span>
            <FaChevronRight className="profilePopupChevron" />
          </div>
        </div>

        {/* Preferences */}
        <div className="profilePopupSection">
          <div className="profilePopupItem" onClick={(e) => e.stopPropagation()}>
            <MdRefresh className="profilePopupIcon" />
            <span className="profilePopupText">Notifications</span>
            <label className="profilePopupToggle" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => {
                  e.stopPropagation();
                  setNotificationsEnabled(e.target.checked);
                }}
              />
              <span className="profilePopupToggleSlider"></span>
            </label>
          </div>
          <div className="profilePopupItem" onClick={(e) => e.stopPropagation()}>
            <FaCog className="profilePopupIcon" />
            <span className="profilePopupText">Dark Mode</span>
            <label className="profilePopupToggle" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={darkModeEnabled}
                onChange={(e) => {
                  e.stopPropagation();
                  setDarkModeEnabled(e.target.checked);
                }}
              />
              <span className="profilePopupToggleSlider"></span>
            </label>
          </div>
        </div>

        {/* Logout */}
        <div className="profilePopupSection">
          <div className="profilePopupItem profilePopupItemLogout" onClick={handleLogout}>
            <HiArrowRightOnRectangle className="profilePopupIcon profilePopupIconLogout" />
            <span className="profilePopupText profilePopupTextLogout">Logout Account</span>
            <FaChevronRight className="profilePopupChevron profilePopupChevronLogout" />
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePopup;

