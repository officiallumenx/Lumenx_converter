export {
  assertInstituteAccess,
  assertInstituteMember,
  requireInstituteId,
} from "./tenant.js";
export {
  assertPlatformOperator,
  assertInstituteRoles,
  actorHasInstituteRole,
} from "./rbac.js";
export {
  resolveTeachersForInstitute,
  requireTeacherIdentity,
  assertTeacherAssigned,
} from "./teacher.js";
