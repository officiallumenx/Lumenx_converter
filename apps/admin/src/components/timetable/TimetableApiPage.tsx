import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { TimetableApiReadView } from "@/components/timetable/TimetableApiReadView";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadTimetableReadBundle,
  resolveTimetableLoadView,
  shouldCommitTimetableLoad,
  type TimetableLoadStatus,
  type TimetableReadBundle,
} from "@/lib/timetable";

function timetableLoadHint(
  status: TimetableLoadStatus,
  errorMessage: string | null,
): string | null {
  if (status === "loading") return "Loading timetable slots…";
  if (status === "needs_institute") return "Select an institute to load timetable.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to timetable for this institute.";
  }
  if (status === "error") return errorMessage ?? "Failed to load timetable.";
  if (status === "empty") return "No timetable slots found for this institute.";
  return null;
}

export function TimetableApiPage() {
  const search = useSearch({ from: "/timetable" });
  const navigate = useNavigate();
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [apiBundle, setApiBundle] = useState<TimetableReadBundle | null>(null);
  const [loadStatus, setLoadStatus] = useState<TimetableLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);

  const loadView = resolveTimetableLoadView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedBundle: apiBundle,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const loadHint = timetableLoadHint(loadView.status, loadView.errorMessage);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setApiBundle(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiBundle(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiBundle(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadTimetableReadBundle(requestInstituteId).then((next) => {
      if (
        !shouldCommitTimetableLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiBundle(next.bundle);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  const selectedSectionId = search.id;

  const subtitle = useMemo(() => {
    if (!loadView.rowsValid || !loadView.bundle) {
      return `API mode · read-only · ${loadHint ?? "…"}`;
    }
    return `API mode · read-only · ${loadView.bundle.sections.length} sections · ${loadView.bundle.slots.length} slots`;
  }, [loadView.bundle, loadView.rowsValid, loadHint]);

  const openSection = (sectionId: string) => {
    void navigate({
      to: "/timetable",
      search: {
        id: sectionId,
        createGrade: undefined,
        createSection: undefined,
        openCreate: undefined,
      },
    });
  };

  const backToList = () => {
    void navigate({
      to: "/timetable",
      search: {
        id: undefined,
        createGrade: undefined,
        createSection: undefined,
        openCreate: undefined,
      },
    });
  };

  return (
    <AppShell
      title={selectedSectionId ? "Timetable slots" : "Timetables"}
      subtitle={subtitle}
    >
      {!loadView.rowsValid || !loadView.bundle ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {loadHint ?? "Loading timetable…"}
        </div>
      ) : (
        <TimetableApiReadView
          bundle={loadView.bundle}
          selectedSectionId={selectedSectionId}
          listHint={loadHint}
          onOpenSection={openSection}
          onBack={backToList}
        />
      )}
    </AppShell>
  );
}
