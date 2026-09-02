export { apiSignInWithPassword, apiSignOut, hydrateApiTransportSession } from "./api-auth";
export type { ApiTransportSession } from "./api-auth";
export type { TransportAuthMode } from "./auth-mode";
export {
  findDriverByPhone,
  formatIndianMobile,
  isValidIndianMobile,
  isValidTransportOtp,
  normalizeIndianMobile,
} from "./demo-drivers";
export type { DemoDriver } from "./demo-drivers";
export { TransportAuthProvider, useTransportAuth } from "./transport-auth";
export type { TransportSessionUser } from "./transport-auth";
export { useOtpAutofill } from "./use-otp-autofill";
