import { createContext, useContext, useEffect, useState, useCallback } from "react";

const VendorAuthContext = createContext(null);

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export const useVendorAuth = () => {
  const ctx = useContext(VendorAuthContext);
  if (!ctx) throw new Error("useVendorAuth must be used within VendorAuthProvider");
  return ctx;
};

// Vendor Portal authentication context. See CustomerAuthContext for
// the rationale — vendors get their own cookie + endpoints so the
// three audiences (internal, customer, vendor) can never authenticate
// each other's pages.
export const VendorAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portal/auth/vendor/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/portal/auth/vendor/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setIsAuthenticated(true);
        return { success: true, data };
      }
      return { success: false, message: data?.message || "Login failed" };
    } catch (err) {
      return { success: false, message: err.message || "Login failed" };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/portal/auth/vendor/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch { /* swallow */ }
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <VendorAuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, checkAuth }}>
      {children}
    </VendorAuthContext.Provider>
  );
};
