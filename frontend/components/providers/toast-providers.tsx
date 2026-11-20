"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Toast, type ToastVariant } from "@/components/toast";

export type { ToastVariant } from "@/components/toast";

export interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastRecord {
  id: string;
  identity: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
  closing: boolean;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  success: (description: string, title?: string) => string;
  error: (description: string, title?: string) => string;
  warning: (description: string, title?: string) => string;
  info: (description: string, title?: string) => string;
  dismiss: (id: string) => void;
}

const noopToast = () => "";
const noopDismiss = () => undefined;

const ToastContext = createContext<ToastContextValue>({
  toast: noopToast,
  success: noopToast,
  error: noopToast,
  warning: noopToast,
  info: noopToast,
  dismiss: noopDismiss,
});

const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 8000;
const CLOSING_DURATION_MS = 250;
const MAX_VISIBLE_TOASTS = 5;

const subscribeToClient = () => () => undefined;

function useIsClient() {
  return useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
}

function ToastItem({
  record,
  onDismiss,
}: {
  record: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (record.closing) return;
    timerRef.current = window.setTimeout(
      () => onDismiss(record.id),
      record.durationMs,
    );
    return () => window.clearTimeout(timerRef.current);
  }, [record.id, record.durationMs, record.closing, onDismiss]);

  return (
    <Toast
      variant={record.variant}
      title={record.title}
      description={record.description}
      closing={record.closing}
      onClose={() => onDismiss(record.id)}
    />
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((record) =>
        record.id === id && !record.closing
          ? { ...record, closing: true }
          : record,
      ),
    );
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((record) => record.id !== id));
    }, CLOSING_DURATION_MS);
  }, []);

  const push = useCallback((options: ToastOptions) => {
    const variant = options.variant ?? "info";
    const durationMs =
      options.durationMs ??
      (variant === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);
    const identity = `${variant}:${options.title}:${options.description ?? ""}`;
    const id = `toast-${counterRef.current++}`;

    setToasts((prev) =>
      [
        ...prev.filter((record) => record.identity !== identity),
        {
          id,
          identity,
          variant,
          title: options.title,
          description: options.description,
          durationMs,
          closing: false,
        },
      ].slice(-MAX_VISIBLE_TOASTS),
    );

    return id;
  }, []);

  const success = useCallback(
    (description: string, title = "Success!") =>
      push({ variant: "success", title, description }),
    [push],
  );
  const error = useCallback(
    (description: string, title = "Error!") =>
      push({ variant: "error", title, description }),
    [push],
  );
  const warning = useCallback(
    (description: string, title = "Warning") =>
      push({ variant: "warning", title, description }),
    [push],
  );
  const info = useCallback(
    (description: string, title = "Info") =>
      push({ variant: "info", title, description }),
    [push],
  );

  const value = useMemo(
    () => ({ toast: push, success, error, warning, info, dismiss }),
    [push, success, error, warning, info, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {isClient &&
        createPortal(
          <div
            aria-label="Notifications"
            className="pointer-events-none fixed"
            style={{
              position: "fixed",
              top: "80px",
              right: "16px",
              zIndex: 99999,
              width: "360px",
              maxWidth: "calc(100vw - 32px)",
              boxSizing: "border-box",
            }}
          >
            <ul
              className="flex w-full flex-col gap-3 overflow-x-hidden overflow-y-auto"
              style={{
                maxHeight: "calc(100vh - 96px)",
                boxSizing: "border-box",
              }}
            >
              {toasts.map((record) => (
                <ToastItem
                  key={record.id}
                  record={record}
                  onDismiss={dismiss}
                />
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
