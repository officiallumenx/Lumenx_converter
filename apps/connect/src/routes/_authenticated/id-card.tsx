import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { PageHeader } from "@/components/app/PageHeader";
import { IdCardDetailsPanel, IdCardQrDialog, IdCardVisual } from "@/components/app/id-card";
import { IdCardScanUrlHint, useStudentQrUrl } from "@/components/app/id-card/useStudentQrUrl";
import { Button } from "@lumenx/ui";
import { children as allChildren } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { StudentIdCardPage } from "@/student-portal";
import {
  findIdCardSyncRow,
  idCardViewFromStudentProfile,
  idCardViewFromSyncRow,
  useStudentIdCardSync,
  type ConnectIdCardViewModel,
} from "@/lib/student/admin-id-card-bridge";
import { CONNECT_LEARNER_TO_STUDENT_ID, getInitials } from "@lumenx/utils";
import { Printer, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { downloadStudentIdCardToDevice } from "@/lib/device-file-downloads";
import { getStudent, getStudentGuardians } from "@/lib/students/api";
import { getPhotoSignedUrl } from "@/lib/photos/api";
import { getInstitute } from "@/lib/institute-profile/api";
import { connectQueryRoots } from "@/lib/connect-queries/keys";
import { isInstituteUuid } from "@/lib/institute-id";
import { PageSkeleton } from "@/student-portal/shared/ui";

export const Route = createFileRoute("/_authenticated/id-card")({
  head: () => ({
    meta: [
      { title: "Digital ID Card — LumenX Connect" },
      {
        name: "description",
        content: "Wallet-style digital student identity card with QR code.",
      },
    ],
  }),
  component: () => <IdCardRoute />,
});

function IdCardRoute() {
  const { role } = useApp();
  if (role === "student") return <StudentIdCardPage />;
  return <ParentIdCardPage />;
}

const CHILD_ADDRESSES: Record<string, string> = {
  C1: "12 Green Park Road, Sector 4, Hyderabad — 500032",
  C2: "45 Lakeview Enclave, Block C, Hyderabad — 500081",
  C3: "8 Civic Centre Lane, Madhapur, Hyderabad — 500033",
};

function ParentIdCardPage() {
  if (isApiAuthMode()) return <ParentIdCardApiPage />;
  return <ParentIdCardDemoPage />;
}

function ParentIdCardApiPage() {
  const { activeChildId, linkedChildren, linkedChildrenLoading, activeInstituteId } = useApp();
  const [qrOpen, setQrOpen] = useState(false);
  const child =
    linkedChildren.find((c) => c.id === activeChildId) ?? linkedChildren[0] ?? null;

  const query = useQuery({
    queryKey: [
      connectQueryRoots.parentPortal,
      activeInstituteId ?? "_",
      child?.id ?? "_",
      "id-card",
    ] as const,
    enabled:
      Boolean(activeInstituteId) &&
      Boolean(child?.id) &&
      isInstituteUuid(activeInstituteId ?? "") &&
      isInstituteUuid(child?.id ?? ""),
    queryFn: async (): Promise<ConnectIdCardViewModel> => {
      const studentId = child!.id;
      const [dto, guardians, institute] = await Promise.all([
        getStudent(studentId),
        getStudentGuardians(studentId).catch(() => []),
        getInstitute(activeInstituteId!).catch(() => null),
      ]);
      const primary = guardians.find((g) => g.isPrimary) ?? guardians[0];
      let photoUrl: string | null = null;
      try {
        const signed = await getPhotoSignedUrl("student", studentId);
        photoUrl = signed.photoSignedUrl;
      } catch {
        photoUrl = null;
      }
      return idCardViewFromStudentProfile({
        id: dto.id,
        name: dto.displayName || `${dto.firstName} ${dto.surname}`.trim(),
        className: dto.classLabel ?? "—",
        section: dto.sectionLabel ?? "—",
        rollNo: dto.rollNo ?? "—",
        address: dto.address,
        parentName: primary?.parentName,
        bloodGroup: dto.bloodGroup,
        emergencyContact: dto.emergencyContact,
        house: dto.house,
        issuedOn: dto.idCardIssuedOn,
        validTill: dto.idCardValidTill,
        institute: institute?.name ?? "Institute",
        photoUrl,
        admissionNumber: dto.admissionNumber,
        legacyCode: dto.legacyCode,
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  if (linkedChildrenLoading && !child) {
    return <PageSkeleton rows={5} />;
  }

  if (!child) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No linked students yet. Ask the school office to link a child to this parent account.
      </div>
    );
  }

  if (query.isLoading && !query.data) {
    return <PageSkeleton rows={5} />;
  }

  if (!query.data) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {query.error instanceof Error
          ? query.error.message
          : "Could not load this student’s ID card."}
      </div>
    );
  }

  return (
    <ParentIdCardContent
      key={activeChildId}
      card={query.data}
      qrOpen={qrOpen}
      setQrOpen={setQrOpen}
      showChildSwitcher
    />
  );
}

function ParentIdCardContent({
  card,
  qrOpen,
  setQrOpen,
  showChildSwitcher = false,
}: {
  card: ConnectIdCardViewModel;
  qrOpen: boolean;
  setQrOpen: (open: boolean) => void;
  showChildSwitcher?: boolean;
}) {
  const verifyUrl = useStudentQrUrl(card.id);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Digital ID Card"
        subtitle="Scan the QR from any phone to open the school identity page — no login needed."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setQrOpen(true)}>
              <QrCode className="size-4" /> QR Preview
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              className="gap-2 rounded-xl shadow-glow"
              onClick={() => {
                const { filename } = downloadStudentIdCardToDevice(card);
                toast.success("Saved to Downloads", { description: filename });
              }}
            >
              <Download className="size-4" /> Save
            </Button>
          </div>
        }
      />

      <IdCardScanUrlHint />

      {showChildSwitcher ? (
        <div className="mb-4">
          <ChildSwitcher />
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-8">
        <div className="flex min-w-0 justify-center lg:sticky lg:top-6">
          <IdCardVisual
            instituteName={card.institute}
            name={card.name}
            initials={card.initials}
            className={card.className}
            section={card.section}
            rollNo={card.rollNo}
            sid={card.displayId}
            address={card.address}
            validTill={card.validTill}
            qrPayload={verifyUrl}
            onQrClick={() => setQrOpen(true)}
            photoUrl={card.photoDataUrl}
          />
        </div>

        <IdCardDetailsPanel details={card} />
      </div>

      <IdCardQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        verifyUrl={verifyUrl}
        studentId={card.id}
        displayId={card.displayId}
        name={card.name}
        rollNo={card.rollNo}
      />
    </div>
  );
}

function ParentIdCardDemoPage() {
  const { activeChildId } = useApp();
  const sync = useStudentIdCardSync();
  const [qrOpen, setQrOpen] = useState(false);
  const child = allChildren.find((c) => c.id === activeChildId) ?? allChildren[0];

  const mappedStu =
    CONNECT_LEARNER_TO_STUDENT_ID[child.id] ??
    CONNECT_LEARNER_TO_STUDENT_ID[`S-${2040 + allChildren.indexOf(child)}`];
  const legacyId = `S-${2040 + allChildren.indexOf(child)}`;
  const syncRow =
    (mappedStu ? findIdCardSyncRow(mappedStu, sync) : null) ??
    findIdCardSyncRow(child.id, sync) ??
    findIdCardSyncRow(legacyId, sync);

  const card: ConnectIdCardViewModel = syncRow
    ? idCardViewFromSyncRow(syncRow)
    : {
        name: child.name,
        initials: child.initials || getInitials(child.name, 2),
        className: child.className,
        section: child.section,
        rollNo: child.rollNo,
        id: mappedStu ?? legacyId,
        displayId: legacyId,
        bloodGroup: "—",
        emergencyContact: "—",
        parentName: "—",
        house: "—",
        issuedOn: "—",
        validTill: "—",
        institute: "Test1School",
        address: CHILD_ADDRESSES[child.id] ?? "—",
        fromAdmin: false,
      };

  return (
    <ParentIdCardContent
      key={activeChildId}
      card={card}
      qrOpen={qrOpen}
      setQrOpen={setQrOpen}
      showChildSwitcher
    />
  );
}
