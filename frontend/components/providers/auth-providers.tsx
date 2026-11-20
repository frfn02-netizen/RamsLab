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
import { onLabMembershipRequired, onUnauthorized } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
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
const MEMBERSHIP_REVALIDATION_MIN_INTERVAL_MS = 30_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const refreshPromise = useRef<Promise<void> | null>(null);
  const membershipRevalidationPromise = useRef<Promise<void> | null>(null);
  const lastSuccessfulMembershipRevalidationAt = useRef(0);
  const authGeneration = useRef(0);
  const userRef = useRef<AuthUser | null>(null);

  const invalidateAuthState = useCallback(() => {
    authGeneration.current += 1;
    membershipRevalidationPromise.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (refreshPromise.current) return refreshPromise.current;
    const generation = authGeneration.current;
    const promise = (async () => {
      setStatus("loading");
      try {
        const currentUser = await getCurrentUser(userRef.current ?? undefined);
        if (generation !== authGeneration.current) return;
        userRef.current = currentUser;
        setUser(currentUser);
        setStatus("authenticated");
      } catch {
        if (generation !== authGeneration.current) return;
        userRef.current = null;
        setUser(null);
        setStatus("unauthenticated");
      } finally {
        refreshPromise.current = null;
      }
    })();
    refreshPromise.current = promise;
    return promise;
  }, []);

  const revalidateMembership = useCallback((force = false) => {
    if (refreshPromise.current) return refreshPromise.current;
    if (membershipRevalidationPromise.current) {
      return membershipRevalidationPromise.current;
    }

    if (
      !force &&
      Date.now() - lastSuccessfulMembershipRevalidationAt.current <
        MEMBERSHIP_REVALIDATION_MIN_INTERVAL_MS
    ) {
      return Promise.resolve();
    }

    const generation = authGeneration.current;
    let promise: Promise<void> | null = null;
    promise = (async () => {
      try {
        const currentUser = await getCurrentUser(userRef.current ?? undefined);
        if (generation !== authGeneration.current) return;
        userRef.current = currentUser;
        setUser(currentUser);
        setStatus("authenticated");
        lastSuccessfulMembershipRevalidationAt.current = Date.now();
      } catch (error) {
        if (generation !== authGeneration.current) return;
        if (error instanceof ApiError && error.status === 401) {
          invalidateAuthState();
          userRef.current = null;
          setUser(null);
          setStatus("unauthenticated");
        }
      } finally {
        if (membershipRevalidationPromise.current === promise) {
          membershipRevalidationPromise.current = null;
        }
      }
    })();

    membershipRevalidationPromise.current = promise;
    return promise;
  }, [invalidateAuthState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(
    () =>
      onLabMembershipRequired(() => {
        void revalidateMembership(true);
      }),
    [revalidateMembership],
  );

  useEffect(() => {
    const revalidateOnFocus = () => {
      if (document.visibilityState === "visible") {
        void revalidateMembership();
      }
    };
    window.addEventListener("focus", revalidateOnFocus);
    document.addEventListener("visibilitychange", revalidateOnFocus);
    return () => {
      window.removeEventListener("focus", revalidateOnFocus);
      document.removeEventListener("visibilitychange", revalidateOnFocus);
    };
  }, [revalidateMembership]);
  useEffect(
    () =>
      onUnauthorized(() => {
        invalidateAuthState();
        userRef.current = null;
        setUser(null);
        setStatus("unauthenticated");
      }),
    [invalidateAuthState],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const authenticatedUser = await loginRequest(input);
      invalidateAuthState();
      userRef.current = authenticatedUser;
      setUser(authenticatedUser);
      setStatus("authenticated");
      return authenticatedUser;
    },
    [invalidateAuthState],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const registeredUser = await registerRequest(input);
      invalidateAuthState();
      userRef.current = registeredUser;
      setUser(registeredUser);
      setStatus("authenticated");
      return registeredUser;
    },
    [invalidateAuthState],
  );

  const logout = useCallback(async () => {
    invalidateAuthState();
    try {
      await logoutRequest();
    } finally {
      userRef.current = null;
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [invalidateAuthState]);

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
