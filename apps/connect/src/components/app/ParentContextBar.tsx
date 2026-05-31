import { Link } from "@tanstack/react-router";
import { ChevronDown, Home, Loader2, Users } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { children } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useParentPortal } from "@/context/ParentPortalContext";
import { cn } from "@/lib/utils";

/** Sticky context for parents: active learner + quick switch (validated IDs only). */
export function ParentContextBar() {
  const { activeChildId, setActiveChildId } = useApp();
  const portal = useParentPortal();
  const child = children.find((c) => c.id === activeChildId);
  if (!child) return null;

  const loading = portal.isParent && portal.isLoading && !portal.snapshot;

  return (
    <div
      className={cn(
        "sticky top-14 z-30 border-b border-border bg-muted/40 px-3 py-2 md:top-16 md:px-8",
        loading && "animate-pulse",
      )}
    >
      <div className="mx-auto flex max-w-6xl min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Users className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground shrink-0">Viewing</span>
          {loading ? (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Loader2 className="size-3.5 animate-spin" />
              Loading {child.name.split(" ")[0]}…
            </span>
          ) : (
            <span className="min-w-0 truncate font-medium text-foreground">
              {child.name}{" "}
              <span className="font-normal text-muted-foreground">
                · {child.className} {child.section}
              </span>
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs gap-1" asChild>
            <Link to="/">
              <Home className="size-3.5" /> Home
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 rounded-lg gap-1 text-xs">
                Switch child
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Linked to your account
              </DropdownMenuLabel>
              {children.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => setActiveChildId(c.id)}
                  className={cn(c.id === activeChildId && "bg-primary/10 font-medium")}
                >
                  <div className="min-w-0">
                    <div className="truncate">{c.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {c.className} · Sec {c.section}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/" className="cursor-pointer">
                  Full switcher on dashboard
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
