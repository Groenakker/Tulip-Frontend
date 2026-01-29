import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { IoChevronBackOutline, IoNotifications } from "react-icons/io5";

const MOCK_NOTIFICATIONS = [
  { id: 1, message: "Document approved for signing", createdAt: "2025-01-28T10:00:00", seen: false },
  { id: 2, message: "New contract assigned to you", createdAt: "2025-01-28T09:30:00", seen: false },
  { id: 3, message: "Reminder: Project deadline tomorrow", createdAt: "2025-01-27T16:00:00", seen: true },
  { id: 4, message: "New contract assigned to you", createdAt: "2025-01-28T09:30:00", seen: false },
  { id: 5, message: "Reminder: Project deadline tomorrow", createdAt: "2025-01-27T16:00:00", seen: true },
  { id: 6, message: "New contract assigned to you", createdAt: "2025-01-28T09:30:00", seen: false },
  { id: 7, message: "Reminder: Project deadline tomorrow", createdAt: "2025-01-27T16:00:00", seen: true },
  { id: 8, message: "New contract assigned to you", createdAt: "2025-01-28T09:30:00", seen: false },
  { id: 9, message: "Reminder: Project deadline tomorrow", createdAt: "2025-01-27T16:00:00", seen: true },
  { id: 10, message: "New contract assigned to you", createdAt: "2025-01-28T09:30:00", seen: false },
];

export default function Header({ title }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [isCardOpen, setIsCardOpen] = useState(false);

  const unseenCount = notifications.filter((n) => !n.seen).length;

  const toggleCard = () => {
    setIsCardOpen((prev) => {
      if (!prev) {
        setNotifications((list) =>
          list.map((n) => ({ ...n, seen: true }))
        );
      }
      return !prev;
    });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setIsCardOpen(false);
      }
    }
    if (isCardOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCardOpen]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={styles.header}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => navigate(-1)}
        aria-label="Go back"
      >
        <IoChevronBackOutline />
      </button>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.notificationWrapper} ref={cardRef}>
        <button
          type="button"
          className={styles.notificationButton}
          onClick={toggleCard}
          aria-label="Notifications"
          aria-expanded={isCardOpen}
        >
          <IoNotifications />
          {unseenCount > 0 && (
            <span className={styles.badge} aria-label={`${unseenCount} unread notifications`}>
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </button>
        {isCardOpen && (
          <div className={styles.notificationCard}>
            <div className={styles.notificationCardHeader}>
              <span>Notifications</span>
            </div>
            <ul className={styles.notificationList}>
              {notifications.length === 0 ? (
                <li className={styles.notificationEmpty}>No notifications yet</li>
              ) : (
                notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`${styles.notificationItem} ${!n.seen ? styles.notificationItemUnseen : ""}`}
                  >
                    <p className={styles.notificationMessage}>{n.message}</p>
                    <time className={styles.notificationTime}>{formatDate(n.createdAt)}</time>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
