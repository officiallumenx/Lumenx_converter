import { useState } from "react";
import { getInitials } from "@lumenx/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { IdCardDetailsPanel, IdCardQrDialog, IdCardVisual } from "@/components/app/id-card";
import { IdCardScanUrlHint, useStudentQrUrl } from "@/components/app/id-card/useStudentQrUrl";
import { useApp } from "@/lib/app-state";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { studentProfile } from "@/lib/mock-data";
import { Button } from "@lumenx/ui";
import { Printer, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/student-portal/shared/ui";

export { IdCardVisual } from "@/components/app/id-card";

export function StudentIdCardPage() {
  const { user } = useApp();
  const portal = useStudentPortal();
  const [qrOpen, setQrOpen] = useState(false);

  if (!portal.isStudent) return <PageSkeleton rows={5} />;
  if (portal.isLoading || !portal.snapshot) return <PageSkeleton rows={5} />;

  const profile = portal.snapshot.profile;
  const displayName = user?.name ?? profile.name;
  const initials = getInitials(displayName, 2);

  const card = {
    name: displayName,
    initials,
    className: profile.class,
    section: profile.section,
    rollNo: profile.rollNo,
    id: profile.id,
    bloodGroup: profile.bloodGroup,
    emergencyContact: profile.emergencyContact,
    parentName: profile.parentName,
    house: profile.house,
    issuedOn: profile.idCardIssuedOn,
    validTill: profile.idCardValidTill,
    institute: profile.institute,
    address: profile.address ?? studentProfile.address,
  };

  return <StudentIdCardContent card={card} qrOpen={qrOpen} setQrOpen={setQrOpen} />;
}

function StudentIdCardContent({
  card,
  qrOpen,
  setQrOpen,
}: {
  card: {
    name: string;
    initials: string;
    className: string;
    section: string;
    rollNo: string;
    id: string;
    bloodGroup: string;
    emergencyContact: string;
    parentName: string;
    house: string;
    issuedOn: string;
    validTill: string;
    institute: string;
    address: string;
  };
  qrOpen: boolean;
  setQrOpen: (open: boolean) => void;
}) {
  const verifyUrl = useStudentQrUrl(card.id);

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Digital ID Card"
        subtitle="Scan the QR from any phone to open the full student profile — no login needed."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="student-primary-action gap-2 rounded-xl" onClick={() => setQrOpen(true)}>
              <QrCode className="size-4" /> QR Preview
            </Button>
            <Button variant="outline" className="student-primary-action gap-2 rounded-xl" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              className="student-primary-action gap-2 rounded-xl shadow-glow"
              onClick={() => toast.success("Saved to device wallet (demo)")}
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
