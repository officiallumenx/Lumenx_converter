import { Link } from "@tanstack/react-router";
import { Card, CardBody, CardHeader, Button } from "@lumenx/ui-admin";
import { CreditCard } from "lucide-react";
import { DocGenerateApiPanel } from "@/components/documents/views/DocGenerateApiPanel";

/** ID cards live under the certificates/documents module (type id_card). */
export function CertificatesIdCardPanel({ apiMode }: { apiMode: boolean }) {
  if (apiMode) {
    return (
      <Card>
        <CardHeader
          title="ID cards"
          hint="Generate student, staff, or visitor ID cards from active id_card templates"
        />
        <CardBody>
          <DocGenerateApiPanel />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="ID cards"
        hint="Digital ID cards for students · synced to Connect /verify"
      />
      <CardBody className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Issue ID cards from the template library, then open a student profile to publish their
          digital card to Connect.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/students">
            <Button type="button" variant="primary" size="sm">
              <CreditCard className="size-3.5" /> Student profiles
            </Button>
          </Link>
          <Link to="/documents" search={{ view: "generate" }}>
            <Button type="button" variant="outline" size="sm">
              Document generator
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
