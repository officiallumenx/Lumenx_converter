import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardBody,
  PageStack,
  Pill,
  SearchInput,
} from "@lumenx/ui-admin";
import { loadStudentDirectory, type StudentDirectoryRecord } from "@/lib/student-directory-store";
import { getGeneratedDocuments } from "@/lib/template-management/store";
import { certificatesForStudent } from "@/lib/template-management/student-certificates";
import { useTemplateStore } from "@/components/templates/useTemplateStore";
import { ArrowLeft, FileCheck, User } from "lucide-react";

function StudentCertificateList({
  student,
  docs,
  onBack,
}: {
  student: StudentDirectoryRecord;
  docs: ReturnType<typeof certificatesForStudent>;
  onBack: () => void;
}) {
  return (
    <PageStack>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-3.5" /> All students
        </Button>
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">
            {student.firstName} {student.surname}
          </h2>
          <p className="text-xs text-muted-foreground">
            {student.grade}
            {student.admissionNumber ? ` · ${student.admissionNumber}` : ""}
          </p>
        </div>
        <Link to="/templates" search={{ view: "generate" }} className="ml-auto">
          <Button size="sm" variant="primary">
            <FileCheck className="size-3.5" /> Issue certificate
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          {docs.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-medium">No certificates for this student yet</p>
              <p className="text-xs text-muted-foreground">Issue a certificate from the Issue tab.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {docs.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.templateName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {doc.kind.replace("_", " ")} · {doc.generatedAt.slice(0, 10)}
                      {doc.certificateNumber ? ` · ${doc.certificateNumber}` : ""}
                    </p>
                  </div>
                  <Pill
                    tone={
                      doc.workflowState === "published"
                        ? "success"
                        : doc.workflowState === "rejected"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {doc.workflowState.replace("_", " ")}
                  </Pill>
                  <Pill tone="neutral">v{doc.versionNumber}</Pill>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </PageStack>
  );
}

export function CertificateStudentsView() {
  const revision = useTemplateStore();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [students, setStudents] = useState(() => loadStudentDirectory());
  const generated = useMemo(() => getGeneratedDocuments(), [revision, students]);

  useEffect(() => {
    const reload = () => setStudents(loadStudentDirectory());
    window.addEventListener("lumenx-demo-profile-change", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("lumenx-demo-profile-change", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return students;
    return students.filter((s) => {
      const hay = [
        s.firstName,
        s.surname,
        s.name,
        s.grade,
        s.admissionNumber,
        s.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [students, q]);

  const selected = selectedId ? students.find((s) => s.id === selectedId) ?? null : null;

  if (selected) {
    return (
      <StudentCertificateList
        student={selected}
        docs={certificatesForStudent(selected, generated)}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <PageStack>
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-sm font-semibold">Student records</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Open a student to see certificates issued for them.
          </p>
        </div>
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students…"
          className="w-full sm:w-64"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No students found</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((s) => {
                const count = certificatesForStudent(s, generated).length;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-surface-hover/60 transition-colors"
                    >
                      <span className="size-9 rounded-full bg-muted border border-border grid place-items-center shrink-0">
                        <User className="size-4 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">
                          {s.firstName} {s.surname}
                        </span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {s.grade}
                          {s.admissionNumber ? ` · ${s.admissionNumber}` : ""}
                        </span>
                      </span>
                      <Pill tone={count > 0 ? "success" : "neutral"}>
                        {count} certificate{count === 1 ? "" : "s"}
                      </Pill>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </PageStack>
  );
}
