import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, module, actions = 'read' }) => {
  const { isAuthenticated, isLoading, permissionsLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading || permissionsLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only check permissions if they are fully loaded
  // This prevents false negatives for admin users during state updates
  if (module && !permissionsLoading && !hasPermission(module, actions)) {
    return <Navigate to="/not-authorized" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;

