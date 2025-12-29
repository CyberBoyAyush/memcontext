"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

const toastConfig: Record<
  ToastType,
  { icon: typeof CheckCircle; bg: string; border: string }
> = {
  success: {
    icon: CheckCircle,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  info: {
    icon: Info,
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (message) => addToast("success", message),
    error: (message) => addToast("error", message),
    info: (message) => addToast("info", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <div
              key={toast.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm",
                "animate-slide-up min-w-[280px] max-w-[400px]",
                config.bg,
                config.border,
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  toast.type === "success" && "text-emerald-400",
                  toast.type === "error" && "text-red-400",
                  toast.type === "info" && "text-blue-400",
                )}
              />
              <p className="text-sm flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <X className="h-4 w-4 text-foreground-muted" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
