import { useMemo } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@lumenx/ui";
import { SafeQrCode } from "@/components/app/id-card/SafeQrCode";
import { StudentVerifyView } from "@/components/app/id-card/StudentVerifyView";
import { resolveStudentVerificationProfile } from "@/lib/student/id-card-qr-payload";
import { ExternalLink, Smartphone } from "lucide-react";
import { toast } from "sonner";

type IdCardQrDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verifyUrl: string;
  studentId: string;
  name: string;
  rollNo: string;
};

export function IdCardQrDialog({
  open,
  onOpenChange,
  verifyUrl,
  studentId,
  name,
  rollNo,
}: IdCardQrDialogProps) {
  const profile = useMemo(() => {
    if (!open) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return resolveStudentVerificationProfile(studentId, origin);
  }, [open, studentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col rounded-2xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>Scan ID QR</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Scan with any phone camera to open the full student profile — no login needed.
          </p>
        </DialogHeader>

        {open ? (
          <>
            <div className="overflow-y-auto px-5 py-4">
              <div className="flex flex-col items-center">
                <div className="inline-block rounded-2xl border-2 border-dashed border-slate-200 bg-white p-4 shadow-inner">
                  <SafeQrCode value={verifyUrl} size={176} />
                </div>
                <div className="mt-3 text-center">
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {studentId} · Roll {rollNo}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-primary">
                  <Smartphone className="size-3.5" />
                  Opens full profile on any mobile browser
                </div>
              </div>

              {profile ? (
                <div className="mt-5 border-t border-border pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What the other phone will see
                  </p>
                  <StudentVerifyView profile={profile} compact />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
              <Button
                className="w-full rounded-xl"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard?.writeText(verifyUrl);
                  toast.success("Profile link copied");
                }}
              >
                Copy profile link
              </Button>
              <Button className="w-full gap-2 rounded-xl" asChild>
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" />
                  Open profile page
                </a>
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
