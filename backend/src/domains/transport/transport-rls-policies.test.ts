import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readMigration(name: string): string {
  const candidates = [
    join(process.cwd(), "supabase/migrations", name),
    join(process.cwd(), "../supabase/migrations", name),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) {
    throw new Error(`migration not found: ${name}`);
  }
  return readFileSync(path, "utf8");
}

describe("transport RLS policy source (defense in depth)", () => {
  it("scopes enrollment, GPS, boarding, emergency, and daily exceptions", () => {
    const foundation = readMigration("20260827210000_transport_foundation.sql");
    expect(foundation).toContain("CREATE POLICY transport_enrollment_select_scoped");
    expect(foundation).toContain("is_guardian_of_student(student_id)");
    expect(foundation).toContain("ENABLE ROW LEVEL SECURITY");
    expect(foundation).toContain(
      "GRANT ALL ON TABLE public.transport_enrollment TO service_role",
    );

    const ops = readMigration("20260827470800_transport_ops_rls.sql");
    expect(ops).toMatch(/vehicle_location_select_scoped/);
    expect(ops).toMatch(/transport_boarding_event_select_scoped/);
    expect(ops).toMatch(/transport_emergency_select_scoped/);

    const phase9 = readMigration("20261006020000_transport_phase9_rls_hardening.sql");
    expect(phase9).toContain("d.user_profile_id = auth.uid()");
    expect(phase9).toContain("is_guardian_of_student(student_id)");
    expect(phase9).toContain("vehicle_location_select_scoped");

    const daily = readMigration("20261005210000_transport_daily_exception.sql");
    expect(daily).toContain("transport_daily_exception_select_scoped");
    expect(daily).toContain("is_guardian_of_student(student_id)");
  });

  it("formalizes guardian vehicle_location Realtime via SECURITY DEFINER helper", () => {
    const guardianRls = readMigration(
      "20261020160000_transport_vehicle_location_guardian_realtime_rls.sql",
    );

    expect(guardianRls).toContain("CREATE OR REPLACE FUNCTION public.can_learner_read_vehicle_location");
    expect(guardianRls).toMatch(/SECURITY DEFINER/);
    expect(guardianRls).toMatch(/SET search_path\s*=\s*public/);
    expect(guardianRls).toContain("public.is_institute_member(p_institute_id)");
    expect(guardianRls).toContain("te.approval_status IN ('pending', 'approved')");
    expect(guardianRls).toContain("te.status = 'active'");
    expect(guardianRls).toContain("tt.finalized = false");
    expect(guardianRls).toContain("tt.phase <> 'completed'");
    expect(guardianRls).toContain("tt.deleted_at IS NULL");
    expect(guardianRls).toContain("public.is_own_student_row(te.student_id)");
    expect(guardianRls).toContain("public.is_guardian_of_student(te.student_id)");
    expect(guardianRls).toContain(
      "REVOKE ALL ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) FROM anon",
    );
    expect(guardianRls).toContain(
      "GRANT EXECUTE ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) TO authenticated",
    );
    expect(guardianRls).toContain(
      "GRANT EXECUTE ON FUNCTION public.can_learner_read_vehicle_location(uuid, uuid) TO service_role",
    );
    expect(guardianRls).toContain("public.is_staff_of_institute(institute_id)");
    expect(guardianRls).toContain("public.is_platform_operator()");
    expect(guardianRls).toContain("public.has_institute_role(institute_id, 'driver')");
    expect(guardianRls).toContain(
      "public.can_learner_read_vehicle_location(institute_id, trip_id)",
    );

    // Guardian branch must not reintroduce the phase9 bare trip join inside the policy.
    const policyBody = guardianRls.slice(
      guardianRls.indexOf("CREATE POLICY vehicle_location_select_scoped"),
    );
    expect(policyBody).not.toMatch(/FROM\s+public\.transport_trip\s+tt/);
  });

  it("location snapshot migration uses existing helpers, grants, and scoped SELECT-only RLS", () => {
    const migration = readMigration(
      "20261101140000_transport_location_snapshot.sql",
    );

    // Additive schema only — never invent missing helpers.
    expect(migration).not.toMatch(/is_platform_admin\s*\(/);
    expect(migration).not.toMatch(/has_institute_membership\s*\(/);
    expect(migration).toContain("public.is_staff_of_institute(institute_id)");
    expect(migration).toContain("public.is_platform_operator()");
    expect(migration).toContain("public.has_institute_role(institute_id, 'driver')");
    expect(migration).toContain("public.is_own_student_row(student_id)");
    expect(migration).toContain("public.is_guardian_of_student(student_id)");

    // Trip participant: driver must be the trip's assigned driver (not any institute driver).
    expect(migration).toContain("CREATE POLICY transport_trip_participant_select_scoped");
    expect(migration).toContain("d.user_profile_id = auth.uid()");
    expect(migration).toContain(
      "WHERE tt.id = transport_trip_participant.trip_id",
    );

    // Location-change audit: institute drivers + staff/platform + own student/guardian.
    expect(migration).toContain(
      "CREATE POLICY transport_enrollment_location_change_select_scoped",
    );

    // Privileges match peer transport tables.
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.transport_trip_participant FROM anon, authenticated",
    );
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.transport_enrollment_location_change FROM anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT SELECT ON TABLE public.transport_trip_participant TO authenticated",
    );
    expect(migration).toContain(
      "GRANT SELECT ON TABLE public.transport_enrollment_location_change TO authenticated",
    );
    expect(migration).toContain(
      "GRANT ALL ON TABLE public.transport_trip_participant TO service_role",
    );
    expect(migration).toContain(
      "GRANT ALL ON TABLE public.transport_enrollment_location_change TO service_role",
    );

    // SELECT-only for authenticated — no permissive write policies.
    expect(migration).not.toMatch(
      /CREATE POLICY[\s\S]*FOR\s+(INSERT|UPDATE|DELETE|ALL)/i,
    );
    expect(migration).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(migration).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);

    // Non-destructive: no data mutation of live pickup/drop.
    expect(migration).not.toMatch(/^\s*UPDATE\b/im);
    expect(migration).not.toMatch(/^\s*DELETE\b/im);
    expect(migration).not.toMatch(/DROP COLUMN/i);
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS next_pickup_stop_id");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.transport_trip_participant");
  });

  it("location snapshot helpers already exist in earlier foundation migrations", () => {
    const identity = readMigration("20260826164400_foundation_identity_tenancy.sql");
    expect(identity).toContain("CREATE OR REPLACE FUNCTION public.is_platform_operator()");
    expect(identity).toContain("CREATE OR REPLACE FUNCTION public.has_institute_role(");
    expect(identity).toMatch(/SECURITY DEFINER/);
    expect(identity).toMatch(/SET search_path\s*=\s*public/);

    const people = readMigration("20260826184800_people_students_parents.sql");
    expect(people).toContain("CREATE OR REPLACE FUNCTION public.is_staff_of_institute(");
    expect(people).toContain("CREATE OR REPLACE FUNCTION public.is_guardian_of_student(");
    expect(people).toContain("CREATE OR REPLACE FUNCTION public.is_own_student_row(");
    expect(people).toMatch(/SECURITY DEFINER/);
    expect(people).toMatch(/SET search_path\s*=\s*public/);

    // Ops trip table must exist before participant FK.
    const ops = readMigration("20260827221000_transport_ops.sql");
    expect(ops).toContain("CREATE TABLE IF NOT EXISTS public.transport_trip");
  });
});
