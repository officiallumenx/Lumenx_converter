export const APP_NAMES = {
  connect: "LumenX Connect",
  admin: "LumenX Admin",
  nexus: "LumenX Nexus",
  transport: "LumenX Transport",
} as const;

export { PLANS, MODULE_IDS, type Plan } from "./module-ids";

export const NPM_SCOPE = "@lumenx";

export { MODULE_REGISTRY, isModuleEnabled, type ModuleDefinition, type OwnerApp } from "./modules";

export {
  WORKSPACE_APPS,
  SHARED_PACKAGE_ALLOWLIST,
  CONNECT_FEATURE_PORTALS,
  modulesOwnedBy,
  type WorkspaceAppId,
} from "./architecture";

export { ADMIN_STORAGE_KEYS } from "./storage-keys";
export {
  INSTITUTE_REGISTRATION_STORAGE_KEY,
  INSTITUTE_REGISTRATION_CHANGED_EVENT,
  SUBSCRIPTION_STORAGE_KEY,
  SUBSCRIPTION_CHANGED_EVENT,
} from "./storage-keys";

export {
  NEXUS_LICENSE_STORAGE_KEY,
  NEXUS_LICENSE_LEGACY_STORAGE_KEYS,
  NEXUS_LICENSE_CHANGED_EVENT,
  NEXUS_ADMIN_BOUND_INSTITUTE_KEY,
  NEXUS_ADMIN_DEFAULT_BOUND_INSTITUTE_ID,
  getAdminBoundNexusInstituteId,
  setAdminBoundNexusInstituteId,
  readNexusModuleEntitlements,
  readNexusConnectEntitlements,
  readNexusAppEntitlements,
  applyNexusEntitlementCeiling,
  subscribeNexusLicenseChanges,
} from "./nexus-entitlement";
export type {
  NexusConnectPortalId,
  NexusPlatformAppId,
  NexusConnectPortalEntitlement,
} from "./nexus-entitlement";
