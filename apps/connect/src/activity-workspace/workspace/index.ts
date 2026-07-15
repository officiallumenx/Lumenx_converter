export {
  ACTIVITY_WORKSPACE_MODULES,
  ACTIVITY_WORKSPACE_LANDING,
  isActivityLandingModule,
  getActivityWorkspaceModule,
} from "./modules";
export type { ActivityWorkspaceModule } from "./modules";

import { ACTIVITY_WORKSPACE_MODULES } from "./modules";

/** Primary workspace modules (excludes legacy routes). */
export const ACTIVITY_WORKSPACE_PRIMARY_MODULES = ACTIVITY_WORKSPACE_MODULES.filter(
  (m) => m.role !== "legacy",
);
