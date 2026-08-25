import { afterEach, describe, expect, it } from "vitest";
import { getBlobAssetAsDataUrl, resetBlobAssetMemory } from "@/lib/blob-asset-store";
import {
  hydrateStudentMedia,
  persistStudentMedia,
  slimStudentForPersist,
} from "@/lib/student-media";
import type { StudentDirectoryRecord } from "@/lib/student-directory-store";

const TINY_GIF =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function sampleStudent(): StudentDirectoryRecord {
  return {
    id: "STU-1999",
    name: "Test Student",
    firstName: "Test",
    surname: "Student",
    grade: "10-A",
    attendance: 100,
    gpa: 0,
    status: "active",
    accessStatus: "active",
    parent: "Parent",
    parentName: "Parent",
    parentPhone: "9876543210",
    address: "Address",
    gender: "Female",
    photoDataUrl: TINY_GIF,
    admissionDocuments: [
      {
        id: "doc-1",
        sourceApplicationId: "app-1",
        sourceDocumentId: "src-1",
        type: "birth_certificate",
        label: "Birth certificate",
        fileName: "birth.html",
        status: "uploaded",
        movedAt: "2026-01-01T00:00:00.000Z",
        purgeAdmissionCopyAt: "2026-02-01T00:00:00.000Z",
        previewDataUrl: "data:text/plain;base64,aGVsbG8=",
      },
    ],
  };
}

describe("student media persistence", () => {
  afterEach(() => {
    resetBlobAssetMemory();
  });

  it("strips inline payloads from the localStorage-shaped record", () => {
    const slim = slimStudentForPersist(sampleStudent());
    expect(slim.photoDataUrl).toBeUndefined();
    expect(slim.admissionDocuments?.[0]?.previewDataUrl).toBe("");
  });

  it("stores inline photos and document previews, then hydrates them back", async () => {
    const persisted = await persistStudentMedia(sampleStudent());
    expect(persisted.photoAssetId).toMatch(/^student-photo:/);
    expect(persisted.admissionDocuments?.[0]?.previewAssetId).toMatch(/^student-doc:/);

    const fromStore = await getBlobAssetAsDataUrl(persisted.photoAssetId!);
    expect(fromStore?.startsWith("data:image/gif")).toBe(true);

    const slim = slimStudentForPersist(persisted);
    const hydrated = await hydrateStudentMedia(slim);
    expect(hydrated.photoDataUrl?.startsWith("data:")).toBe(true);
    expect(hydrated.admissionDocuments?.[0]?.previewDataUrl.startsWith("data:")).toBe(true);
  });
});
