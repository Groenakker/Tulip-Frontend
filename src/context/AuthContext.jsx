import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

const normalizeUser = (data) => {
  if (!data) {
    return null;
  }

  const companyId =
    data.companyId ??
    data.company_id ??
    data.companyID ??
    null;

  return {
    _id: data._id,
    name: data.name,
    companyName: data.companyName,
    companyId,
    email: data.email,
    profilePicture: data.profilePicture,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [hasSystemRole, setHasSystemRole] = useState(false);
  const permissionsLoadedRef = useRef(false); // Track if permissions have been loaded at least once
  const refreshIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  const fetchPermissions = useCallback(async () => {
    if (!isAuthenticated) {
      setPermissions([]);
      setHasSystemRole(false);
      setPermissionsLoading(false);
      return;
    }

    // Note: permissionsLoading should already be true when this is called,
    // but we set it here as well for safety
    setPermissionsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        // Update all permission-related state together
        setPermissions(data.permissions || []);
        setHasSystemRole(Boolean(data.hasSystemRole));
        permissionsLoadedRef.current = true;
        setPermissionsLoading(false);
      } else {
        console.error('Failed to load permissions');
        setPermissions([]);
        setHasSystemRole(false);
        setPermissionsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
      setHasSystemRole(false);
      setPermissionsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshTokenSilently = useCallback(async () => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshingRef.current) {
      return false;
    }

    isRefreshingRef.current = true;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(normalizeUser(userData));
        setIsAuthenticated(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const handleAutoLogout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setPermissions([]);
    setHasSystemRole(false);
    setPermissionsLoading(false);
    permissionsLoadedRef.current = false;
    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    // Navigate to login if not already there
    const publicPaths = ['/login', '/signup', '/invite-signup'];
    if (!publicPaths.includes(window.location.pathname)) {
      window.location.href = '/login';
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(normalizeUser(userData));
        setIsAuthenticated(true);
      } else if (response.status === 401) {
        // Token expired - try to refresh
        const refreshSuccess = await refreshTokenSilently();
        if (!refreshSuccess) {
          // Refresh failed, logout
          handleAutoLogout();
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [refreshTokenSilently, handleAutoLogout]);

  useEffect(() => {
    // Check if user is authenticated on mount
    checkAuth();
    
    // Setup automatic token refresh (check every 10 minutes)
    refreshIntervalRef.current = setInterval(() => {
      if (isAuthenticated && !isRefreshingRef.current) {
        refreshTokenSilently();
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, refreshTokenSilently, checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      // Ensure permissionsLoading is set to true synchronously before async fetch
      setPermissionsLoading(true);
      fetchPermissions();
    } else {
      setPermissions([]);
      setHasSystemRole(false);
      setPermissionsLoading(false);
      permissionsLoadedRef.current = false;
    }
  }, [isAuthenticated, fetchPermissions]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setUser(normalizeUser(data));
        setIsAuthenticated(true);
        return { success: true, data };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setUser(normalizeUser(data));
        setIsAuthenticated(true);
        return { success: true, data };
      } else {
        return { success: false, message: data.message || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Signup failed. Please try again.' };
    }
  };

  const completeInviteSignup = async ({ token, name, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/invite/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ token, name, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(normalizeUser(data));
        setIsAuthenticated(true);
        return { success: true, data };
      }

      return {
        success: false,
        message: data?.message || 'Unable to complete invitation signup.',
      };
    } catch (error) {
      console.error('Invite signup error:', error);
      return {
        success: false,
        message: 'Unable to complete invitation signup. Please try again.',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
      setHasSystemRole(false);
      setPermissionsLoading(false);
      permissionsLoadedRef.current = false;
      // Clear refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }
  };

  // Setup global fetch interceptor for 401 responses (only for API calls)
  useEffect(() => {
    const originalFetch = window.fetch;
    let isIntercepting = false;
    
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const isApiCall = typeof url === 'string' && url.includes(API_BASE_URL);
      
      // Only intercept API calls, and avoid intercepting the refresh endpoint itself
      if (!isApiCall || url.includes('/auth/refresh')) {
        return originalFetch(...args);
      }

      const response = await originalFetch(...args);
      
      // Check if response is 401 (Unauthorized) and we're authenticated
      if (response.status === 401 && isAuthenticated && !isIntercepting) {
        isIntercepting = true;
        try {
          // Try to refresh token first
          const refreshSuccess = await refreshTokenSilently();
          if (!refreshSuccess) {
            // Refresh failed, logout
            handleAutoLogout();
            return response; // Return original 401 response
          } else {
            // Retry the original request with new token
            return originalFetch(...args);
          }
        } finally {
          isIntercepting = false;
        }
      }
      
      return response;
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
    };
  }, [isAuthenticated, refreshTokenSilently, handleAutoLogout]);

  const hasPermission = useCallback((module, actions = 'read') => {
    if (!module) {
      return true;
    }

    // If permissions are still loading OR haven't been loaded yet, don't deny access yet
    // This prevents false negatives for admin users during reload
    if (permissionsLoading || !permissionsLoadedRef.current) {
      return true; // Optimistically allow access while loading
    }

    if (hasSystemRole) {
      return true;
    }

    const modulePermission = permissions.find((perm) => perm.module === module);
    if (!modulePermission) {
      return false;
    }

    const actionsArray = Array.isArray(actions) ? actions : [actions];
    return actionsArray.every((action) =>
      modulePermission.allowedActions?.includes(action)
    );
  }, [permissions, hasSystemRole, permissionsLoading]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    permissions,
    permissionsLoading,
    hasPermission,
    hasSystemRole,
    login,
    signup,
    completeInviteSignup,
    logout,
    checkAuth,
    refreshToken: refreshTokenSilently,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

