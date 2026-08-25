import { useMemo, useState } from "react";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import {
  RECYCLE_BIN_RETENTION_DAYS,
  daysLeftInRecycleBin,
  ensureRecycleBinDemoSeed,
  loadRecycleBin,
  permanentlyDeleteFromRecycleBin,
  type RecycleBinItem,
} from "@lumenx/utils";
import { restoreRecycleBinEntity } from "@/lib/recycle-restore";
import { RotateCcw, Trash2 } from "lucide-react";
import { appendAdminAuditEntry } from "@/lib/audit-activity-data";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";

export function RecycleBinPanel() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const [items, setItems] = useState<RecycleBinItem[]>(() => {
    ensureRecycleBinDemoSeed();
    return loadRecycleBin();
  });

  const refresh = () => setItems(loadRecycleBin());

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
    [items],
  );

  const restore = (item: RecycleBinItem) => {
    restoreRecycleBinEntity(item);
    appendAdminAuditEntry({
      user: user?.name ?? "Admin",
      action: "Restored from recycle bin",
      target: item.title,
      module: "Storage",
      status: "info",
    });
    refresh();
    notify(`Restored “${item.title}” to ${item.module}`);
  };

  const purge = (item: RecycleBinItem) => {
    permanentlyDeleteFromRecycleBin(item.id);
    appendAdminAuditEntry({
      user: user?.name ?? "Admin",
      action: "Permanently deleted from recycle bin",
      target: item.title,
      module: "Storage",
      status: "warning",
    });
    refresh();
    notify(`Permanently deleted “${item.title}”`);
  };

  return (
    <Card>
      <CardHeader
        title="Recycle Bin"
        hint={`Soft-deleted items · auto-purge after ${RECYCLE_BIN_RETENTION_DAYS} days`}
        action={<Pill tone="neutral">{sorted.length} items</Pill>}
      />
      <div className="px-4 sm:px-5 pb-5">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Recycle bin is empty.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.map((item) => {
              const left = daysLeftInRecycleBin(item);
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {item.module}
                      {item.subtitle ? ` · ${item.subtitle}` : ""} · deleted by {item.deletedBy} ·{" "}
                      {new Date(item.deletedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Pill tone={left <= 7 ? "warning" : "neutral"}>{left}d left</Pill>
                  <Button size="sm" variant="outline" onClick={() => restore(item)}>
                    <RotateCcw className="size-3.5" /> Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="!text-destructive !border-destructive/40"
                    onClick={() => purge(item)}
                  >
                    <Trash2 className="size-3.5" /> Delete forever
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
