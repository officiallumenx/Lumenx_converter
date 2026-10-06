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
});
