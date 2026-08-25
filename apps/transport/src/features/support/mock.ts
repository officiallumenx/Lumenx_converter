import { supportRepository } from "@/lib/transport";

/** @deprecated Prefer `supportRepository.getSnapshot()`. */
export const supportMock = supportRepository.getSnapshot();

export type { SupportFaq } from "@/lib/transport/types";
