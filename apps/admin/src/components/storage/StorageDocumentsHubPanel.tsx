import { Link } from "@tanstack/react-router";
import { Button, Card, CardHeader } from "@lumenx/ui-admin";
import { FileText, FolderOpen } from "lucide-react";

export function StorageDocumentsHubPanel() {
  return (
    <Card>
      <CardHeader
        title="Document registry moved"
        hint="Storage documents registry is not available here in API mode"
      />
      <div className="px-5 pb-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          The legacy storage documents registry was a demo-only surface. In API mode,
          document templates, generation, and publishing are managed in the dedicated
          Documents module.
        </p>
        <Link to="/documents">
          <Button variant="primary">
            <FolderOpen className="size-4" /> Open Documents module
          </Button>
        </Link>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          <FileText className="size-4 shrink-0 mt-0.5" />
          <span>
            File uploads for logos and general files remain on the Overview tab. Generated
            documents and templates are handled under Documents.
          </span>
        </div>
      </div>
    </Card>
  );
}
