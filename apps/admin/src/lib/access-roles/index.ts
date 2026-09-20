export type {
  AccessAssigneeDto,
  AccessPermission,
  AccessRoleDto,
  CreateAccessAssigneeInput,
  CreateAccessRoleInput,
  EffectivePermissionsDto,
  UpdateAccessAssigneeInput,
  UpdateAccessRoleInput,
} from "./types";

export {
  completeStaffPasswordReset,
  completeStaffPinReset,
  createAccessAssignee,
  createAccessRole,
  deleteAccessAssignee,
  deleteAccessRole,
  fetchMyAccessPermissions,
  listAccessAssignees,
  listAccessRoles,
  listStaffLoginInstitutes,
  requestStaffLoginOtp,
  requestStaffPasswordResetOtp,
  requestStaffPinResetOtp,
  resolveStaffLoginMode,
  updateAccessAssignee,
  updateAccessRole,
  verifyStaffChannelOtp,
  verifyStaffLogin,
  verifyStaffPasswordLogin,
  verifyStaffPasswordResetOtp,
  verifyStaffPinResetOtp,
} from "./api";

export type { StaffLoginInstituteDto } from "./api";

export {
  clearApiAccessState,
  getApiAccessRevision,
  getApiAccessState,
  getApiRolePermission,
  subscribeApiAccess,
  syncApiAccessPermissions,
} from "./runtime-permissions";
