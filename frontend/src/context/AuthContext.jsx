import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { fetchMe, loginRequest } from "../services/authApi";

const AuthContext = createContext(null);

const TOKEN_KEY = "atomos_token";
const USER_KEY = "atomos_user";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const login = useCallback(async ({ email, password }) => {
    const data = await loginRequest({ email, password });

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      return roles.includes(user?.role);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission) => {
      return user?.permissions?.includes(permission);
    },
    [user]
  );

  useEffect(() => {
    let ignore = false;

    async function loadMe() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await fetchMe();

        if (!ignore) {
          setUser((current) => ({
            ...current,
            ...data.user,
          }));
        }
      } catch {
        logout();
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadMe();

    return () => {
      ignore = true;
    };
  }, [token, logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      hasRole,
      hasPermission,
    }),
    [token, user, loading, login, logout, hasRole, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}