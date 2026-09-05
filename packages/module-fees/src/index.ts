import { MODULE_IDS } from "@lumenx/config/module-ids";

export const MODULE_ID = MODULE_IDS.fees;
export const MIN_PLAN = "plus" as const;
export const OWNER_APP = "admin" as const;
export const MODULE_NAME = "Fees";

export type {
  FeeCategoryDef,
  FeeCategoryKey,
  FeeLineItem,
  FeesSnapshot,
  ClassFeeAmounts,
  PublishScope,
  PublishState,
  ResolveStudentInput,
  StudentFeeOverride,
  FeePaymentMethod,
  FeePaymentRecord,
  FeeAccountStatus,
} from "./types";

export {
  CORE_CATEGORY_IDS,
  ADMIN_CLASS_KEYS,
  CONNECT_CLASS_KEYS,
  FEES_STORAGE_KEY,
  createSeedFeesSnapshot,
  compareClassKeys,
  listKnownClassKeys,
  ensureClassDefaults,
} from "./seed";

export {
  isPublished,
  getDefaultsForClass,
  resolveChildFeeLines,
  formatInr,
  getStudentFeeAccount,
  summarizeFeesOverview,
} from "./resolve";

export type { FeesOverviewTotals, StudentFeeAccount } from "./resolve";

export {
  loadFeesSnapshot,
  saveFeesSnapshot,
  resetFeesSnapshot,
  setClassDefaultAmount,
  upsertCustomCategory,
  removeCategory,
  publishFees,
  unpublishFees,
  setStudentOverride,
  clearStudentOverride,
  setTransportStopFee,
  setTransportStopFeesBatch,
  syncClassKeysFromDirectory,
  recordOfficePayment,
  voidOfficePayment,
} from "./store";

export { buildFeeReceiptText, downloadFeeReceipt, printFeeReceipt } from "./receipt";

export { FEES_UPDATED_EVENT, subscribeFeesUpdates } from "./subscribe";
