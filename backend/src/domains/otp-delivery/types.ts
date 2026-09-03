/** Login OTP delivery — SMS / email providers for Phase 1 Step 1. */

export type OtpDeliveryChannel = "sms" | "email";

export type OtpDeliveryPurpose = "parent_login" | "staff_login";

export type DeliverLoginOtpInput = {
  channel: OtpDeliveryChannel;
  destination: string;
  otp: string;
  purpose: OtpDeliveryPurpose;
};

export type DeliverLoginOtpResult = {
  mode: "demo" | "live";
  provider: string;
  channel: OtpDeliveryChannel;
};
