'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastOpts {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  error?: boolean;
}
const Ctx = createContext<{ show: (t: ToastOpts) => void } | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOpts | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((t: ToastOpts) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), t.actionLabel ? 6000 : 3500);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          role="status"
          className={[
            "fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-[0.95rem] font-semibold shadow-float lg:bottom-24",
            toast.error ? "bg-destructive text-white" : "bg-foreground text-background",
          ].join(" ")}
        >
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}
