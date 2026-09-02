/**
 * Transport ops report CSV builders for catalog transport-* ids.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listStudents } from "../students/repository.js";
import {
  findDriverById,
  findRouteById,
  findStopById,
  findVehicleById,
  listDrivers,
  listRoutes,
  listVehicles,
} from "../transport/repository.js";
import {
  listBoardingEventsForInstitute,
  listEmergencies,
  listTrips,
} from "../transport/ops-repository.js";
import type { GeneratedReportFile } from "./types.js";

function esc(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(
  headers: string[],
  rows: Array<Array<string | null | undefined>>,
): string {
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((row) =>
      row.map((cell) => esc(cell == null ? "" : String(cell))).join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function stamp(reportId: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `${reportId}-${d}.csv`;
}

export async function generateTransportOpsReportCsv(
  admin: SupabaseClient,
  instituteId: string,
  reportId: string,
): Promise<GeneratedReportFile> {
  switch (reportId) {
    case "transport-trips": {
      const trips = await listTrips(admin, instituteId);
      const routes = await listRoutes(admin, instituteId);
      const routeById = new Map(routes.map((r) => [r.id, r]));
      const vehicles = await listVehicles(admin, instituteId);
      const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
      const drivers = await listDrivers(admin, instituteId);
      const driverById = new Map(drivers.map((d) => [d.id, d]));

      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "trip_id",
            "trip_date",
            "slot",
            "phase",
            "route_id",
            "route_name",
            "vehicle_number",
            "driver_name",
            "started_at",
            "completed_at",
            "finalized",
            "current_stop_index",
          ],
          trips.map((trip) => {
            const route = routeById.get(trip.route_id);
            const vehicle = vehicleById.get(trip.vehicle_id);
            const driver = driverById.get(trip.driver_id);
            return [
              trip.id,
              trip.trip_date,
              trip.slot,
              trip.phase,
              trip.route_id,
              route?.name ?? "",
              vehicle?.vehicle_number ?? "",
              driver?.display_name ?? "",
              trip.started_at,
              trip.completed_at,
              String(trip.finalized),
              String(trip.current_stop_index),
            ];
          }),
        ),
      };
    }
    case "transport-attendance": {
      const [marks, students, trips] = await Promise.all([
        listBoardingEventsForInstitute(admin, instituteId),
        listStudents(admin, { instituteId }),
        listTrips(admin, instituteId),
      ]);
      const studentById = new Map(students.map((s) => [s.id, s]));
      const tripById = new Map(trips.map((t) => [t.id, t]));

      const rows: Array<Array<string | null | undefined>> = [];
      for (const mark of marks) {
        const student = studentById.get(mark.student_id);
        const stop = await findStopById(admin, mark.stop_id);
        const trip = tripById.get(mark.trip_id);
        rows.push([
          mark.trip_id,
          trip?.trip_date ?? "",
          mark.student_id,
          student?.display_name ?? "",
          stop?.name ?? mark.stop_id,
          mark.boarding_status,
          mark.dropping_status,
          mark.boarded_at,
          mark.dropped_at,
          String(mark.finalized),
        ]);
      }

      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "trip_id",
            "trip_date",
            "student_id",
            "student_name",
            "stop_name",
            "boarding_status",
            "dropping_status",
            "boarded_at",
            "dropped_at",
            "finalized",
          ],
          rows,
        ),
      };
    }
    case "transport-emergencies": {
      const emergencies = await listEmergencies(admin, instituteId);
      const trips = await listTrips(admin, instituteId);
      const tripById = new Map(trips.map((t) => [t.id, t]));
      const rows: Array<Array<string | null | undefined>> = [];
      for (const emergency of emergencies) {
        const [driver, vehicle] = await Promise.all([
          findDriverById(admin, emergency.driver_id),
          findVehicleById(admin, emergency.vehicle_id),
        ]);
        let routeName = "";
        if (emergency.trip_id) {
          const tripRow = tripById.get(emergency.trip_id);
          if (tripRow) {
            const route = await findRouteById(admin, tripRow.route_id);
            routeName = route?.name ?? "";
          }
        }
        rows.push([
          emergency.id,
          emergency.status,
          emergency.emergency_type,
          driver?.display_name ?? "",
          vehicle?.vehicle_number ?? "",
          routeName,
          emergency.trip_id,
          emergency.latitude != null ? String(emergency.latitude) : "",
          emergency.longitude != null ? String(emergency.longitude) : "",
          emergency.note,
          emergency.acknowledged_at,
          emergency.resolved_at,
          emergency.created_at,
        ]);
      }

      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "emergency_id",
            "status",
            "emergency_type",
            "driver_name",
            "vehicle_number",
            "route_name",
            "trip_id",
            "latitude",
            "longitude",
            "note",
            "acknowledged_at",
            "resolved_at",
            "created_at",
          ],
          rows,
        ),
      };
    }
    default:
      throw new Error(`Unknown transport ops report_id "${reportId}"`);
  }
}

export function isTransportOpsReportId(reportId: string): boolean {
  return [
    "transport-trips",
    "transport-attendance",
    "transport-emergencies",
  ].includes(reportId);
}
