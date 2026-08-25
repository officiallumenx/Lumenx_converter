import {
  getGrades,
  getInstituteSubjectOptions,
  getInstituteTeachers,
  getSubjectCatalog,
  reloadSubjectCatalogForProfile,
  type InstituteSubjectOption,
  type InstituteTeacher,
  type SubjectCatalogItem,
} from "@/lib/subjects-data";
import {
  loadStudentDirectory,
  saveStudentDirectory,
  STUDENTS_CHANGED_EVENT,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";
import {
  getAllTemplates,
  getGeneratedDocuments,
  getImportJobs,
  getTemplateActivity,
} from "@/lib/template-management/store";
import type {
  GeneratedDocument,
  TemplateActivity,
  TemplateImportJob,
  TemplateRecord,
} from "@/lib/template-management/types";
import {
  getMarkEntriesSnapshot,
  mutateMarkEntries,
  saveMarkEntries,
  subscribeMarkEntries,
  type MarkEntry,
} from "@/lib/marks-entry-store";
import {
  loadTransportSnapshot,
  saveTransportSnapshot,
  subscribeTransportSnapshot,
  type TransportSnapshot,
} from "@/lib/transport-store";

type DataChannel<T> = {
  load: () => T;
  query: <R>(selector: (snapshot: T) => R) => R;
  mutate: (updater: (snapshot: T) => T) => T;
  subscribe: (listener: () => void) => () => void;
};

function createDataChannel<T>(
  load: () => T,
  save: (next: T) => void,
  subscribe: (listener: () => void) => () => void,
): DataChannel<T> {
  return {
    load,
    query: (selector) => selector(load()),
    mutate: (updater) => {
      const next = updater(load());
      save(next);
      return next;
    },
    subscribe,
  };
}

const studentDirectoryChannel = createDataChannel(
  loadStudentDirectory,
  saveStudentDirectory,
  (listener) => {
    if (typeof window === "undefined") return () => {};
    const event = STUDENTS_CHANGED_EVENT;
    const onChange = () => listener();
    window.addEventListener(event, onChange);
    window.addEventListener("storage", onChange);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener("storage", onChange);
      window.removeEventListener("focus", onChange);
    };
  },
);

const marksChannel: DataChannel<MarkEntry[]> = {
  load: getMarkEntriesSnapshot,
  query: (selector) => selector(getMarkEntriesSnapshot()),
  mutate: mutateMarkEntries,
  subscribe: subscribeMarkEntries,
};

const transportChannel = createDataChannel<TransportSnapshot>(
  loadTransportSnapshot,
  saveTransportSnapshot,
  subscribeTransportSnapshot,
);

export const adminDataFacade = {
  subjects: {
    listCatalog(): SubjectCatalogItem[] {
      return getSubjectCatalog();
    },
    listTeachers(): InstituteTeacher[] {
      return getInstituteTeachers();
    },
    listGradeLabels(): readonly string[] {
      return getGrades();
    },
    listSubjectOptions(): InstituteSubjectOption[] {
      return getInstituteSubjectOptions();
    },
    reloadForProfile(): void {
      reloadSubjectCatalogForProfile();
    },
  },
  students: {
    listDirectory(): StudentDirectoryRecord[] {
      return studentDirectoryChannel.load();
    },
    saveDirectory(records: StudentDirectoryRecord[]): void {
      studentDirectoryChannel.mutate(() => records);
    },
    channel: studentDirectoryChannel,
  },
  marks: {
    listEntries(): MarkEntry[] {
      return marksChannel.load();
    },
    channel: marksChannel,
  },
  transport: {
    getSnapshot(): TransportSnapshot {
      return transportChannel.load();
    },
    saveSnapshot(snapshot: TransportSnapshot): void {
      transportChannel.mutate(() => snapshot);
    },
    channel: transportChannel,
  },
  templates: {
    listTemplates(): TemplateRecord[] {
      return getAllTemplates();
    },
    listGeneratedDocuments(): GeneratedDocument[] {
      return getGeneratedDocuments();
    },
    listActivity(): TemplateActivity[] {
      return getTemplateActivity();
    },
    listImports(): TemplateImportJob[] {
      return getImportJobs();
    },
  },
};
