export {
  assertInstituteAccess,
  assertInstituteMember,
  requireInstituteId,
} from "./tenant.js";
export {
  assertPlatformOperator,
  assertPlatformRoles,
  assertInstituteRoles,
  actorHasInstituteRole,
} from "./rbac.js";
export {
  resolveTeachersForInstitute,
  requireTeacherIdentity,
  assertTeacherAssigned,
} from "./teacher.js";
