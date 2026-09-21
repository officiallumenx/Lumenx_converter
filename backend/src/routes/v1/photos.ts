import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import {
  validateParams,
  validateQuery,
} from "../../validation/validate.js";
import {
  getPhotoSignedUrlForActor,
  listPhotoStudentsForActor,
  listPhotoTeachersForActor,
  uploadStudentPhotoForActor,
  uploadTeacherPhotoForActor,
} from "../../domains/photos/service.js";

const photos = new Hono<AppBindings>();
photos.use("*", requireAuth);

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

const uuid = z.string().uuid();

photos.get("/teachers", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      q: z.string().max(200).optional(),
    }),
    c.req.query(),
  );
  const data = await listPhotoTeachersForActor(admin, actor, {
    instituteId: query.institute_id,
    q: query.q,
  });
  return c.json({ data });
});

photos.get("/students", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      class_id: uuid,
      section_id: uuid,
      q: z.string().max(200).optional(),
    }),
    c.req.query(),
  );
  const data = await listPhotoStudentsForActor(admin, actor, {
    instituteId: query.institute_id,
    classId: query.class_id,
    sectionId: query.section_id,
    q: query.q,
  });
  return c.json({ data });
});

photos.get("/signed-url", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      kind: z.enum(["student", "teacher"]),
      id: uuid,
    }),
    c.req.query(),
  );
  const data = await getPhotoSignedUrlForActor(admin, actor, {
    kind: query.kind,
    id: query.id,
  });
  return c.json({ data });
});

async function readMultipartFile(c: {
  req: { parseBody: () => Promise<Record<string, unknown>> };
}): Promise<{
  fileName: string;
  contentType: string;
  byteSize: number;
  body: ArrayBuffer;
}> {
  const form = await c.req.parseBody();
  const file = form["file"];
  if (!file || typeof file === "string") {
    throw AppError.validation("File is required", { file: ["Required"] });
  }
  const blob = file as File;
  const body = await blob.arrayBuffer();
  return {
    fileName: blob.name || "photo.jpg",
    contentType: blob.type || "application/octet-stream",
    byteSize: body.byteLength,
    body,
  };
}

photos.post("/teachers/:teacherId", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(
    z.object({ teacherId: uuid }),
    c.req.param(),
  );
  const file = await readMultipartFile(c);
  const data = await uploadTeacherPhotoForActor(
    admin,
    actor,
    params.teacherId,
    file,
  );
  return c.json({ data }, 201);
});

photos.post("/students/:studentId", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const params = validateParams(
    z.object({ studentId: uuid }),
    c.req.param(),
  );
  const file = await readMultipartFile(c);
  const data = await uploadStudentPhotoForActor(
    admin,
    actor,
    params.studentId,
    file,
  );
  return c.json({ data }, 201);
});

export default photos;
