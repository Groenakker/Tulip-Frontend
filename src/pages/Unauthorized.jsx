import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import Header from '../components/Header';
import WhiteIsland from '../components/Whiteisland';
import styles from './Unauthorized.module.css';

// Friendly access-denied page. Surfaces the same chrome (Header
// + WhiteIsland) and visual tokens as every other internal page
// so the user doesn't feel like they've crashed into a different
// app when permissions are missing.
const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || '/';

  return (
    <>
      <Header title="Access denied" />
      <WhiteIsland className="WhiteIsland">
        <div className={styles.wrapper}>
          <div className={styles.lockIcon}>
            <FaLock />
          </div>
          <h2 className={styles.title}>You don't have access to this page</h2>
          <p className={styles.message}>
            Your account doesn't have permission to view this section. If you
            believe this is a mistake, please ask an administrator to grant the
            necessary permission.
          </p>
          <div className={styles.actions}>
            <button className="btnGhost" onClick={() => navigate(fromPath || '/')}>
              Go back
            </button>
            <button className="btnPrimary" onClick={() => navigate('/')}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </WhiteIsland>
    </>
  );
};

export default Unauthorized;
