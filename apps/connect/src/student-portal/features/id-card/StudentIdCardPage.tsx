import { useState } from "react";
import { getInitials, resolveCanonicalStudentId } from "@lumenx/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { IdCardDetailsPanel, IdCardQrDialog, IdCardVisual } from "@/components/app/id-card";
import { IdCardScanUrlHint, useStudentQrUrl } from "@/components/app/id-card/useStudentQrUrl";
import { useApp } from "@/lib/app-state";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { studentProfile } from "@/lib/mock-data";
import {
  findIdCardSyncRow,
  idCardViewFromSyncRow,
  useStudentIdCardSync,
  type ConnectIdCardViewModel,
} from "@/lib/student/admin-id-card-bridge";
import { Button } from "@lumenx/ui";
import { Printer, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/student-portal/shared/ui";
import { downloadStudentIdCardToDevice } from "@/lib/device-file-downloads";

export { IdCardVisual } from "@/components/app/id-card";

export function StudentIdCardPage() {
  const { user } = useApp();
  const portal = useStudentPortal();
  const sync = useStudentIdCardSync();
  const [qrOpen, setQrOpen] = useState(false);

  if (!portal.isStudent) return <PageSkeleton rows={5} />;
  if (portal.isLoading || !portal.snapshot) return <PageSkeleton rows={5} />;

  const profile = portal.snapshot.profile;
  const lookupId = resolveCanonicalStudentId(profile.id);
  const syncRow =
    !isApiAuthMode() &&
    (findIdCardSyncRow(profile.id, sync) ?? findIdCardSyncRow(lookupId, sync));

  let card: ConnectIdCardViewModel;
  if (syncRow) {
    card = idCardViewFromSyncRow(syncRow);
    // Prefer logged-in display name when present.
    if (user?.name) {
      card = { ...card, name: user.name, initials: getInitials(user.name, 2) };
    }
  } else {
    const displayName = user?.name ?? profile.name;
    card = {
      name: displayName,
      initials: getInitials(displayName, 2),
      className: profile.class,
      section: profile.section,
      rollNo: profile.rollNo,
      id: profile.id.startsWith("STU-") ? profile.id : lookupId,
      bloodGroup: profile.bloodGroup || "—",
      emergencyContact: profile.emergencyContact || "—",
      parentName: profile.parentName || "—",
      house: profile.house || "—",
      issuedOn: profile.idCardIssuedOn || "—",
      validTill: profile.idCardValidTill || "—",
      institute: profile.institute,
      address: profile.address ?? studentProfile.address ?? "—",
      fromAdmin: false,
    };
  }

  return <StudentIdCardContent card={card} qrOpen={qrOpen} setQrOpen={setQrOpen} />;
}

function StudentIdCardContent({
  card,
  qrOpen,
  setQrOpen,
}: {
  card: ConnectIdCardViewModel;
  qrOpen: boolean;
  setQrOpen: (open: boolean) => void;
}) {
  const verifyUrl = useStudentQrUrl(card.id);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Digital ID Card"
        subtitle="Scan the QR from any phone to open the school identity page — no login needed."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="student-primary-action gap-2 rounded-xl"
              onClick={() => setQrOpen(true)}
            >
              <QrCode className="size-4" /> QR Preview
            </Button>
            <Button
              variant="outline"
              className="student-primary-action gap-2 rounded-xl"
              onClick={() => window.print()}
            >
              <Printer className="size-4" /> Print
            </Button>
            <Button
              className="student-primary-action gap-2 rounded-xl shadow-glow"
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

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-8">
        <div className="flex min-w-0 justify-center lg:sticky lg:top-6">
          <IdCardVisual
            instituteName={card.institute}
            name={card.name}
            initials={card.initials}
            className={card.className}
            section={card.section}
            rollNo={card.rollNo}
            sid={card.id}
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
        name={card.name}
        rollNo={card.rollNo}
      />
    </div>
  );
}
