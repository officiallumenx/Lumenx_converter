import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader } from "@lumenx/ui-admin";
import {
  adminMobileNavIconStyle,
  adminMoreTileStyle,
  getAdminModuleColorForPath,
} from "@/lib/admin-module-colors";
import { adminNav, type AdminNavItem } from "@/lib/admin-nav";
import {
  loadQuickActionUsage,
  rankTopQuickActions,
  recordQuickActionUse,
} from "@/lib/quick-actions-usage";

const TOP_TAB = "top";

function sectionModules(label: string): AdminNavItem[] {
  const group = adminNav.find((item) => item.label === label);
  return (group?.items ?? []).filter((item) => item.to !== "/");
}

function allModules(): AdminNavItem[] {
  return adminNav.flatMap((group) => group.items.filter((item) => item.to !== "/"));
}

const SECTION_TABS = adminNav
  .filter((group) => sectionModules(group.label).length > 0)
  .map((group) => ({
    value: group.label,
    label: group.label === "Communications" ? "Comms" : group.label,
  }));

const TABS = [{ value: TOP_TAB, label: "Top" }, ...SECTION_TABS];

function QuickActionSectionTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const syncOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setOverflow({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncOverflow();
    const selected = el.querySelector<HTMLElement>('[aria-selected="true"]');
    selected?.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
    if (
      selected &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement.getAttribute("role") === "tab" &&
      el.contains(document.activeElement)
    ) {
      selected.focus();
    }
    el.addEventListener("scroll", syncOverflow, { passive: true });
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", syncOverflow);
      observer.disconnect();
    };
  }, [syncOverflow, value]);

  const scrollTabs = (direction: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: direction * 140, behavior: "smooth" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.value === value);
    if (index < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(TABS[Math.min(index + 1, TABS.length - 1)]!.value);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(TABS[Math.max(index - 1, 0)]!.value);
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(TABS[0]!.value);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(TABS[TABS.length - 1]!.value);
    }
  };

  return (
    <div className="lx-quick-action-tabs" data-swipe-nav-ignore>
      {overflow.left || overflow.right ? (
        <button
          type="button"
          className="lx-quick-action-tab-nav"
          aria-label="Scroll sections left"
          disabled={!overflow.left}
          onClick={() => scrollTabs(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      ) : null}
      <div
        ref={scrollerRef}
        className="lx-quick-action-tabs-scroller"
        role="tablist"
        aria-label="Quick action sections"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        {TABS.map((tab) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`qa-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls="qa-panel"
              tabIndex={selected ? 0 : -1}
              className={`lx-quick-action-tab${selected ? " is-active" : ""}`}
              onClick={() => onChange(tab.value)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {overflow.left || overflow.right ? (
        <button
          type="button"
          className="lx-quick-action-tab-nav"
          aria-label="Scroll sections right"
          disabled={!overflow.right}
          onClick={() => scrollTabs(1)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function HomeQuickActionsCard() {
  const [tab, setTab] = useState(TOP_TAB);
  const [usage, setUsage] = useState(loadQuickActionUsage);

  const actions = useMemo(() => {
    if (tab === TOP_TAB) return rankTopQuickActions(allModules(), usage);
    return sectionModules(tab);
  }, [tab, usage]);

  const hint =
    tab === TOP_TAB
      ? `${actions.length} most-used modules`
      : `${actions.length} ${tab} modules`;

  return (
    <Card className="lx-quick-actions-card" data-swipe-nav-ignore>
      <CardHeader title="Quick Actions" hint={hint} />
      <div className="lx-quick-actions-body">
        <QuickActionSectionTabs value={tab} onChange={setTab} />
        <div
          id="qa-panel"
          role="tabpanel"
          aria-labelledby={`qa-tab-${tab}`}
          className="lx-quick-action-grid"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            const accent = getAdminModuleColorForPath(action.to);
            return (
              <Link
                key={action.to}
                to={action.to}
                className="lx-quick-action-tile group rounded-lg border bg-background/50 transition-colors hover:bg-surface-hover"
                style={adminMoreTileStyle(accent, false)}
                onClick={() => {
                  recordQuickActionUse(action.to);
                  setUsage(loadQuickActionUsage());
                }}
              >
                <span className="lx-quick-action-icon" style={adminMobileNavIconStyle(accent, false)}>
                  <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="w-full px-0.5 text-[10px] font-medium leading-snug line-clamp-2">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
