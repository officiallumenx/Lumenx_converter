import type { InstituteRegistrationApplication } from "@lumenx/utils";
import type { InstituteRegistrationDto } from "./types";

function referenceIdFromRegistration(id: string): string {
  const compact = id.replace(/-/g, "").toUpperCase();
  return `LX-REG-${compact.slice(0, 8)}`;
}

/** Map backend DTO to the shared Nexus UI application shape. */
export function mapRegistrationDtoToApplication(
  dto: InstituteRegistrationDto,
): InstituteRegistrationApplication {
  const payload = dto.payload;
  return {
    id: dto.id,
    referenceId: referenceIdFromRegistration(dto.id),
    status: dto.status,
    payload: {
      instituteName: payload.instituteName,
      logoPreview: payload.logoPreview ?? "",
      instituteType: payload.instituteType ?? "",
      educationBoard: payload.educationBoard ?? "",
      country: payload.country ?? "",
      state: payload.state ?? "",
      district: payload.district ?? "",
      city: payload.city ?? "",
      address: payload.address ?? "",
      pincode: payload.pincode ?? "",
      website: payload.website ?? "",
      principalName: payload.principalName ?? dto.applicantName,
      principalEmail: payload.principalEmail ?? dto.email,
      principalMobile: payload.principalMobile ?? dto.phone ?? "",
      principalDesignation: payload.principalDesignation ?? "Principal",
      employeeId: payload.employeeId ?? "",
    },
    emailVerified: true,
    mobileVerified: Boolean(dto.phone?.trim()),
    submittedAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    reviewedAt: dto.reviewedAt ?? undefined,
    reviewedBy: dto.reviewedBy ?? undefined,
    rejectionReason: dto.rejectionReason ?? undefined,
    approvedInstituteId: dto.instituteId ?? undefined,
  };
}
