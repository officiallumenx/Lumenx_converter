import { cn } from "@lumenx/ui";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { ProfileSectionId } from "@/lib/careers/profile-repository";

export function ProfileSectionNav({
  sections,
  active,
  onChange,
}: {
  sections: { id: ProfileSectionId; label: string }[];
  active: ProfileSectionId;
  onChange: (id: ProfileSectionId) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<ProfileSectionId, HTMLButtonElement>>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const activeIndex = sections.findIndex((s) => s.id === active);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setIsOverflowing(overflow);
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, sections.length]);

  useEffect(() => {
    tabRefs.current[active]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    updateScrollState();
  }, [active, updateScrollState]);

  const scrollBy = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Step{" "}
          <span className="font-medium text-foreground">{activeIndex + 1}</span>
          {" "}of{" "}
          <span className="font-medium text-foreground">{sections.length}</span>
          {" · "}
          <span className="font-medium text-foreground">{sections[activeIndex]?.label}</span>
        </p>
        {isOverflowing && (
          <p className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
            <ChevronLeft className="size-3.5 motion-safe:animate-pulse" aria-hidden />
            Swipe tabs
            <ChevronRight className="size-3.5 motion-safe:animate-pulse" aria-hidden />
          </p>
        )}
      </div>

      <div className="flex gap-1">
        {sections.map((_, i) => (
          <div
            key={sections[i]!.id}
            aria-hidden
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= activeIndex ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <nav className="relative border-b border-border">
        {isOverflowing && canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
        )}
        {isOverflowing && canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background to-transparent flex items-center justify-end pr-1">
            <ChevronRight className="size-4 text-primary/70 motion-safe:animate-pulse" aria-hidden />
          </div>
        )}

        {isOverflowing && (
          <>
            <button
              type="button"
              aria-label="Scroll tabs left"
              disabled={!canScrollLeft}
              onClick={() => scrollBy(-1)}
              className={cn(
                "absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background p-1 shadow-sm",
                !canScrollLeft && "opacity-40 pointer-events-none",
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll tabs right"
              disabled={!canScrollRight}
              onClick={() => scrollBy(1)}
              className={cn(
                "absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border border-border bg-background p-1 shadow-sm",
                !canScrollRight && "opacity-40 pointer-events-none",
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className={cn(
            "flex gap-0 overflow-x-auto scrollbar-thin -mb-px scroll-smooth",
            isOverflowing && "px-8",
          )}
        >
          {sections.map((section) => (
            <button
              key={section.id}
              ref={(el) => {
                if (el) tabRefs.current[section.id] = el;
              }}
              type="button"
              onClick={() => onChange(section.id)}
              className={cn(
                "shrink-0 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
                active === section.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function ProfileSectionFooter({
  sectionIndex,
  totalSections,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onSave,
  isLast,
  dirty,
}: {
  sectionIndex: number;
  totalSections: number;
  previousLabel?: string;
  nextLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onSave?: () => void;
  isLast: boolean;
  dirty?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <p className="text-xs text-center text-muted-foreground">
        Section {sectionIndex + 1} of {totalSections}
        {isLast ? " — last step" : " — use Next to continue"}
      </p>
      <div className="flex flex-wrap gap-2">
        {onPrevious && previousLabel && (
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex h-11 flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            {previousLabel}
          </button>
        )}
        {!isLast && onNext && nextLabel && (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-11 flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Next: {nextLabel}
            <ArrowRight className="size-4" />
          </button>
        )}
        {isLast && onSave && (
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-11 flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save profile
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
      {dirty && !isLast && (
        <p className="text-[11px] text-center text-muted-foreground">You have unsaved changes — save anytime from the top.</p>
      )}
    </div>
  );
}

export function ProfileSectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProfileSubsection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 pt-2 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptySectionHint({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: readonly string[];
}) {
  const [draft, setDraft] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const removeTag = (tag: string) => onChange(value.filter((t) => t !== tag));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">{label}</label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {tag}
              <button type="button" className="hover:text-destructive" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder ?? "Type and press Enter"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(draft);
            }
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
          onClick={() => addTag(draft)}
        >
          Add
        </button>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.filter((s) => !value.includes(s)).slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
              onClick={() => addTag(s)}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
