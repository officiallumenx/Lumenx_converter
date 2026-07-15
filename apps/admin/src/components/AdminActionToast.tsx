import { CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; message: string };

const AdminToastContext = createContext<(message: string) => void>(() => {});

export function useAdminToast() {
  return useContext(AdminToastContext);
}

export function AdminActionToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <AdminToastContext.Provider value={notify}>
      {children}
      <div
        className="fixed bottom-4 right-3 sm:right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-[min(100vw-1.5rem,24rem)]"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-success/30 bg-card px-4 py-3 text-sm shadow-elevated animate-slide-up"
          >
            <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="size-8 min-w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AdminToastContext.Provider>
  );
}
