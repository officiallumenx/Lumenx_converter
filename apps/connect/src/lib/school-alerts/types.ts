export type PortalSchoolAlertDto = {
  id: string;
  instituteId: string;
  title: string;
  summary: string;
  detail: string;
  severity: "mandatory" | "emergency";
  category: string;
  source: string;
  studentId: string | null;
  childName: string | null;
  time: string;
  unread: boolean;
  acknowledged: boolean;
};
