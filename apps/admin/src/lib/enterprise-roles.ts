/** Enterprise role capability matrix (demo reference). */

export type Capability = "view" | "create" | "edit" | "approve" | "publish";

export type EnterpriseRole = {
  id: string;
  name: string;
  capabilities: Record<Capability, boolean>;
};

export const CAPABILITY_LABELS: Record<Capability, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  approve: "Approve",
  publish: "Publish",
};

export const ENTERPRISE_ROLES: EnterpriseRole[] = [
  {
    id: "principal",
    name: "Principal",
    capabilities: { view: true, create: true, edit: true, approve: true, publish: true },
  },
  {
    id: "vp",
    name: "Vice Principal",
    capabilities: { view: true, create: true, edit: true, approve: true, publish: true },
  },
  {
    id: "coordinator",
    name: "Coordinator",
    capabilities: { view: true, create: true, edit: true, approve: false, publish: false },
  },
  {
    id: "admissions",
    name: "Admissions Officer",
    capabilities: { view: true, create: true, edit: true, approve: true, publish: false },
  },
  {
    id: "hr",
    name: "HR",
    capabilities: { view: true, create: true, edit: true, approve: true, publish: false },
  },
  {
    id: "accountant",
    name: "Accountant",
    capabilities: { view: true, create: true, edit: true, approve: false, publish: false },
  },
  {
    id: "transport",
    name: "Transport Manager",
    capabilities: { view: true, create: true, edit: true, approve: true, publish: true },
  },
  {
    id: "academic",
    name: "Academic Faculty",
    capabilities: { view: true, create: true, edit: true, approve: false, publish: false },
  },
  {
    id: "sports",
    name: "Sports Faculty",
    capabilities: { view: true, create: true, edit: false, approve: false, publish: false },
  },
  {
    id: "lab",
    name: "Lab Faculty",
    capabilities: { view: true, create: true, edit: true, approve: false, publish: false },
  },
];
