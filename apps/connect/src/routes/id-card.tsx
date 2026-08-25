import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { PageHeader } from "@/components/app/PageHeader";
import { IdCardDetailsPanel, IdCardQrDialog, IdCardVisual } from "@/components/app/id-card";
import { IdCardScanUrlHint, useStudentQrUrl } from "@/components/app/id-card/useStudentQrUrl";
import { Button } from "@lumenx/ui";
import { children as allChildren } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { StudentIdCardPage } from "@/student-portal";
import {
  findIdCardSyncRow,
  idCardViewFromSyncRow,
  useStudentIdCardSync,
  type ConnectIdCardViewModel,
} from "@/lib/student/admin-id-card-bridge";
import { CONNECT_LEARNER_TO_STUDENT_ID, getInitials } from "@lumenx/utils";
import { Printer, Download, QrCode } from "lucide-react";
import { toast } from "sonner";
import { downloadStudentIdCardToDevice } from "@/lib/device-file-downloads";

export const Route = createFileRoute("/id-card")({
  head: () => ({
    meta: [
      { title: "Digital ID Card — LumenX Connect" },
      {
        name: "description",
        content: "Wallet-style digital student identity card with QR code.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <IdCardRoute />
    </AppShell>
  ),
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
        bloodGroup: "—",
        emergencyContact: "—",
        parentName: "—",
        house: "—",
        issuedOn: "—",
        validTill: "—",
        institute: "LumenX Academy",
        address: CHILD_ADDRESSES[child.id] ?? "—",
        fromAdmin: false,
      };

  const verifyUrl = useStudentQrUrl(card.id);

  return (
    <div className="min-w-0 max-w-full" key={activeChildId}>
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

      <div className="mb-4">
        <ChildSwitcher />
      </div>

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
