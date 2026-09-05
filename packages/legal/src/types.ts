export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

export type LumenxAppId =
  | "platform"
  | "admin"
  | "nexus"
  | "connect"
  | "admissions"
  | "careers"
  | "transport";
