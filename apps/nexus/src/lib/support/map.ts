import type { SupportMessageDto, SupportThreadDto } from "./types";
import type {
  SupportMessage,
  SupportThread,
} from "@/lib/support-center-store";
import { listPlatformInstitutes } from "@/lib/institute-directory-store";

export function resolveInstituteDisplayName(instituteId: string): string {
  const fromDir = listPlatformInstitutes().find((i) => i.id === instituteId);
  if (fromDir?.name) return fromDir.name;
  return `Institute ${instituteId.slice(0, 8)}…`;
}

export function supportMessageDtoToUi(dto: SupportMessageDto): SupportMessage {
  return {
    id: dto.id,
    authorRole: dto.isInternal ? "internal" : dto.authorRole,
    authorLabel: dto.authorLabel,
    body: dto.body,
    createdAt: dto.sentAt || dto.createdAt,
    internal: dto.isInternal,
  };
}

export function supportThreadDtoToUi(
  dto: SupportThreadDto,
  instituteNameById?: Map<string, string>,
): SupportThread {
  const instituteName =
    instituteNameById?.get(dto.instituteId) ??
    resolveInstituteDisplayName(dto.instituteId);
  return {
    id: dto.id,
    instituteId: dto.instituteId,
    instituteName,
    subject: dto.subject,
    category: dto.category,
    status: dto.status,
    priority: dto.priority,
    assignee: dto.assigneeHandle,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    messages: (dto.messages ?? []).map(supportMessageDtoToUi),
  };
}

export function supportThreadDtosToUi(
  rows: SupportThreadDto[],
  instituteNameById?: Map<string, string>,
): SupportThread[] {
  return rows.map((row) => supportThreadDtoToUi(row, instituteNameById));
}
