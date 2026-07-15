import type {
  GeneratedDocument,
  MockNotification,
  PortalVisibility,
  TemplateActivity,
  TemplateImportJob,
  TemplateKind,
  TemplateRecord,
  VersionDiff,
  VersionDiffField,
  WorkflowState,
} from "./types";
import { SEED_ACTIVITY, SEED_GENERATED, SYSTEM_TEMPLATES } from "./seed-data";

const STORAGE_KEY = "lumenx_template_management";

type StoreSnapshot = {
  customTemplates: TemplateRecord[];
  generated: GeneratedDocument[];
  activity: TemplateActivity[];
  imports: TemplateImportJob[];
  favorites: string[];
};

function readStore(): StoreSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as StoreSnapshot;
    return {
      customTemplates: parsed.customTemplates ?? [],
      generated: parsed.generated ?? [...SEED_GENERATED],
      activity: parsed.activity ?? [...SEED_ACTIVITY],
      imports: parsed.imports ?? [],
      favorites: parsed.favorites ?? [],
    };
  } catch {
    return emptyStore();
  }
}

function emptyStore(): StoreSnapshot {
  return {
    customTemplates: [],
    generated: [...SEED_GENERATED],
    activity: [...SEED_ACTIVITY],
    imports: [],
    favorites: [],
  };
}

function writeStore(snapshot: StoreSnapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

let revision = 0;
const listeners = new Set<() => void>();

function notify() {
  revision += 1;
  listeners.forEach((fn) => fn());
}

export function subscribeTemplateStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTemplateStoreRevision() {
  return revision;
}

export function getAllTemplates(): TemplateRecord[] {
  const store = readStore();
  const system = SYSTEM_TEMPLATES.map((t) => ({
    ...t,
    favorite: store.favorites.includes(t.id) || t.favorite,
  }));
  const custom = store.customTemplates.map((t) => ({
    ...t,
    favorite: store.favorites.includes(t.id) || t.favorite,
  }));
  return [...system, ...custom];
}

export function getTemplateById(id: string): TemplateRecord | undefined {
  return getAllTemplates().find((t) => t.id === id);
}

export function getGeneratedDocuments(): GeneratedDocument[] {
  return readStore().generated;
}

export function getTemplateActivity(): TemplateActivity[] {
  return readStore().activity;
}

export function getImportJobs(): TemplateImportJob[] {
  return readStore().imports;
}

export function toggleTemplateFavorite(id: string) {
  const store = readStore();
  const set = new Set(store.favorites);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  writeStore({ ...store, favorites: [...set] });
  notify();
}

export function duplicateTemplate(source: TemplateRecord): TemplateRecord {
  const store = readStore();
  const copy: TemplateRecord = {
    ...source,
    id: `tpl-custom-${Date.now().toString(36)}`,
    name: `${source.name} (copy)`,
    source: "custom",
    status: "draft",
    usageCount: 0,
    version: 1,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    blocks: source.blocks.map((b) => ({ ...b, id: `${b.id}-copy-${Date.now()}` })),
    layoutMode: source.layoutMode,
    visualTheme: source.visualTheme,
    visualFields: source.visualFields ? { ...source.visualFields } : undefined,
  };
  const activity: TemplateActivity = {
    id: `act-${Date.now()}`,
    action: "duplicated",
    templateName: copy.name,
    detail: `From ${source.name}`,
    at: new Date().toISOString(),
    actor: "Admin User",
  };
  writeStore({
    ...store,
    customTemplates: [...store.customTemplates, copy],
    activity: [activity, ...store.activity].slice(0, 50),
  });
  notify();
  return copy;
}

export function archiveTemplate(id: string) {
  const store = readStore();
  const customTemplates = store.customTemplates.map((t) =>
    t.id === id ? { ...t, status: "archived" as const } : t,
  );
  const tpl = customTemplates.find((t) => t.id === id);
  const activity: TemplateActivity = {
    id: `act-${Date.now()}`,
    action: "archived",
    templateName: tpl?.name ?? id,
    at: new Date().toISOString(),
    actor: "Admin User",
  };
  writeStore({
    ...store,
    customTemplates,
    activity: [activity, ...store.activity].slice(0, 50),
  });
  notify();
}

export function saveCustomTemplate(template: TemplateRecord): TemplateRecord {
  const store = readStore();
  const exists = store.customTemplates.some((t) => t.id === template.id);
  const customTemplates = exists
    ? store.customTemplates.map((t) => (t.id === template.id ? template : t))
    : [...store.customTemplates, template];
  const activity: TemplateActivity = {
    id: `act-${Date.now()}`,
    action: exists ? "edited" : "created",
    templateName: template.name,
    at: new Date().toISOString(),
    actor: "Admin User",
  };
  writeStore({
    ...store,
    customTemplates,
    activity: [activity, ...store.activity].slice(0, 50),
  });
  notify();
  return template;
}

export function addImportJob(job: TemplateImportJob) {
  const store = readStore();
  writeStore({ ...store, imports: [job, ...store.imports] });
  notify();
}

// ─── Workflow helpers ─────────────────────────────────────────────────────────

/** Returns the next workflow state, or null if already terminal. */
export function getNextWorkflowState(kind: TemplateKind, current: WorkflowState): WorkflowState | null {
  if (current === "published" || current === "rejected") return null;
  if (kind === "report") {
    const REPORT_FLOW: WorkflowState[] = ["draft", "teacher_review", "admin_review", "published"];
    const idx = REPORT_FLOW.indexOf(current);
    return idx >= 0 && idx < REPORT_FLOW.length - 1 ? REPORT_FLOW[idx + 1] : null;
  }
  // certificate, document, id_card: draft → published
  if (current === "draft") return "published";
  return null;
}

export function getNextWorkflowLabel(kind: TemplateKind, current: WorkflowState): string {
  const next = getNextWorkflowState(kind, current);
  if (!next) return "—";
  if (next === "teacher_review") return "Send for teacher review";
  if (next === "admin_review") return "Approve (teacher)";
  if (next === "published") return current === "admin_review" ? "Approve & publish" : "Publish";
  return "Advance";
}

/** Default portal visibility when publishing, per document kind. */
function defaultPortalVisibility(kind: TemplateKind): PortalVisibility {
  switch (kind) {
    case "report": return { student: true, parent: true, teacher: true };
    case "certificate": return { student: true, parent: true, teacher: false };
    case "document": return { student: true, parent: true, teacher: false };
    case "id_card": return { student: true, parent: false, teacher: false };
  }
}

/** Build mock notifications for a newly published document. */
function buildPublishNotifications(doc: GeneratedDocument, actor: string): MockNotification[] {
  const now = new Date().toISOString();
  const notifs: MockNotification[] = [];
  if (doc.portalVisibility.student) {
    notifs.push({ id: `notif-${doc.id}-s-${Date.now()}`, documentId: doc.id, documentName: doc.templateName, recipientName: doc.recipientName, recipientPortal: "student", channel: "in_app", sentAt: now, readAt: null });
  }
  if (doc.portalVisibility.parent) {
    notifs.push({ id: `notif-${doc.id}-p-${Date.now()}`, documentId: doc.id, documentName: doc.templateName, recipientName: `${doc.recipientName} (Parent)`, recipientPortal: "parent", channel: "email", sentAt: now, readAt: null });
  }
  if (doc.portalVisibility.teacher) {
    notifs.push({ id: `notif-${doc.id}-t-${Date.now()}`, documentId: doc.id, documentName: doc.templateName, recipientName: `${actor} (Teacher)`, recipientPortal: "teacher", channel: "in_app", sentAt: now, readAt: null });
  }
  return notifs;
}

/** Advance a single document through its workflow. */
export function advanceWorkflowState(id: string, actor: string, comment?: string): GeneratedDocument | null {
  const store = readStore();
  const idx = store.generated.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const doc = store.generated[idx];
  const next = getNextWorkflowState(doc.kind, doc.workflowState);
  if (!next) return doc;

  const now = new Date().toISOString();
  const isPublishing = next === "published";
  const visibility = isPublishing ? defaultPortalVisibility(doc.kind) : doc.portalVisibility;

  const updated: GeneratedDocument = {
    ...doc,
    workflowState: next,
    workflowHistory: [...doc.workflowHistory, { state: next, actor, at: now, comment }],
    ...(isPublishing && {
      publishedAt: now,
      portalVisibility: visibility,
      notificationsSent: true,
      notificationCount: Object.values(visibility).filter(Boolean).length,
      notifications: [...doc.notifications, ...buildPublishNotifications({ ...doc, portalVisibility: visibility }, actor)],
    }),
  };

  const generated = [...store.generated];
  generated[idx] = updated;
  const activity: TemplateActivity = {
    id: `act-${Date.now()}`,
    action: isPublishing ? "generated" : "edited",
    templateName: doc.templateName,
    detail: isPublishing ? `Published · ${doc.recipientName}` : `Advanced to ${next.replace("_", " ")} · ${doc.recipientName}`,
    at: now,
    actor,
  };
  writeStore({ ...store, generated, activity: [activity, ...store.activity].slice(0, 50) });
  notify();
  return updated;
}

/** Batch advance multiple documents. Returns count of successfully advanced docs. */
export function batchAdvanceWorkflow(ids: string[], actor: string, comment?: string): number {
  let count = 0;
  for (const id of ids) {
    if (advanceWorkflowState(id, actor, comment)) count++;
  }
  return count;
}

/** Reject a document at any workflow stage. */
export function rejectWorkflowDocument(id: string, actor: string, reason: string): GeneratedDocument | null {
  const store = readStore();
  const idx = store.generated.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  const doc = store.generated[idx];
  const now = new Date().toISOString();
  const updated: GeneratedDocument = {
    ...doc,
    workflowState: "rejected",
    workflowHistory: [...doc.workflowHistory, { state: "rejected", actor, at: now, comment: reason }],
    rejectionReason: reason,
  };
  const generated = [...store.generated];
  generated[idx] = updated;
  writeStore({ ...store, generated });
  notify();
  return updated;
}

/** Update portal visibility for a published document (and regenerate notifications). */
export function updatePortalVisibility(id: string, patch: Partial<PortalVisibility>): void {
  const store = readStore();
  const idx = store.generated.findIndex((d) => d.id === id);
  if (idx < 0) return;
  const doc = store.generated[idx];
  const visibility: PortalVisibility = { ...doc.portalVisibility, ...patch };
  const updated: GeneratedDocument = { ...doc, portalVisibility: visibility, notificationCount: Object.values(visibility).filter(Boolean).length };
  const generated = [...store.generated];
  generated[idx] = updated;
  writeStore({ ...store, generated });
  notify();
}

export function getPublishedDocuments(): GeneratedDocument[] {
  return getGeneratedDocuments().filter((d) => d.workflowState === "published");
}

export function getPendingWorkflowDocuments(): GeneratedDocument[] {
  return getGeneratedDocuments().filter(
    (d) => d.workflowState !== "published" && d.workflowState !== "rejected",
  );
}

// ─── Version management ───────────────────────────────────────────────────────

/** Return all versions of a document group, newest first. */
export function getDocumentVersions(groupId: string): GeneratedDocument[] {
  return getGeneratedDocuments()
    .filter((d) => d.documentGroupId === groupId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

/** Return every published document group with its current version and full history. */
export function getPublishedDocumentGroups(): {
  groupId: string;
  current: GeneratedDocument;
  versions: GeneratedDocument[];
  totalVersions: number;
}[] {
  const allPublished = getGeneratedDocuments().filter((d) => d.workflowState === "published");

  // Build a map from groupId → all versions in that group
  const groupMap = new Map<string, GeneratedDocument[]>();
  for (const doc of getGeneratedDocuments()) {
    const existing = groupMap.get(doc.documentGroupId) ?? [];
    groupMap.set(doc.documentGroupId, [...existing, doc]);
  }

  // For each group that has a current published version, return the group
  const seen = new Set<string>();
  const result: ReturnType<typeof getPublishedDocumentGroups> = [];
  for (const doc of allPublished) {
    if (!doc.isCurrentVersion || seen.has(doc.documentGroupId)) continue;
    seen.add(doc.documentGroupId);
    const versions = (groupMap.get(doc.documentGroupId) ?? []).sort((a, b) => b.versionNumber - a.versionNumber);
    result.push({ groupId: doc.documentGroupId, current: doc, versions, totalVersions: versions.length });
  }
  return result.sort((a, b) => new Date(b.current.publishedAt ?? 0).getTime() - new Date(a.current.publishedAt ?? 0).getTime());
}

/**
 * Restore a previous version as the current one for a given group.
 * The target version's `isCurrentVersion` becomes true; all other versions in
 * the group have `isCurrentVersion` set to false. Portal visibility and
 * notifications are transferred from the target version.
 */
export function restoreVersion(docId: string, actor: string, reason?: string): GeneratedDocument | null {
  const store = readStore();
  const target = store.generated.find((d) => d.id === docId);
  if (!target || target.workflowState === "draft") return null;

  const now = new Date().toISOString();
  const groupId = target.documentGroupId;

  const generated = store.generated.map((d) => {
    if (d.documentGroupId !== groupId) return d;
    if (d.id === docId) {
      // Promote this version
      return {
        ...d,
        isCurrentVersion: true,
        portalVisibility: defaultPortalVisibility(d.kind),
        workflowHistory: [
          ...d.workflowHistory,
          { state: "published" as WorkflowState, actor, at: now, comment: reason ?? `Restored to v${d.versionNumber}` },
        ],
      };
    }
    // Demote all other versions in the group
    return { ...d, isCurrentVersion: false };
  });

  const activity: TemplateActivity = {
    id: `act-${Date.now()}`,
    action: "edited",
    templateName: target.templateName,
    detail: `Restored to v${target.versionNumber} · ${target.recipientName}`,
    at: now,
    actor,
  };
  writeStore({ ...store, generated, activity: [activity, ...store.activity].slice(0, 50) });
  notify();
  return generated.find((d) => d.id === docId) ?? null;
}

/**
 * Create a new version of an existing document group.
 * The new doc starts as a draft; when published it becomes the new current version.
 */
export function createNewVersion(groupId: string, actor: string, changeNote: string): GeneratedDocument | null {
  const store = readStore();
  const versions = store.generated.filter((d) => d.documentGroupId === groupId);
  if (versions.length === 0) return null;

  const latest = versions.reduce((a, b) => (a.versionNumber > b.versionNumber ? a : b));
  const now = new Date().toISOString();
  const newVersion: GeneratedDocument = {
    ...latest,
    id: `gen-v${latest.versionNumber + 1}-${groupId.replace("grp-", "")}`,
    versionNumber: latest.versionNumber + 1,
    isCurrentVersion: false,
    workflowState: "draft",
    workflowHistory: [{ state: "draft", actor, at: now, comment: `New version: ${changeNote}` }],
    publishedAt: null,
    portalVisibility: { student: false, parent: false, teacher: false },
    notificationsSent: false,
    notificationCount: 0,
    rejectionReason: null,
    notifications: [],
    generatedAt: now,
    generatedBy: actor,
    versionChanges: changeNote,
    versionNote: "",
  };

  writeStore({ ...store, generated: [newVersion, ...store.generated] });
  notify();
  return newVersion;
}

/** Compare two versions and return a structured diff. */
export function compareVersions(idOld: string, idNew: string): VersionDiff | null {
  const all = getGeneratedDocuments();
  const older = all.find((d) => d.id === idOld);
  const newer = all.find((d) => d.id === idNew);
  if (!older || !newer) return null;

  const publisherOf = (doc: GeneratedDocument) =>
    doc.workflowHistory.filter((h) => h.state === "published").slice(-1)[0]?.actor ?? "—";

  const fields: VersionDiffField[] = [
    { field: "versionNumber", label: "Version", oldValue: `v${older.versionNumber}`, newValue: `v${newer.versionNumber}`, changed: older.versionNumber !== newer.versionNumber },
    { field: "recipientName", label: "Recipient name", oldValue: older.recipientName, newValue: newer.recipientName, changed: older.recipientName !== newer.recipientName },
    { field: "templateName", label: "Template used", oldValue: older.templateName, newValue: newer.templateName, changed: older.templateName !== newer.templateName },
    { field: "generatedBy", label: "Generated by", oldValue: older.generatedBy, newValue: newer.generatedBy, changed: older.generatedBy !== newer.generatedBy },
    { field: "publishedBy", label: "Published by", oldValue: publisherOf(older), newValue: publisherOf(newer), changed: publisherOf(older) !== publisherOf(newer) },
    { field: "publishedAt", label: "Published on", oldValue: older.publishedAt ? new Date(older.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—", newValue: newer.publishedAt ? new Date(newer.publishedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—", changed: older.publishedAt !== newer.publishedAt },
    { field: "certificateNumber", label: "Document / cert number", oldValue: older.certificateNumber ?? "—", newValue: newer.certificateNumber ?? "—", changed: older.certificateNumber !== newer.certificateNumber },
    { field: "versionChanges", label: "Changes in this version", oldValue: older.versionChanges || "Initial issue", newValue: newer.versionChanges || "Initial issue", changed: older.versionChanges !== newer.versionChanges },
    { field: "approvalSteps", label: "Approval steps", oldValue: String(older.workflowHistory.length), newValue: String(newer.workflowHistory.length), changed: older.workflowHistory.length !== newer.workflowHistory.length },
  ];

  return { older, newer, fields };
}

export type GenerateBatchParams = {
  templateId: string;
  templateName: string;
  kind: TemplateRecord["kind"];
  recipients: Array<{
    id: string;
    name: string;
    ref: string;
    certificateNumber?: string;
  }>;
  actor: string;
};

export function generateDocumentBatch(params: GenerateBatchParams): { batchId: string; count: number } {
  const store = readStore();
  const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const docs: GeneratedDocument[] = params.recipients.map((r, i) => ({
    id: `gen-${Date.now().toString(36)}-${i}`,
    templateId: params.templateId,
    templateName: params.templateName,
    kind: params.kind,
    recipientName: r.name,
    recipientRef: r.ref,
    generatedAt: now,
    generatedBy: params.actor,
    batchId,
    status: "ready",
    certificateNumber: r.certificateNumber,
    workflowState: "draft",
    workflowHistory: [{ state: "draft", actor: params.actor, at: now }],
    publishedAt: null,
    portalVisibility: { student: false, parent: false, teacher: false },
    notificationsSent: false,
    notificationCount: 0,
    rejectionReason: null,
    notifications: [],
    documentGroupId: `gen-${Date.now().toString(36)}-${i}-grp`,
    versionNumber: 1,
    isCurrentVersion: false,
    versionChanges: "",
    versionNote: "",
  }));

  const activity: TemplateActivity = {
    id: `act-${Date.now()}`,
    action: "generated",
    templateName: params.templateName,
    detail: `Batch ${batchId} · ${params.recipients.length} students`,
    at: now,
    actor: params.actor,
  };

  writeStore({
    ...store,
    generated: [...docs, ...store.generated],
    activity: [activity, ...store.activity].slice(0, 50),
  });
  notify();
  return { batchId, count: params.recipients.length };
}

export function getDashboardStats() {
  const templates = getAllTemplates().filter((t) => t.status !== "archived");
  const generated = getGeneratedDocuments();
  return {
    totalTemplates: templates.length,
    inUse: templates.filter((t) => t.usageCount > 0).length,
    generatedDocuments: generated.length,
    certificateTemplates: templates.filter((t) => t.kind === "certificate").length,
    reportTemplates: templates.filter((t) => t.kind === "report").length,
    idTemplates: templates.filter((t) => t.kind === "id_card").length,
    documentTemplates: templates.filter((t) => t.kind === "document").length,
    favorites: templates.filter((t) => t.favorite).length,
  };
}

export function getPopularTemplates(limit = 5): TemplateRecord[] {
  return [...getAllTemplates()]
    .filter((t) => t.status === "active")
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}
