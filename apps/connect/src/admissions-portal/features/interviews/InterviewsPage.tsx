import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
import { Calendar } from "lucide-react";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { EmptyState } from "@/admissions-portal/shared/ui/PageSkeleton";
export function InterviewsPage() {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <AdmissionsPageHeader title="Admissions workflow updated" subtitle="Interview stage has been removed." />
      <EmptyState
        icon={<Calendar className="size-6" />}
        title="Interviews are no longer part of Admissions"
        hint="Track your current status in My Applications."
        action={
          <Button asChild>
            <Link to="/admissions/applications">My applications</Link>
          </Button>
        }
      />
    </div>
  );
}
