import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/mock_data/mock_drivers.dart';
import '../../../shared/mock_data/mock_routes.dart';
import '../../../shared/mock_data/mock_students.dart';
import '../../../shared/mock_data/mock_vehicles.dart';
import '../../../shared/models/driver.dart';
import '../models/attendance_models.dart';

class AttendanceRepository {
  AttendanceRepository() {
    _history.addAll(_seedHistory());
  }

  final List<AttendanceSubmission> _history = [];
  int _submissionSeq = 100;

  List<Driver> get drivers => mockDrivers;

  List<AttendanceStudent> studentsForRoute(String routeId) {
    return mockStudents
        .where((s) => s.routeId == routeId)
        .map(
          (s) => AttendanceStudent(
            id: s.id,
            name: s.name,
            rollNo: s.rollNo,
            stopName: s.stopName,
            classLabel: '${s.className}-${s.section}',
            parentPhone: s.parentPhone,
          ),
        )
        .toList();
  }

  DriverSession sessionForDriver(String driverId) {
    final driver = mockDrivers.firstWhere((d) => d.id == driverId);
    final route = mockRoutes.firstWhere((r) => r.id == driver.routeId);
    final vehicle = mockVehicles.firstWhere((v) => v.routeId == route.id);
    return DriverSession(
      driverId: driver.id,
      driverName: driver.name,
      routeId: route.id,
      routeName: route.name,
      vehicleReg: vehicle.registrationNo,
    );
  }

  List<AttendanceSubmission> getHistory() =>
      List.unmodifiable(_history.reversed.toList());

  AttendanceSubmission? todaySubmission(String routeId) {
    for (final h in _history.reversed) {
      if (h.routeId == routeId && _sameDay(h.date, kAttendanceToday)) {
        return h;
      }
    }
    return null;
  }

  AttendanceSubmission submit({
    required DriverSession session,
    required Set<String> presentIds,
    required Set<String> droppedIds,
    required List<String> allStudentIds,
    String? existingId,
  }) {
    final submission = AttendanceSubmission(
      id: existingId ?? 'ATT-S-${++_submissionSeq}',
      date: kAttendanceToday,
      routeId: session.routeId,
      routeName: session.routeName,
      driverId: session.driverId,
      driverName: session.driverName,
      presentStudentIds: Set.from(presentIds),
      droppedStudentIds: Set.from(droppedIds),
      allStudentIds: List.from(allStudentIds),
      submittedAt: DateTime.now(),
    );

    if (existingId != null) {
      final index = _history.indexWhere((h) => h.id == existingId);
      if (index >= 0) {
        _history[index] = submission;
        return submission;
      }
    }

    _history.removeWhere(
      (h) => h.routeId == session.routeId && _sameDay(h.date, kAttendanceToday),
    );
    _history.add(submission);
    return submission;
  }

  AttendanceSubmission? getById(String id) {
    for (final h in _history) {
      if (h.id == id) return h;
    }
    return null;
  }

  AttendanceSummaryStats summaryStats(String routeId) {
    final weekStart = kAttendanceToday.subtract(const Duration(days: 6));
    var weekPresent = 0;
    var weekDropped = 0;
    var weekAbsent = 0;

    for (final h in _history) {
      if (h.routeId != routeId) continue;
      if (h.date.isBefore(weekStart)) continue;
      weekPresent += h.presentCount;
      weekDropped += h.droppedCount;
      weekAbsent += h.absentCount;
    }

    final total = weekPresent + weekAbsent;
    return AttendanceSummaryStats(
      todaySubmission: todaySubmission(routeId),
      weekPresent: weekPresent,
      weekDropped: weekDropped,
      weekAbsent: weekAbsent,
      weekRate: total == 0 ? 0 : (weekPresent / total) * 100,
      historyCount: _history.where((h) => h.routeId == routeId).length,
    );
  }

  List<AttendanceSubmission> _seedHistory() {
    final route01Students =
        mockStudents.where((s) => s.routeId == 'RT-01').toList();
    final allIds = route01Students.map((s) => s.id).toList();

    AttendanceSubmission day(int daysAgo, int presentCount, String id) {
      final present = allIds.take(presentCount).toSet();
      final dropped = present.take((present.length * 0.8).round()).toSet();
      return AttendanceSubmission(
        id: id,
        date: kAttendanceToday.subtract(Duration(days: daysAgo)),
        routeId: 'RT-01',
        routeName: 'Route 01',
        driverId: 'DR-01',
        driverName: 'Ramesh Kumar',
        presentStudentIds: present,
        droppedStudentIds: dropped,
        allStudentIds: allIds,
        submittedAt: kAttendanceToday.subtract(
          Duration(days: daysAgo, hours: -8),
        ),
      );
    }

    return [
      day(1, 23, 'ATT-S-001'),
      day(2, 24, 'ATT-S-002'),
      day(3, 22, 'ATT-S-003'),
      day(4, 25, 'ATT-S-004'),
      day(5, 24, 'ATT-S-005'),
    ];
  }
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

final attendanceRepositoryProvider =
    Provider<AttendanceRepository>((ref) => AttendanceRepository());
