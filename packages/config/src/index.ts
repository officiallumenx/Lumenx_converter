export const APP_NAMES = {
  connect: "LumenX Connect",
  admin: "LumenX Admin",
  nexus: "LumenX Nexus",
  transport: "LumenX Transport",
} as const;

export { PLANS, MODULE_IDS, type Plan } from "./module-ids";

export const NPM_SCOPE = "@lumenx";

export { MODULE_REGISTRY, isModuleEnabled, type ModuleDefinition, type OwnerApp } from "./modules";
