/**
 * Customizable dashboard widgets — ↑/↓ reorder, drag handle, hide/show/reset.
 * Edit chrome sits above each card (never clipped) so every widget can move/hide.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  hideDashboardWidget,
  loadDashboardLayout,
  moveDashboardWidget,
  moveDashboardWidgetByDelta,
  resetDashboardLayout,
  saveDashboardLayout,
  showDashboardWidget,
  visibleDashboardOrder,
  type DashboardLayoutState,
} from "@lumenx/utils";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  LayoutTemplate,
  MoveVertical,
  RotateCcw,
} from "lucide-react";

export type DashboardWidgetDef = {
  id: string;
  label: string;
};

type DashboardLayoutApi = {
  storageKey: string;
  defaults: readonly string[];
  labels: Record<string, string>;
  state: DashboardLayoutState;
  editing: boolean;
  setEditing: (v: boolean) => void;
  visibleOrder: string[];
  dragId: string | null;
  dropTargetId: string | null;
  setDragId: (id: string | null) => void;
  setDropTargetId: (id: string | null) => void;
  hide: (id: string) => void;
  show: (id: string) => void;
  reset: () => void;
  move: (fromId: string, toId: string) => void;
  moveByDelta: (id: string, delta: -1 | 1) => void;
};

const DashboardLayoutCtx = createContext<DashboardLayoutApi | null>(null);

function useDashboardLayoutApi(): DashboardLayoutApi {
  const ctx = useContext(DashboardLayoutCtx);
  if (!ctx) throw new Error("useDashboardLayoutApi requires DashboardLayoutProvider");
  return ctx;
}

export function DashboardLayoutProvider({
  storageKey,
  widgets,
  children,
}: {
  storageKey: string;
  widgets: readonly DashboardWidgetDef[];
  children: ReactNode;
}) {
  const defaults = useMemo(() => widgets.map((w) => w.id), [widgets]);
  const labels = useMemo(
    () => Object.fromEntries(widgets.map((w) => [w.id, w.label])),
    [widgets],
  );
  const [state, setState] = useState(() => loadDashboardLayout(storageKey, defaults));
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const persist = useCallback(
    (next: DashboardLayoutState) => {
      stateRef.current = next;
      setState(next);
      saveDashboardLayout(storageKey, next);
    },
    [storageKey],
  );

  useEffect(() => {
    if (!editing) {
      setDragId(null);
      setDropTargetId(null);
      return;
    }
    document.documentElement.setAttribute("data-dashboard-editing", "1");
    return () => {
      document.documentElement.removeAttribute("data-dashboard-editing");
    };
  }, [editing]);

  const api = useMemo<DashboardLayoutApi>(
    () => ({
      storageKey,
      defaults,
      labels,
      state,
      editing,
      setEditing,
      visibleOrder: visibleDashboardOrder(state),
      dragId,
      dropTargetId,
      setDragId,
      setDropTargetId,
      hide: (id) => persist(hideDashboardWidget(stateRef.current, id)),
      show: (id) => persist(showDashboardWidget(stateRef.current, id)),
      reset: () => {
        persist(resetDashboardLayout(storageKey, defaults));
        setEditing(false);
      },
      move: (fromId, toId) => persist(moveDashboardWidget(stateRef.current, fromId, toId)),
      moveByDelta: (id, delta) =>
        persist(moveDashboardWidgetByDelta(stateRef.current, id, delta)),
    }),
    [storageKey, defaults, labels, state, editing, dragId, dropTargetId, persist],
  );

  return (
    <DashboardLayoutCtx.Provider value={api}>{children}</DashboardLayoutCtx.Provider>
  );
}

export function DashboardCustomizeActions({ className }: { className?: string }) {
  const api = useDashboardLayoutApi();
  const hidden = api.state.hidden;

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-1.5", className)}>
      <Button
        type="button"
        size="sm"
        variant={api.editing ? "default" : "outline"}
        className="h-8 rounded-lg px-2.5 text-xs font-medium"
        onClick={() => api.setEditing(!api.editing)}
      >
        {api.editing ? "Done" : "Edit layout"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-lg px-2.5 text-xs font-medium gap-1"
        onClick={() => api.reset()}
      >
        <RotateCcw className="size-3" />
        Reset
      </Button>
      {api.editing &&
        hidden.map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg px-2.5 text-xs font-medium text-primary gap-1"
            onClick={() => api.show(id)}
          >
            <Eye className="size-3" />
            Show {api.labels[id] ?? id}
          </Button>
        ))}
    </div>
  );
}

export function DashboardCustomizeBar({ className }: { className?: string }) {
  const api = useDashboardLayoutApi();
  const hidden = api.state.hidden;
  const moving = Boolean(api.dragId);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs">
        <LayoutTemplate className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
        <span className="font-medium text-foreground">Customize home</span>
        <span className="text-muted-foreground hidden sm:inline">
          Use ↑ ↓ on each card · or drag the grip · hide modules · layout is remembered
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={api.editing ? "default" : "outline"}
            className="h-8 rounded-lg gap-1.5"
            onClick={() => api.setEditing(!api.editing)}
          >
            {api.editing ? "Done" : "Edit layout"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg gap-1.5"
            onClick={() => api.reset()}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </div>
        {api.editing && hidden.length > 0 ? (
          <div className="basis-full flex flex-wrap gap-1.5 pt-1 border-t border-border/60 mt-1">
            <span className="text-muted-foreground self-center mr-1">Hidden:</span>
            {hidden.map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 rounded-lg gap-1"
                onClick={() => api.show(id)}
              >
                <Eye className="size-3" />
                Show {api.labels[id] ?? id}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {api.editing ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs transition-colors",
            moving
              ? "border-primary bg-primary/10 text-foreground"
              : "border-primary/30 bg-primary/5 text-foreground",
          )}
        >
          <MoveVertical
            className={cn("mt-0.5 size-3.5 shrink-0", moving ? "text-primary animate-pulse" : "text-primary")}
            aria-hidden
          />
          <div className="min-w-0 flex-1 leading-relaxed">
            {moving ? (
              <>
                <span className="font-semibold text-primary">Moving</span>
                {" — "}
                drag onto another card, or release to place. You can also use ↑ ↓.
              </>
            ) : (
              <>
                <span className="font-semibold">Edit mode on</span>
                {" — "}
                every card has <span className="font-semibold">↑ ↓</span> to move and an eye to hide. Hold the grip to drag.
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function widgetIdFromPoint(clientX: number, clientY: number): string | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!(el instanceof Element)) return null;
  const widget = el.closest("[data-dashboard-widget]");
  return widget?.getAttribute("data-dashboard-widget") ?? null;
}

export function DashboardWidget({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const api = useDashboardLayoutApi();
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const lastOverRef = useRef<string | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const hidden = api.state.hidden.includes(id);
  const index = api.state.order.indexOf(id);
  const canUp = index > 0;
  const canDown = index >= 0 && index < api.state.order.length - 1;
  const isDragging = api.dragId === id;
  const isDropTarget = api.dropTargetId === id && api.dragId !== id;

  const endReorder = useCallback(
    (pointerId?: number) => {
      activeRef.current = false;
      lastOverRef.current = null;
      pointerIdRef.current = null;
      api.setDragId(null);
      api.setDropTargetId(null);
      const node = rootRef.current;
      if (node && pointerId != null) {
        try {
          if (node.hasPointerCapture(pointerId)) node.releasePointerCapture(pointerId);
        } catch {
          // ignore
        }
      }
    },
    [api],
  );

  const beginReorder = useCallback(
    (pointerId: number) => {
      activeRef.current = true;
      lastOverRef.current = id;
      pointerIdRef.current = pointerId;
      api.setDragId(id);
      api.setDropTargetId(null);
      const node = rootRef.current;
      if (node) {
        try {
          node.setPointerCapture(pointerId);
        } catch {
          // ignore
        }
      }
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate(14);
        } catch {
          // ignore
        }
      }
    },
    [api, id],
  );

  if (hidden && !api.editing) return null;

  const onHandlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!api.editing || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    beginReorder(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!api.editing || !activeRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    const overId = widgetIdFromPoint(e.clientX, e.clientY);
    if (!overId || overId === id) {
      api.setDropTargetId(null);
      return;
    }
    api.setDropTargetId(overId);
    if (overId === lastOverRef.current) return;
    lastOverRef.current = overId;
    api.move(id, overId);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId && !activeRef.current) return;
    endReorder(e.pointerId);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative min-w-0",
        api.editing && "space-y-2",
        className,
      )}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-dashboard-widget={id}
      data-swipe-nav-ignore={api.editing ? "true" : undefined}
    >
      {api.editing ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 shadow-sm transition-colors",
            isDragging
              ? "border-primary bg-primary text-primary-foreground"
              : isDropTarget
                ? "border-primary bg-primary/10"
                : "border-border bg-card",
          )}
        >
          <button
            type="button"
            data-dashboard-drag-handle
            className={cn(
              "inline-flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 text-left text-xs font-medium touch-none select-none",
              isDragging
                ? "cursor-grabbing bg-primary-foreground/15"
                : "cursor-grab bg-muted/60 text-foreground hover:bg-muted",
            )}
            aria-label={`Drag to move ${api.labels[id] ?? id}`}
            onPointerDown={onHandlePointerDown}
          >
            <GripVertical className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{api.labels[id] ?? id}</span>
            {isDragging ? (
              <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide opacity-90">
                Moving
              </span>
            ) : (
              <span
                className={cn(
                  "ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide",
                  isDragging ? "opacity-90" : "text-muted-foreground",
                )}
              >
                Hold to drag
              </span>
            )}
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg border touch-manipulation",
                isDragging
                  ? "border-primary-foreground/30 bg-primary-foreground/15 disabled:opacity-40"
                  : "border-border bg-background text-foreground disabled:opacity-40 hover:bg-muted",
              )}
              aria-label={`Move ${api.labels[id] ?? id} up`}
              disabled={!canUp || Boolean(api.dragId)}
              onClick={() => api.moveByDelta(id, -1)}
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg border touch-manipulation",
                isDragging
                  ? "border-primary-foreground/30 bg-primary-foreground/15 disabled:opacity-40"
                  : "border-border bg-background text-foreground disabled:opacity-40 hover:bg-muted",
              )}
              aria-label={`Move ${api.labels[id] ?? id} down`}
              disabled={!canDown || Boolean(api.dragId)}
              onClick={() => api.moveByDelta(id, 1)}
            >
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg border touch-manipulation",
                isDragging
                  ? "border-primary-foreground/30 bg-primary-foreground/15"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
              aria-label={hidden ? `Show ${api.labels[id]}` : `Hide ${api.labels[id]}`}
              disabled={Boolean(api.dragId)}
              onClick={() => (hidden ? api.show(id) : api.hide(id))}
            >
              {hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "min-w-0 transition-all",
          api.editing && "rounded-2xl ring-1 ring-border/70 ring-offset-2 ring-offset-background",
          isDragging && "opacity-55 scale-[0.99] ring-2 ring-primary touch-none",
          isDropTarget && "ring-2 ring-primary/70",
          hidden && api.editing && "opacity-50",
        )}
      >
        {hidden && api.editing ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
            Hidden · {api.labels[id] ?? id}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function useDashboardLayoutOrder(): string[] {
  const api = useDashboardLayoutApi();
  return api.editing ? api.state.order : api.visibleOrder;
}

export function DashboardWidgets({
  render,
}: {
  render: (id: string) => ReactNode;
}) {
  const ids = useDashboardLayoutOrder();
  return (
    <>
      {ids.map((id) => (
        <DashboardWidget key={id} id={id}>
          {render(id)}
        </DashboardWidget>
      ))}
    </>
  );
}
