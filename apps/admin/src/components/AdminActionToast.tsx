import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
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

/** Green only for clear success; red for failures; orange for everything else. */
function inferTone(message: string): AdminToastTone {
  const m = message.toLowerCase();
  if (
    /\b(fail|failed|error|could not|couldn't|unable|invalid|required|denied|forbidden|unauthorized|not found|out of date|schema|migration|timeout|unavailable|rejected|conflict|exists|already|missing|blocked|unsupported)\b/.test(
      m,
    )
  ) {
    return "error";
  }
  if (
    /\b(saved|updated|created|deleted|added|removed|success|successful|approved|published|synced|detected|uploaded|sent|copied|restored|resolved)\b/.test(
      m,
    )
  ) {
    return "success";
  }
  return "info";
}

const TONE_STYLES: Record<
  AdminToastTone,
  { panel: string; dismiss: string; Icon: typeof CheckCircle2; iconClass: string }
> = {
  success: {
    panel:
      "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-success bg-success px-4 py-3.5 text-sm text-white shadow-elevated animate-slide-up",
    dismiss:
      "size-8 min-w-8 rounded-md flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    Icon: CheckCircle2,
    iconClass: "mt-0.5 size-4 shrink-0 text-white",
  },
  error: {
    panel:
      "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-destructive bg-destructive px-4 py-3.5 text-sm text-destructive-foreground shadow-elevated animate-slide-up",
    dismiss:
      "size-8 min-w-8 rounded-md flex items-center justify-center text-destructive-foreground/80 hover:text-destructive-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    Icon: AlertCircle,
    iconClass: "mt-0.5 size-4 shrink-0 text-destructive-foreground",
  },
  info: {
    panel:
      "pointer-events-auto flex items-start gap-2.5 rounded-xl border border-orange-500 bg-orange-500 px-4 py-3.5 text-sm text-white shadow-elevated animate-slide-up",
    dismiss:
      "size-8 min-w-8 rounded-md flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    Icon: Info,
    iconClass: "mt-0.5 size-4 shrink-0 text-white",
  },
};

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
        className="fixed top-[calc(max(env(safe-area-inset-top,0px),var(--lx-safe-top,0px))+0.75rem)] inset-x-3 sm:top-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[10050] flex flex-col gap-2 pointer-events-none max-w-[min(100vw-1.5rem,28rem)] sm:w-[28rem]"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => {
          const style = TONE_STYLES[t.tone];
          const Icon = style.Icon;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={style.panel}
            >
              <Icon className={style.iconClass} aria-hidden />
              <span className="flex-1 font-medium leading-snug">{t.message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className={style.dismiss}
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
