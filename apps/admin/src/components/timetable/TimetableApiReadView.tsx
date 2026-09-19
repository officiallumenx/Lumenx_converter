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
import {
  TimetableAssignGrid,
  type AssignCellTarget,
} from "@/components/timetable/TimetableAssignGrid";
import type { ScheduleInput } from "@/lib/timetable-schedule";
import type {
  TimetableInstituteSummary,
  TimetableReadBundle,
  TimetableSectionSummary,
  TimetableSlotListItem,
} from "@/lib/timetable";

type TimetableApiReadViewProps = {
  bundle: TimetableReadBundle;
  instituteSummary?: TimetableInstituteSummary;
  selectedSectionId?: string;
  listHint?: string | null;
  writesEnabled?: boolean;
  mutating?: boolean;
  sectionSchedule?: ScheduleInput | null;
  assignmentLabels?: Record<string, string>;
  draftedSectionIds?: string[];
  /** Used to label drafted sections that have no slots yet. */
  sectionCatalog?: Array<{ id: string; classLabel: string; sectionLabel: string }>;
  onCreateTimetable?: () => void;
  onCreateSlot?: (sectionId?: string) => void;
  onAssignCell?: (target: AssignCellTarget) => void;
  onEditSlot?: (slot: TimetableSlotListItem) => void;
  onDeleteSlot?: (slotId: string) => void;
  onPublishSection?: (sectionId: string) => void;
  onOpenSection: (sectionId: string) => void;
  onBack: () => void;
};

function sectionTitle(summary: TimetableSectionSummary): string {
  return `${summary.classLabel} · Sec ${summary.sectionLabel}`;
}

function publishStatusLabel(status: TimetableSectionSummary["publishStatus"]): string {
  if (status === "published") return "Published";
  if (status === "draft") return "Draft";
  return "Empty";
}

function publishStatusTone(
  status: TimetableSectionSummary["publishStatus"],
): "success" | "warning" | "neutral" {
  if (status === "published") return "success";
  if (status === "draft") return "warning";
  return "neutral";
}

export function TimetableApiReadView({
  bundle,
  instituteSummary,
  selectedSectionId,
  listHint = null,
  writesEnabled = false,
  mutating = false,
  sectionSchedule = null,
  assignmentLabels = {},
  draftedSectionIds = [],
  sectionCatalog = [],
  onCreateTimetable,
  onCreateSlot,
  onAssignCell,
  onEditSlot,
  onDeleteSlot,
  onPublishSection,
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
      .sort(
        (a, b) =>
          a.dayOfWeek - b.dayOfWeek ||
          a.periodIndex - b.periodIndex ||
          a.startsAt.localeCompare(b.startsAt),
      );
  }, [bundle.slots, selectedSectionId]);

  const draftedSet = useMemo(() => new Set(draftedSectionIds), [draftedSectionIds]);

  const displaySections = useMemo(() => {
    const byId = new Map(bundle.sections.map((s) => [s.sectionId, s]));
    const catalogById = new Map(sectionCatalog.map((s) => [s.id, s]));
    for (const id of draftedSectionIds) {
      if (byId.has(id)) continue;
      const meta = catalogById.get(id);
      byId.set(id, {
        sectionId: id,
        classLabel: meta?.classLabel ?? "Class",
        sectionLabel: meta?.sectionLabel ?? id.slice(0, 8),
        slotCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        publishStatus: "draft",
      });
    }
    return [...byId.values()];
  }, [bundle.sections, draftedSectionIds, sectionCatalog]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displaySections;
    return displaySections.filter((section) =>
      sectionTitle(section).toLowerCase().includes(q),
    );
  }, [displaySections, query]);

  if (selectedSectionId) {
    const catalogMeta = sectionCatalog.find((s) => s.id === selectedSectionId);
    const title = selectedSummary
      ? sectionTitle(selectedSummary)
      : catalogMeta
        ? `${catalogMeta.classLabel} · Sec ${catalogMeta.sectionLabel}`
        : `Section ${selectedSectionId.slice(0, 8)}…`;
    const canPublish =
      writesEnabled && Boolean(selectedSummary?.inactiveCount) && onPublishSection;
    const hasSchedule = Boolean(sectionSchedule);
    return (
      <PageStack>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-3.5" /> All sections
          </Button>
          <Pill tone="neutral">
            {writesEnabled ? "Create / assign / publish" : "View only"}
          </Pill>
          {selectedSummary ? (
            <Pill tone={publishStatusTone(selectedSummary.publishStatus)}>
              {publishStatusLabel(selectedSummary.publishStatus)}
            </Pill>
          ) : draftedSet.has(selectedSectionId) ? (
            <Pill tone="warning">Draft</Pill>
          ) : null}
          {canPublish ? (
            <Button
              size="sm"
              variant="primary"
              disabled={mutating}
              onClick={() => onPublishSection?.(selectedSectionId)}
            >
              Publish
            </Button>
          ) : null}
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

        {hasSchedule && sectionSchedule && onAssignCell ? (
          <TimetableAssignGrid
            schedule={sectionSchedule}
            slots={sectionSlots}
            assignmentLabels={assignmentLabels}
            writesEnabled={writesEnabled}
            mutating={mutating}
            onAssignCell={onAssignCell}
          />
        ) : null}

        <Card>
          <CardHeader
            title={hasSchedule ? "Slot list" : title}
            hint={`${sectionSlots.length} slot${sectionSlots.length === 1 ? "" : "s"}${
              selectedSummary
                ? ` · ${selectedSummary.activeCount} active · ${selectedSummary.inactiveCount} draft`
                : ""
            }`}
          />
          {sectionSlots.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={<CalendarDays className="size-5" />}
                title={
                  hasSchedule
                    ? "Table created — assign subjects"
                    : "No slots for this section"
                }
                hint={
                  writesEnabled
                    ? hasSchedule
                      ? "Use the grid above to assign a subject to each period, then publish."
                      : "Create a timetable for this class/section first, or add a slot."
                    : "Timetable slots appear here once configured."
                }
                action={
                  writesEnabled ? (
                    <Button
                      variant="primary"
                      disabled={mutating}
                      onClick={() =>
                        hasSchedule
                          ? onCreateSlot?.(selectedSectionId)
                          : onCreateTimetable?.()
                      }
                    >
                      <Plus className="size-3.5" />{" "}
                      {hasSchedule ? "Assign subject" : "Create timetable"}
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
          {writesEnabled ? "Create / assign / publish" : "View only"}
        </Pill>
        {instituteSummary ? (
          <>
            <Pill tone="success">{instituteSummary.publishedCount} published</Pill>
            <Pill tone="warning">{instituteSummary.draftCount} draft</Pill>
            <Pill tone="neutral">{instituteSummary.totalSlots} slots</Pill>
          </>
        ) : null}
        {listHint ? <span className="text-xs text-muted-foreground">{listHint}</span> : null}
        {writesEnabled && onCreateTimetable ? (
          <Button
            size="sm"
            variant="primary"
            className="ml-auto"
            disabled={mutating}
            onClick={onCreateTimetable}
          >
            <Plus className="size-3.5" /> Create timetable
          </Button>
        ) : null}
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
          title={displaySections.length === 0 ? "No timetables yet" : "No matches"}
          hint={
            displaySections.length === 0
              ? writesEnabled
                ? "Select class and section, choose a template or custom timings, then assign subjects and publish."
                : "Timetables configured for this institute will appear here."
              : "Try another search."
          }
          action={
            writesEnabled && displaySections.length === 0 && onCreateTimetable ? (
              <Button variant="primary" disabled={mutating} onClick={onCreateTimetable}>
                <Plus className="size-3.5" /> Create timetable
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
                      {section.inactiveCount > 0
                        ? ` · ${section.inactiveCount} draft`
                        : ""}
                      {draftedSet.has(section.sectionId) && section.slotCount === 0
                        ? " · table created"
                        : ""}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Pill
                    tone={publishStatusTone(
                      section.slotCount === 0 && draftedSet.has(section.sectionId)
                        ? "draft"
                        : section.publishStatus,
                    )}
                  >
                    {publishStatusLabel(
                      section.slotCount === 0 && draftedSet.has(section.sectionId)
                        ? "draft"
                        : section.publishStatus,
                    )}
                  </Pill>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary mt-1 transition-colors" />
                </div>
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
            <Td>P{slot.periodIndex}</Td>
            <Td className="font-mono text-[11px]">
              {slot.startsAt.slice(0, 5)}–{slot.endsAt.slice(0, 5)}
            </Td>
            <Td>{slot.room?.trim() || "—"}</Td>
            <Td className="font-mono text-[11px]">
              {slot.teacherAssignmentId.slice(0, 8)}…
            </Td>
            <Td>
              <Pill tone={slot.status === "active" ? "success" : "warning"}>
                {slot.status === "active" ? "Published" : "Draft"}
              </Pill>
            </Td>
            {writesEnabled ? (
              <Td className="text-right">
                <div className="inline-flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mutating}
                    onClick={() => onEditSlot?.(slot)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
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
