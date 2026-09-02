import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Home, Loader2 } from "lucide-react";
import { useApp } from "@/lib/app-state";
import { Button } from "@lumenx/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lumenx/ui";
import { useParentPortal } from "@/context/ParentPortalContext";
import { cn } from "@lumenx/ui";

/** Sticky context for parents: active learner + quick switch (validated IDs only). */
export function ParentContextBar() {
  const { activeChildId, setActiveChildId, linkedChildren } = useApp();
  const portal = useParentPortal();
  const loc = useLocation();
  const isHome = loc.pathname === "/";
  const child = linkedChildren.find((c) => c.id === activeChildId);
  if (!child) return null;

  const loading = portal.isParent && portal.isLoading && !portal.snapshot;

  return (
    <div
      className={cn(
        "parent-context-bar sticky top-14 z-30 border-b border-border px-3 py-2.5 md:top-16 md:px-8",
        loading && "opacity-80",
      )}
    >
      <div className="mx-auto flex max-w-6xl min-w-0 items-center gap-2">
        {loading ? (
          <span className="inline-flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
            Loading {child.name.split(" ")[0]}…
          </span>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {child.name}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {child.className} {child.section}
              </span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="parent-context-action h-auto shrink-0 rounded-lg gap-1.5 px-3 text-xs sm:text-sm"
                >
                  Switch child
                  <ChevronDown className="size-4 opacity-70" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Linked to your account
                </DropdownMenuLabel>
                {linkedChildren.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setActiveChildId(c.id)}
                    className={cn(c.id === activeChildId && "bg-primary/10 font-medium")}
                  >
                    <div className="min-w-0">
                      <div className="truncate">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
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
            {!isHome && (
              <Button
                variant="outline"
                size="icon"
                className="parent-context-action size-11 shrink-0 rounded-lg"
                asChild
                aria-label="Go to home"
              >
                <Link to="/">
                  <Home className="size-4" />
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
