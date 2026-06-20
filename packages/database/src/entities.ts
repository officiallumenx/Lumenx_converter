import type { Plan } from "@lumenx/config";

/** All persisted records include stable identity and audit timestamps. */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Institute-scoped data (optional branch for multi-campus). */
export interface TenantScoped {
  instituteId: string;
  branchId?: string;
}

export type EntityStatus = "active" | "inactive" | "archived";

export interface StudentEntity extends BaseEntity, TenantScoped {
  name: string;
  rollNo: string;
  className: string;
  section: string;
  guardianId?: string;
  status: EntityStatus;
  attendancePct?: number;
  gpa?: number;
}

export interface TeacherEntity extends BaseEntity, TenantScoped {
  name: string;
  employeeId: string;
  department: string;
  subjects: string[];
  status: EntityStatus;
}

export interface ParentEntity extends BaseEntity, TenantScoped {
  name: string;
  phone: string;
  email?: string;
  childIds: string[];
  status: EntityStatus;
}

export interface ClassEntity extends BaseEntity, TenantScoped {
  name: string;
  grade: string;
  section: string;
  studentCount: number;
  classTeacherId?: string;
}

export interface RouteEntity extends BaseEntity, TenantScoped {
  name: string;
  code: string;
  vehicleId?: string;
  driverId?: string;
  stopCount: number;
  status: EntityStatus;
}

export interface VehicleEntity extends BaseEntity, TenantScoped {
  registrationNo: string;
  capacity: number;
  model?: string;
  status: EntityStatus;
}

export interface DriverEntity extends BaseEntity, TenantScoped {
  name: string;
  phone: string;
  licenseNo: string;
  routeIds: string[];
  status: EntityStatus;
}

export interface InstituteEntity extends BaseEntity {
  name: string;
  code: string;
  plan: Plan;
  branchCount: number;
  studentLimit: number;
}

export type EntityName =
  | "student"
  | "teacher"
  | "parent"
  | "class"
  | "route"
  | "vehicle"
  | "driver"
  | "institute";
