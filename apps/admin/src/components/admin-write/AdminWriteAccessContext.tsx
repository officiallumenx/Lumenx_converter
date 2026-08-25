import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useAdminToast } from "@/components/AdminActionToast";

type AdminWriteAccessContextValue = {
  writesAllowed: boolean;
  reason: string | null;
  guardWriteAction: (action: () => void) => void;
};

const AdminWriteAccessContext = createContext<AdminWriteAccessContextValue>({
  writesAllowed: true,
  reason: null,
  guardWriteAction: (action) => action(),
});

export function AdminWriteAccessProvider({
  writesAllowed,
  reason,
  children,
}: {
  writesAllowed: boolean;
  reason: string | null;
  children: ReactNode;
}) {
  const notify = useAdminToast();
  const guardWriteAction = useCallback(
    (action: () => void) => {
      if (writesAllowed) {
        action();
        return;
      }
      notify(reason ?? "View only — writes are disabled.");
    },
    [notify, reason, writesAllowed],
  );

  return (
    <AdminWriteAccessContext.Provider value={{ writesAllowed, reason, guardWriteAction }}>
      {children}
    </AdminWriteAccessContext.Provider>
  );
}

export function useAdminWriteAccess(): AdminWriteAccessContextValue {
  return useContext(AdminWriteAccessContext);
}
