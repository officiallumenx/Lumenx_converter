export type InstituteSettingsDto = {
  instituteId: string;
  timezone: string;
  locale: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type InstituteProfileLoadStatus =
  | "demo"
  | "ready"
  | "needs_institute"
  | "forbidden"
  | "error";
