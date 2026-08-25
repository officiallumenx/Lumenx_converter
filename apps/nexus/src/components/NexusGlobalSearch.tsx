import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@lumenx/ui";
import {
  Building2,
  ClipboardList,
  FileStack,
  LayoutGrid,
  LifeBuoy,
  Receipt,
  ScrollText,
  Shield,
  BarChart3,
} from "lucide-react";
import {
  NEXUS_SEARCH_GROUP_LABEL,
  buildNexusSearchIndex,
  filterSearchByAccess,
  groupSearchItems,
  orderedSearchGroups,
  type NexusSearchGroup,
  type NexusSearchItem,
} from "@/lib/nexus-global-search";
import { NEXUS_SEARCH_PLACEHOLDER } from "@/lib/nexus-nav";
import {
  getActiveNexusOperator,
  subscribePlatformAccess,
} from "@/lib/platform-access-store";

interface NexusGlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUP_ICON: Record<NexusSearchGroup, typeof Building2> = {
  institutes: Building2,
  plans: LayoutGrid,
  billing: Receipt,
  support: LifeBuoy,
  templates: FileStack,
  modules: LayoutGrid,
  policies: Shield,
  audit: ScrollText,
  reports: BarChart3,
};

export function NexusGlobalSearch({ open, onOpenChange }: NexusGlobalSearchProps) {
  const navigate = useNavigate();
  const [accessTick, setAccessTick] = useState(0);

  useEffect(() => {
    return subscribePlatformAccess(() => setAccessTick((n) => n + 1));
  }, []);

  const operator = useMemo(() => {
    void accessTick;
    return getActiveNexusOperator();
  }, [accessTick]);

  const items = useMemo(() => {
    void accessTick;
    return filterSearchByAccess(buildNexusSearchIndex());
  }, [accessTick, open]);

  const groups = useMemo(() => orderedSearchGroups(items), [items]);

  const go = (item: NexusSearchItem) => {
    onOpenChange(false);
    if (item.params) {
      navigate({ to: item.to, params: item.params });
      return;
    }
    navigate({ to: item.to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={NEXUS_SEARCH_PLACEHOLDER} />
      <CommandList className="max-h-[min(420px,70vh)]">
        <CommandEmpty>No platform results. Try institutes, plans, tickets, or templates.</CommandEmpty>

        {groups.map((group) => {
          const Icon = GROUP_ICON[group] ?? ClipboardList;
          const groupItems = groupSearchItems(items, group);
          return (
            <CommandGroup key={group} heading={NEXUS_SEARCH_GROUP_LABEL[group]}>
              {groupItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle ?? ""} ${item.keywords}`}
                  onSelect={() => go(item)}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{item.title}</div>
                    {item.subtitle ? (
                      <div className="truncate text-[11px] text-muted-foreground font-mono">
                        {item.subtitle}
                      </div>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
      {operator ? (
        <div className="border-t border-border px-3 py-2 text-[10px] font-mono text-muted-foreground">
          Filtered for {operator.displayName} · {operator.handle}
        </div>
      ) : null}
    </CommandDialog>
  );
}
