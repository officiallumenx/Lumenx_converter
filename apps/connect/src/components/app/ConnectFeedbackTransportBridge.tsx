import { useEffect } from "react";
import { setLumenXFeedbackTransport } from "@lumenx/utils";
import { isApiAuthMode } from "@/auth/auth-mode";
import { getConnectApiClient } from "@/lib/connect-api";
import { useApp } from "@/lib/app-state";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ConnectFeedbackTransportBridge() {
  const { activeInstituteId } = useApp();

  useEffect(() => {
    if (!isApiAuthMode()) {
      setLumenXFeedbackTransport(null);
      return () => setLumenXFeedbackTransport(null);
    }

    setLumenXFeedbackTransport({
      resolveInstituteId: () =>
        activeInstituteId && UUID_RE.test(activeInstituteId.trim())
          ? activeInstituteId.trim()
          : null,
      submit: async (input) => {
        await getConnectApiClient().post("/api/v1/product-feedback", {
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
