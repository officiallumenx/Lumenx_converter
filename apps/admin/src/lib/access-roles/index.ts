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
  createAccessAssignee,
  createAccessRole,
  deleteAccessAssignee,
  deleteAccessRole,
  fetchMyAccessPermissions,
  listAccessAssignees,
  listAccessRoles,
  listStaffLoginInstitutes,
  requestStaffLoginOtp,
  resolveStaffLoginMode,
  updateAccessAssignee,
  updateAccessRole,
  verifyStaffLogin,
  verifyStaffPasswordLogin,
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
