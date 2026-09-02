export {
  getAttendanceRegister,
  listAttendanceRegisters,
  assertApiMode as assertAttendanceApiMode,
} from "./api";
export {
  createAttendanceConfig,
  createAttendanceRegister,
  updateAttendanceRegister,
  submitAttendanceRegister,
  type CreateAttendanceConfigInput,
  type CreateAttendanceRegisterInput,
  type UpdateAttendanceRegisterInput,
  type AttendanceMarkInput,
} from "./mutations";
export {
  loadAttendanceRegisterDetail,
  loadAttendanceRegistersList,
  type AttendanceListStatus,
  type AttendanceRegisterDetailState,
  type AttendanceRegistersListState,
} from "./load";
export {
  resolveAttendanceRegistersListView,
  shouldCommitAttendanceRegistersLoad,
  type AttendanceRegistersListView,
} from "./list-view";
export {
  attendanceRegisterDtoToDetail,
  attendanceRegisterDtoToListItem,
  attendanceRegisterDtosToListItems,
} from "./map";
export {
  buildStudentAttendanceApiClassOptions,
  buildStudentAttendanceApiSectionOptions,
} from "./class-section-options";
export {
  loadAttendanceConfigList,
  type AttendanceConfigLoadState,
  type AttendanceConfigLoadStatus,
} from "./config-load";
export {
  resolveAttendanceConfigView,
  shouldCommitAttendanceConfigLoad,
} from "./config-view";
export {
  pickAttendanceConfigForRegister,
  slotFieldsFromMethod,
  slotFieldsFromPeriod,
  afternoonSlotFields,
  type AttendanceRegisterSlotFields,
} from "./register-create-helpers";
export type {
  AttendanceConfigDto,
  AttendanceConfigScope,
  AttendanceMarkStatus,
  AttendanceRegisterDetail,
  AttendanceRegisterListItem,
  ListAttendanceConfigParams,
} from "./types";
