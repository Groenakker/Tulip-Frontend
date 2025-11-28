import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from || '/';

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '16px',
      }}
    >
      <h2>Access Denied</h2>
      <p>You do not have permission to view this page.</p>
      <button
        style={{
          border: 'none',
          padding: '10px 18px',
          borderRadius: '6px',
          backgroundColor: '#0f172a',
          color: '#fff',
          cursor: 'pointer',
        }}
        onClick={() => navigate(fromPath || '/')}
      >
        Go Back
      </button>
    </div>
  );
};

export default Unauthorized;

