import { createContext, useContext, useEffect, useState, useCallback } from "react";

// Customer Portal authentication context. Mirrors the internal
// AuthContext but talks to /api/portal/auth/customer/* and looks at
// the `customerToken` cookie. It deliberately keeps a separate
// React context object so a screen mounted inside both providers
// can call `useAuth()` for the internal user and `useCustomerAuth()`
// for the portal user without collisions.

const CustomerAuthContext = createContext(null);

const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api`;

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
};

export const CustomerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portal/auth/customer/me`, {
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
      const res = await fetch(`${API_BASE_URL}/portal/auth/customer/login`, {
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
      await fetch(`${API_BASE_URL}/portal/auth/customer/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch { /* swallow */ }
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <CustomerAuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, checkAuth }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};
