import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type AdminToastTone = "success" | "error" | "info";

type Toast = { id: number; message: string; tone: AdminToastTone };

type NotifyFn = (message: string, tone?: AdminToastTone) => void;

const AdminToastContext = createContext<NotifyFn>(() => {});

export function useAdminToast() {
  return useContext(AdminToastContext);
}

function inferTone(message: string): AdminToastTone {
  const m = message.toLowerCase();
  if (
    /\b(fail|error|could not|invalid|required|denied|forbidden|exists|already)\b/.test(
      m,
    )
  ) {
    return "error";
  }
  return "success";
}

export function AdminActionToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone?: AdminToastTone) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const resolved = tone ?? inferTone(message);
    setToasts((prev) => [...prev, { id, message, tone: resolved }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, resolved === "error" ? 5200 : 3800);
  }, []);

  return (
    <AdminToastContext.Provider value={notify}>
      {children}
      {/* Above lx-modal-overlay (z-index 9990) so create/action feedback is visible */}
      <div
        className="fixed top-3 inset-x-3 sm:top-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[10050] flex flex-col gap-2 pointer-events-none max-w-[min(100vw-1.5rem,28rem)] sm:w-[28rem]"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => {
          const isError = t.tone === "error";
          return (
            <div
              key={t.id}
              role={isError ? "alert" : "status"}
              className={
                isError
                  ? "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-card px-4 py-3.5 text-sm shadow-elevated animate-slide-up ring-1 ring-destructive/20"
                  : "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-success/35 bg-card px-4 py-3.5 text-sm shadow-elevated animate-slide-up ring-1 ring-success/15"
              }
            >
              {isError ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              )}
              <span className="flex-1 font-medium leading-snug text-foreground">
                {t.message}
              </span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="size-8 min-w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </AdminToastContext.Provider>
  );
}
