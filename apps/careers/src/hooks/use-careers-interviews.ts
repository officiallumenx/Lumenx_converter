import { useMemo } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { getInterviewsFromApplications } from "@/lib/careers/interviews";
import { getInterviewsForUser } from "@/lib/careers/repositories";
import { useCareersApplications } from "@/hooks/use-careers-applications";

export function useCareersInterviews() {
  const { user } = useCareersAuth();
  const { applications, loading, errorMessage } = useCareersApplications({
    scope: "candidate",
  });

  const interviews = useMemo(() => {
    if (!user) return [];
    if (isApiAuthMode()) {
      return getInterviewsFromApplications(applications);
    }
    return getInterviewsForUser(user.id);
  }, [applications, user]);

  return {
    interviews,
    loading: isApiAuthMode() ? loading : false,
    errorMessage,
  };
}
