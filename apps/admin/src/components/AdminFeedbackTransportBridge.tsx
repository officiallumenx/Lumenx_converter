/**
 * Registers LumenX product-feedback API transport for Admin (API auth mode).
 */
import { useEffect } from "react";
import { setLumenXFeedbackTransport } from "@lumenx/utils";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getAdminApiClient } from "@/lib/admin-api";
import { useInstituteContext } from "@/lib/institutes";
import { isInstituteUuid } from "@/lib/active-institute";

export function AdminFeedbackTransportBridge() {
  const { activeInstituteId } = useInstituteContext();

  useEffect(() => {
    if (!isApiAuthMode()) {
      setLumenXFeedbackTransport(null);
      return () => setLumenXFeedbackTransport(null);
    }

    setLumenXFeedbackTransport({
      resolveInstituteId: () =>
        isInstituteUuid(activeInstituteId) ? activeInstituteId : null,
      submit: async (input) => {
        await getAdminApiClient().post("/api/v1/product-feedback", {
          institute_id: input.instituteId,
          source: input.source,
          kind: input.kind,
          rating: input.rating,
          message: input.message.trim(),
          screenshot_file_name: input.screenshotFileName ?? null,
        });
      },
    });

    return () => setLumenXFeedbackTransport(null);
  }, [activeInstituteId]);

  return null;
}
