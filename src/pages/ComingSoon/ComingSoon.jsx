import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdRocketLaunch } from 'react-icons/md';
import styles from './ComingSoon.module.css';

const pageLabels = {
  '/Dashboard': 'Dashboard',
  '/MaterialResearch': 'Material Research',
  '/ConstituentResearch': 'Constituent Research',
  '/Library': 'Library',
  '/CreateSample': 'Create Sample',
  '/LabStudies': 'Lab Studies',
  '/Reports': 'Reports',
};

const ComingSoon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = pageLabels[location.pathname] || 'This page';

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <MdRocketLaunch className={styles.icon} />
      </div>
      <h2 className={styles.title}>
        <span className={styles.pageName}>{pageName}</span> is Coming Soon
      </h2>
      <p className={styles.description}>
        We're working hard to bring you this feature. Stay tuned for updates — it'll be ready before you know it.
      </p>
      <button className={styles.backButton} onClick={() => navigate(-1)}>
        Go Back
      </button>
    </div>
  );
};

export default ComingSoon;
