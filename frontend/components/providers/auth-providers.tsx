"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "@/lib/api/auth";
import { onUnauthorized } from "@/lib/api/client";
import type { AuthUser, LoginInput, RegisterInput } from "@/types/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login(input: LoginInput): Promise<AuthUser>;
  register(input: RegisterInput): Promise<AuthUser>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const refreshPromise = useRef<Promise<void> | null>(null);
  const userRef = useRef<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    if (refreshPromise.current) return refreshPromise.current;
    const promise = (async () => {
      setStatus("loading");
      let resolvedUser: AuthUser | null = null;
      try {
        const currentUser = await getCurrentUser(userRef.current ?? undefined);
        resolvedUser = currentUser;
        userRef.current = currentUser;
        setUser(currentUser);
      } catch {
        userRef.current = null;
        setUser(null);
      } finally {
        setStatus(resolvedUser ? "authenticated" : "unauthenticated");
        refreshPromise.current = null;
      }
    })();
    refreshPromise.current = promise;
    return promise;
  }, []);

  useEffect(() => void refresh(), [refresh]);
  useEffect(
    () =>
      onUnauthorized(() => {
        userRef.current = null;
        setUser(null);
        setStatus("unauthenticated");
      }),
    [],
  );

  const login = useCallback(async (input: LoginInput) => {
    const authenticatedUser = await loginRequest(input);
    userRef.current = authenticatedUser;
    setUser(authenticatedUser);
    setStatus("authenticated");
    return authenticatedUser;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const registeredUser = await registerRequest(input);
    userRef.current = registeredUser;
    setUser(registeredUser);
    setStatus("authenticated");
    return registeredUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      userRef.current = null;
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      login,
      register,
      logout,
      refresh,
    }),
    [user, status, login, register, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
