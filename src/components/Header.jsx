import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { IoChevronBackOutline } from "react-icons/io5";

export default function Header({ title }) {
  const navigate = useNavigate();

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
    </div>
  );
}
