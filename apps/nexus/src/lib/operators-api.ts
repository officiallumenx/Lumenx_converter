import { getNexusApiClient } from "@/lib/nexus-api";
import { ApiClientError } from "@/lib/api";
import type {
  NexusOperator,
  NexusOperatorStatus,
  NexusRoleId,
} from "@/lib/platform-access-store";

type OperatorDto = {
  id: string;
  userId: string;
  roleCode: NexusRoleId;
  handle: string;
  displayName: string;
  status: NexusOperatorStatus;
  createdAt: string;
  updatedAt: string;
};

export type CurrentOperatorDto = {
  userId: string;
  displayName: string;
  roleCode: NexusRoleId;
  isRoot: boolean;
};

export type ProvisionOperatorInput = {
  email: string;
  phone: string;
  temporaryPassword: string;
  roleCode: NexusRoleId;
  handle: string;
  displayName: string;
  username?: string;
  pin?: string;
};

export type ProvisionOperatorResult = {
  operator: OperatorDto;
  credentials: {
    email: string;
    phone: string;
    username: string;
    temporaryPassword: string;
    pinSet: boolean;
    firstLoginPending: true;
    requiresEmailOtp: true;
    requiresMobileOtp: true;
    requiresPasswordAndPin: true;
  };
};

function toOperator(dto: OperatorDto): NexusOperator {
  return {
    id: dto.id,
    userId: dto.userId,
    handle: dto.handle,
    displayName: dto.displayName,
    roleId: dto.roleCode,
    status: dto.status,
    lastActiveAt: dto.updatedAt,
  };
}

/** Normalize to E.164 (+91…) before calling the API. */
export function normalizeProvisionPhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  throw new ApiClientError({
    status: 400,
    code: "VALIDATION_ERROR",
    message: "Phone must be 10 digits or +countrycode… (e.g. 9876543210 or +919876543210).",
  });
}

export function formatProvisionError(cause: unknown): string {
  if (cause instanceof ApiClientError) {
    if (cause.status === 0 || cause.code === "NETWORK_ERROR") {
      return `${cause.message} Start backend with: npm run dev:api`;
    }
    if (cause.status === 401 || cause.code === "UNAUTHENTICATED") {
      return "Nexus API session unavailable. App lock does not provide API credentials.";
    }
    if (cause.status === 403 || cause.code === "FORBIDDEN") {
      return "Only Nexus Root can create operators. Your account is not nexus_root.";
    }
    if (cause.status === 409 || cause.code === "CONFLICT") {
      return cause.message || "Email, phone, or handle already exists.";
    }
    return cause.message || `Request failed (${cause.status})`;
  }
  return cause instanceof Error ? cause.message : "Provisioning failed";
}

export async function listOperatorsApi(): Promise<NexusOperator[]> {
  const rows = await getNexusApiClient().get<OperatorDto[]>("/api/nexus/operators");
  return rows.map(toOperator);
}

export function getCurrentOperatorApi(): Promise<CurrentOperatorDto> {
  return getNexusApiClient().get<CurrentOperatorDto>("/api/nexus/operators/me");
}

export async function provisionOperatorApi(
  input: ProvisionOperatorInput,
): Promise<{ operator: NexusOperator; credentials: ProvisionOperatorResult["credentials"] }> {
  const phone = normalizeProvisionPhone(input.phone);
  const data = await getNexusApiClient().post<ProvisionOperatorResult>(
    "/api/nexus/operators/provision",
    { ...input, phone, email: input.email.trim().toLowerCase() },
  );
  return { operator: toOperator(data.operator), credentials: data.credentials };
}

export async function updateOperatorApi(
  id: string,
  patch: Partial<{
    roleCode: NexusRoleId;
    status: NexusOperatorStatus;
    handle: string;
    displayName: string;
  }>,
): Promise<NexusOperator> {
  const dto = await getNexusApiClient().request<OperatorDto>(
    `/api/nexus/operators/${id}`,
    { method: "PATCH", body: patch },
  );
  return toOperator(dto);
}
