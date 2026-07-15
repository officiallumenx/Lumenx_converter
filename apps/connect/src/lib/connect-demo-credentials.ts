import { DEMO_CONNECT_OTP, DEMO_CONNECT_PASSWORD } from "@lumenx/auth";

/** Demo teacher with Subject + Activity portal access (dual_role). */
export const DUAL_ROLE_DEMO_TEACHER = {
  id: "T-1042",
  name: "Ananya Iyer",
  /** Digits only — matches PhoneInput for India (+91). */
  phone: "9876543210",
  employeeId: "EMP-2024-1042",
  assignmentType: "dual_role" as const,
  subjects: "Mathematics",
  classes: "10-B, 10-A, 9-A, 8-C",
};

export const CONNECT_DEMO_PASSWORD = DEMO_CONNECT_PASSWORD;
export const CONNECT_DEMO_OTP = DEMO_CONNECT_OTP;
