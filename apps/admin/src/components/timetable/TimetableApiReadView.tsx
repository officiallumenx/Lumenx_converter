import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Field,
  PageStack,
  Pill,
  SearchInput,
  Td,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { ArrowLeft, CalendarDays, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { IconChip } from "@/components/IconChip";
import type {
  TimetableReadBundle,
  TimetableSectionSummary,
  TimetableSlotListItem,
} from "@/lib/timetable";

type TimetableApiReadViewProps = {
  bundle: TimetableReadBundle;
  selectedSectionId?: string;
  listHint?: string | null;
  writesEnabled?: boolean;
  mutating?: boolean;
  onCreateSlot?: (sectionId?: string) => void;
  onEditSlot?: (slot: TimetableSlotListItem) => void;
  onDeleteSlot?: (slotId: string) => void;
  onOpenSection: (sectionId: string) => void;
  onBack: () => void;
};

function sectionTitle(summary: TimetableSectionSummary): string {
  return `${summary.classLabel} · Sec ${summary.sectionLabel}`;
}

export function TimetableApiReadView({
  bundle,
  selectedSectionId,
  listHint = null,
  writesEnabled = false,
  mutating = false,
  onCreateSlot,
  onEditSlot,
  onDeleteSlot,
  onOpenSection,
  onBack,
}: TimetableApiReadViewProps) {
  const [query, setQuery] = useState("");

  const selectedSummary = useMemo(
    () => bundle.sections.find((section) => section.sectionId === selectedSectionId),
    [bundle.sections, selectedSectionId],
  );

  const sectionSlots = useMemo(() => {
    if (!selectedSectionId) return [];
    return bundle.slots
      .filter((slot) => slot.sectionId === selectedSectionId)
      .sort((a, b) =>
        a.dayOfWeek - b.dayOfWeek ||
        a.periodIndex - b.periodIndex ||
        a.startsAt.localeCompare(b.startsAt),
      );
  }, [bundle.slots, selectedSectionId]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bundle.sections;
    return bundle.sections.filter((section) =>
      sectionTitle(section).toLowerCase().includes(q),
    );
  }, [bundle.sections, query]);

  if (selectedSectionId) {
    const title = selectedSummary
      ? sectionTitle(selectedSummary)
      : `Section ${selectedSectionId.slice(0, 8)}…`;
    return (
      <PageStack>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-3.5" /> All sections
          </Button>
          <Pill tone="neutral">
            {writesEnabled ? "API · create / edit / delete" : "Read-only · API mode"}
          </Pill>
          {writesEnabled ? (
            <Button
              size="sm"
              variant="outline"
              disabled={mutating}
              onClick={() => onCreateSlot?.(selectedSectionId)}
            >
              <Plus className="size-3.5" /> Add slot
            </Button>
          ) : null}
        </div>

        <Card>
          <CardHeader
            title={title}
            hint={`${sectionSlots.length} slot${sectionSlots.length === 1 ? "" : "s"}${
              selectedSummary ? ` · ${selectedSummary.activeCount} active` : ""
            }`}
          />
          {sectionSlots.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={<CalendarDays className="size-5" />}
                title="No slots for this section"
                hint={
                  writesEnabled
                    ? "Create a slot bound to an active teacher assignment."
                    : "Timetable slots appear here once configured."
                }
                action={
                  writesEnabled ? (
                    <Button
                      variant="primary"
                      disabled={mutating}
                      onClick={() => onCreateSlot?.(selectedSectionId)}
                    >
                      <Plus className="size-3.5" /> New slot
                    </Button>
                  ) : undefined
                }
              />
            </CardBody>
          ) : (
            <CardBody noPadding>
              <SlotsTable
                slots={sectionSlots}
                writesEnabled={writesEnabled}
                mutating={mutating}
                onEditSlot={onEditSlot}
                onDeleteSlot={onDeleteSlot}
              />
            </CardBody>
          )}
        </Card>
      </PageStack>
    );
  }

  return (
    <PageStack>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="neutral">
          {writesEnabled ? "API · create / edit / delete slots" : "Read-only · API mode"}
        </Pill>
        {listHint ? <span className="text-xs text-muted-foreground">{listHint}</span> : null}
      </div>

      <Field label="Search class section">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search class or section…"
          className="max-w-md"
        />
      </Field>

      {filteredSections.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-6 text-primary" />}
          title={bundle.sections.length === 0 ? "No timetable slots yet" : "No matches"}
          hint={
            bundle.sections.length === 0
              ? writesEnabled
                ? "Create a slot for a section with an active teacher assignment."
                : "Slots configured for this institute will appear here."
              : "Try another search."
          }
          action={
            writesEnabled && bundle.sections.length === 0 ? (
              <Button variant="primary" disabled={mutating} onClick={() => onCreateSlot?.()}>
                <Plus className="size-3.5" /> New slot
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSections.map((section) => (
            <button
              key={section.sectionId}
              type="button"
              onClick={() => onOpenSection(section.sectionId)}
              className="lx-timetable-card group text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <IconChip icon={CalendarDays} size="md" />
                  <div className="min-w-0">
                    <div className="font-semibold text-base truncate">
                      {sectionTitle(section)}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {section.slotCount} slots · {section.activeCount} active
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </PageStack>
  );
}

function SlotsTable({
  slots,
  writesEnabled = false,
  mutating = false,
  onEditSlot,
  onDeleteSlot,
}: {
  slots: TimetableSlotListItem[];
  writesEnabled?: boolean;
  mutating?: boolean;
  onEditSlot?: (slot: TimetableSlotListItem) => void;
  onDeleteSlot?: (slotId: string) => void;
}) {
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>Day</Th>
          <Th>Period</Th>
          <Th>Time</Th>
          <Th>Room</Th>
          <Th>Teacher assignment</Th>
          <Th>Status</Th>
          {writesEnabled ? <Th className="text-right">Actions</Th> : null}
        </tr>
      </thead>
      <tbody>
        {slots.map((slot) => (
          <Tr key={slot.id}>
            <Td>{slot.dayLabel}</Td>
            <Td className="font-mono text-xs">{slot.periodIndex}</Td>
            <Td className="font-mono text-xs">
              {slot.startsAt}–{slot.endsAt}
            </Td>
            <Td className="text-sm">{slot.room?.trim() || "—"}</Td>
            <Td className="font-mono text-[11px] text-muted-foreground">
              {slot.teacherAssignmentId.slice(0, 8)}…
            </Td>
            <Td>
              <Pill tone={slot.status === "active" ? "success" : "neutral"}>
                {slot.status}
              </Pill>
            </Td>
            {writesEnabled ? (
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutating}
                    onClick={() => onEditSlot?.(slot)}
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutating}
                    onClick={() => onDeleteSlot?.(slot.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </Td>
            ) : null}
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
