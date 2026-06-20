import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../mock_data/mock_attendance.dart';
import '../mock_data/mock_drivers.dart';
import '../mock_data/mock_notifications.dart';
import '../mock_data/mock_profile.dart';
import '../mock_data/mock_routes.dart';
import '../mock_data/mock_students.dart';
import '../mock_data/mock_trips.dart';
import '../mock_data/mock_vehicles.dart';
import '../models/attendance_record.dart';
import '../models/driver.dart';
import '../models/notification_item.dart';
import '../models/profile.dart';
import '../models/transport_route.dart';
import '../models/transport_student.dart';
import '../models/trip.dart';
import '../models/vehicle.dart';

class RouteRepository {
  Future<List<TransportRoute>> getAll() async => mockRoutes;
  Future<TransportRoute?> getById(String id) async {
    for (final r in mockRoutes) {
      if (r.id == id) return r;
    }
    return null;
  }
}

class VehicleRepository {
  Future<List<Vehicle>> getAll() async => mockVehicles;
  Future<Vehicle?> getById(String id) async {
    for (final v in mockVehicles) {
      if (v.id == id) return v;
    }
    return null;
  }
}

class DriverRepository {
  Future<List<Driver>> getAll() async => mockDrivers;
  Future<Driver?> getById(String id) async {
    for (final d in mockDrivers) {
      if (d.id == id) return d;
    }
    return null;
  }
}

class StudentRepository {
  Future<List<TransportStudent>> getAll() async => mockStudents;
  Future<TransportStudent?> getById(String id) async {
    for (final s in mockStudents) {
      if (s.id == id) return s;
    }
    return null;
  }
  Future<List<TransportStudent>> getByRoute(String routeId) async =>
      mockStudents.where((s) => s.routeId == routeId).toList();
}

class AttendanceRepository {
  Future<List<AttendanceRecord>> getAll() async => mockAttendance;
  Future<List<AttendanceRecord>> getByDate(DateTime date) async =>
      mockAttendance
          .where(
            (r) =>
                r.date.year == date.year &&
                r.date.month == date.month &&
                r.date.day == date.day,
          )
          .toList();
  Future<double> getTodayRate() async {
    final today = DateTime(2026, 6, 1);
    final records = await getByDate(today);
    if (records.isEmpty) return 0;
    final present =
        records.where((r) => r.status == AttendanceStatus.present).length;
    return (present / records.length) * 100;
  }
}

class TripRepository {
  Future<List<Trip>> getAll() async => mockTrips;
  Future<Trip?> getById(String id) async {
    for (final t in mockTrips) {
      if (t.id == id) return t;
    }
    return null;
  }
  Future<List<Trip>> getByStatus(TripStatus status) async =>
      mockTrips.where((t) => t.status == status).toList();
}

class NotificationRepository {
  Future<List<NotificationItem>> getAll() async => mockNotifications;
  Future<int> getUnreadCount() async =>
      mockNotifications.where((n) => !n.read).length;
}

class ProfileRepository {
  Future<UserProfile> getProfile() async => mockProfile;
}

class DashboardRepository {
  DashboardRepository({
    required this.routes,
    required this.trips,
    required this.drivers,
    required this.students,
    required this.attendance,
  });

  final RouteRepository routes;
  final TripRepository trips;
  final DriverRepository drivers;
  final StudentRepository students;
  final AttendanceRepository attendance;

  Future<DashboardSummary> getSummary() async {
    final allRoutes = await routes.getAll();
    final allTrips = await trips.getAll();
    final allDrivers = await drivers.getAll();
    final allStudents = await students.getAll();
    final rate = await attendance.getTodayRate();
    final today = DateTime(2026, 6, 1);

    return DashboardSummary(
      activeRoutes:
          allRoutes.where((r) => r.status == RouteStatus.active).length,
      tripsInProgress:
          allTrips.where((t) => t.status == TripStatus.inProgress).length,
      scheduledToday: allTrips
          .where(
            (t) =>
                t.status == TripStatus.scheduled &&
                t.scheduledAt.year == today.year &&
                t.scheduledAt.month == today.month &&
                t.scheduledAt.day == today.day,
          )
          .length,
      driversOnDuty:
          allDrivers.where((d) => d.status == DriverStatus.active).length,
      studentsEnrolled: allStudents.length,
      attendanceRateToday: rate,
    );
  }
}

final routeRepositoryProvider = Provider((_) => RouteRepository());
final vehicleRepositoryProvider = Provider((_) => VehicleRepository());
final driverRepositoryProvider = Provider((_) => DriverRepository());
final studentRepositoryProvider = Provider((_) => StudentRepository());
final attendanceRepositoryProvider = Provider((_) => AttendanceRepository());
final tripRepositoryProvider = Provider((_) => TripRepository());
final notificationRepositoryProvider =
    Provider((_) => NotificationRepository());
final profileRepositoryProvider = Provider((_) => ProfileRepository());

final dashboardRepositoryProvider = Provider(
  (ref) => DashboardRepository(
    routes: ref.watch(routeRepositoryProvider),
    trips: ref.watch(tripRepositoryProvider),
    drivers: ref.watch(driverRepositoryProvider),
    students: ref.watch(studentRepositoryProvider),
    attendance: ref.watch(attendanceRepositoryProvider),
  ),
);

final dashboardSummaryProvider = FutureProvider(
  (ref) => ref.watch(dashboardRepositoryProvider).getSummary(),
);

final routesProvider = FutureProvider((ref) => ref.watch(routeRepositoryProvider).getAll());
final vehiclesProvider = FutureProvider((ref) => ref.watch(vehicleRepositoryProvider).getAll());
final driversProvider = FutureProvider((ref) => ref.watch(driverRepositoryProvider).getAll());
final studentsProvider = FutureProvider((ref) => ref.watch(studentRepositoryProvider).getAll());
final attendanceProvider = FutureProvider((ref) => ref.watch(attendanceRepositoryProvider).getAll());
final tripsProvider = FutureProvider((ref) => ref.watch(tripRepositoryProvider).getAll());
final notificationsProvider = FutureProvider((ref) => ref.watch(notificationRepositoryProvider).getAll());
final profileProvider = FutureProvider((ref) => ref.watch(profileRepositoryProvider).getProfile());
