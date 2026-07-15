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
import { Printer, Download, QrCode } from "lucide-react";
import { toast } from "sonner";

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
  const [qrOpen, setQrOpen] = useState(false);
  const child = allChildren.find((c) => c.id === activeChildId) ?? allChildren[0];

  const studentId = `S-${2040 + allChildren.indexOf(child)}`;
  const verifyUrl = useStudentQrUrl(studentId);

  const profile = {
    name: child.name,
    initials: child.initials,
    className: child.className,
    section: child.section,
    rollNo: child.rollNo,
    id: studentId,
    bloodGroup: "O+",
    emergencyContact: "+91 98•••••12",
    parentName: "Rajesh Sharma",
    house: "Sapphire",
    issuedOn: "01 Apr 2024",
    validTill: "31 Mar 2025",
    institute: "LumenX Academy",
    address: CHILD_ADDRESSES[child.id] ?? "12 Green Park Road, Sector 4, Hyderabad — 500032",
  };

  return (
    <div className="min-w-0 max-w-full" key={activeChildId}>
      <PageHeader
        title="Digital ID Card"
        subtitle="Scan the QR from any phone to open the full student profile — no login needed."
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
              onClick={() => toast.success("Saved to device wallet (demo)")}
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
            instituteName={profile.institute}
            name={profile.name}
            initials={profile.initials}
            className={profile.className}
            section={profile.section}
            rollNo={profile.rollNo}
            sid={profile.id}
            address={profile.address}
            validTill={profile.validTill}
            qrPayload={verifyUrl}
            onQrClick={() => setQrOpen(true)}
          />
        </div>

        <IdCardDetailsPanel details={profile} />
      </div>

      <IdCardQrDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        verifyUrl={verifyUrl}
        studentId={profile.id}
        name={profile.name}
        rollNo={profile.rollNo}
      />
    </div>
  );
}
