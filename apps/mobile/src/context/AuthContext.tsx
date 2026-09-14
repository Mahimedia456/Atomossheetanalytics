import * as SecureStore from "expo-secure-store";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { fetchMe, loginRequest } from "@/services/authApi";
import { setApiAuthToken } from "@/services/apiClient";
import type { AtomosUser } from "@/types/auth";

const TOKEN_KEY = "atomos_token";
const USER_KEY = "atomos_user";

type AuthContextValue = {
  token: string | null;
  user: AtomosUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: { email: string; password: string }) => Promise<AtomosUser>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AtomosUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setApiAuthToken(null);
    setToken(null);
    setUser(null);

    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY)
    ]);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const login = useCallback(async ({
    email,
    password
  }: {
    email: string;
    password: string;
  }) => {
    const data = await loginRequest({ email, password });

    setApiAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);

    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, data.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user))
    ]);

    return data.user;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function hydrateSession() {
      try {
        const [savedToken, savedUserJson] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY)
        ]);

        if (!savedToken) {
          return;
        }

        setApiAuthToken(savedToken);

        if (mounted) {
          setToken(savedToken);

          if (savedUserJson) {
            try {
              setUser(JSON.parse(savedUserJson));
            } catch {
              // /auth/me below remains the source of truth.
            }
          }
        }

        const me = await fetchMe();

        if (mounted) {
          setUser(me.user);
          await SecureStore.setItemAsync(
            USER_KEY,
            JSON.stringify(me.user)
          );
        }
      } catch {
        await clearSession();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    hydrateSession();

    return () => {
      mounted = false;
    };
  }, [clearSession]);

  const hasRole = useCallback(
    (...roles: string[]) => roles.includes(String(user?.role || "")),
    [user]
  );

  const hasPermission = useCallback(
    (permission: string) =>
      Array.isArray(user?.permissions) &&
      user.permissions.includes(permission),
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      hasRole,
      hasPermission
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
