import { useMemo } from "react";
import { ChevronDown, ListChecks } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lumenx/ui";
import {
  CALENDAR_HOLIDAY_RULE_OPTIONS,
  saveCalendarHolidayRules,
  type CalendarHolidayRules,
} from "@/lib/calendar-holiday-rules";

type Props = {
  rules: CalendarHolidayRules;
  writesEnabled: boolean;
  onNotify?: (message: string) => void;
};

export function CalendarHolidayRulesMenu({ rules, writesEnabled, onNotify }: Props) {
  const enabledCount = useMemo(
    () => CALENDAR_HOLIDAY_RULE_OPTIONS.filter((o) => rules[o.id]).length,
    [rules],
  );

  const toggle = (id: keyof CalendarHolidayRules) => {
    if (!writesEnabled) return;
    const next = { ...rules, [id]: !rules[id] };
    saveCalendarHolidayRules(next);
    const label = CALENDAR_HOLIDAY_RULE_OPTIONS.find((o) => o.id === id)?.label ?? id;
    onNotify?.(
      next[id] ? `${label} marked as holidays` : `${label} no longer holidays`,
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <ListChecks className="size-3.5" />
          Holidays
          <span className="font-mono text-[10px] text-muted-foreground">
            {enabledCount}/{CALENDAR_HOLIDAY_RULE_OPTIONS.length}
          </span>
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Holiday checklist</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CALENDAR_HOLIDAY_RULE_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.id}
            checked={rules[option.id]}
            disabled={!writesEnabled}
            onCheckedChange={() => toggle(option.id)}
            onSelect={(e) => e.preventDefault()}
            className="items-start py-2"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-snug">{option.label}</span>
              <span className="block text-[11px] font-normal text-muted-foreground leading-snug">
                {option.hint}
              </span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
