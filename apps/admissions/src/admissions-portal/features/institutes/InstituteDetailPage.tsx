/**
 * Institute detail route layout — browse + panel composition.
 * Kept separate from InstituteDetailPanel to avoid a circular import with InstitutesBrowsePage.
 */
import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { getInstituteById } from "@/lib/institutes-data";
import { InstituteDetailPanel } from "./InstituteDetailPanel";
import { InstitutesBrowsePage } from "./InstitutesBrowsePage";

export function InstituteDetailPage({ instituteId }: { instituteId: string }) {
  const institute = getInstituteById(instituteId);

  if (!institute) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Institute not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/institutes">Browse institutes</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <InstitutesBrowsePage selectedId={instituteId} />
      </div>
      <div className="lg:hidden">
        <AdmissionsPageHeader
          title={institute.name}
          subtitle={`${institute.city}, ${institute.state}`}
          backTo="/institutes"
        />
        <InstituteDetailPanel institute={institute} />
      </div>
    </>
  );
}
