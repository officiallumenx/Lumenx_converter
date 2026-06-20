/// Demo transport day — aligned with app mock data.
final kAttendanceToday = DateTime(2026, 6, 1);

enum AttendanceStudentStatus { present, absent }
enum AttendanceMarkPhase { boarding, drop }

class AttendanceStudent {
  const AttendanceStudent({
    required this.id,
    required this.name,
    required this.rollNo,
    required this.stopName,
    required this.classLabel,
    required this.parentPhone,
  });

  final String id;
  final String name;
  final String rollNo;
  final String stopName;
  final String classLabel;
  final String parentPhone;
}

class DriverSession {
  const DriverSession({
    required this.driverId,
    required this.driverName,
    required this.routeId,
    required this.routeName,
    required this.vehicleReg,
  });

  final String driverId;
  final String driverName;
  final String routeId;
  final String routeName;
  final String vehicleReg;
}

class AttendanceSubmission {
  const AttendanceSubmission({
    required this.id,
    required this.date,
    required this.routeId,
    required this.routeName,
    required this.driverId,
    required this.driverName,
    required this.presentStudentIds,
    this.droppedStudentIds = const <String>{},
    required this.allStudentIds,
    required this.submittedAt,
  });

  final String id;
  final DateTime date;
  final String routeId;
  final String routeName;
  final String driverId;
  final String driverName;
  final Set<String> presentStudentIds;
  final Set<String> droppedStudentIds;
  final List<String> allStudentIds;
  final DateTime submittedAt;

  int get presentCount => presentStudentIds.length;
  int get boardedCount => presentStudentIds.length;
  int get droppedCount => droppedStudentIds.length;
  int get onboardCount => (boardedCount - droppedCount).clamp(0, boardedCount);
  int get absentCount => allStudentIds.length - presentStudentIds.length;
  int get totalCount => allStudentIds.length;

  double get attendanceRate =>
      totalCount == 0 ? 0 : (presentCount / totalCount) * 100;

  AttendanceSubmission copyWithPresent(Set<String> presentStudentIds) {
    return AttendanceSubmission(
      id: id,
      date: date,
      routeId: routeId,
      routeName: routeName,
      driverId: driverId,
      driverName: driverName,
      presentStudentIds: presentStudentIds,
      allStudentIds: allStudentIds,
      submittedAt: submittedAt,
    );
  }
}

class AttendanceSummaryStats {
  const AttendanceSummaryStats({
    required this.todaySubmission,
    required this.weekPresent,
    required this.weekDropped,
    required this.weekAbsent,
    required this.weekRate,
    required this.historyCount,
  });

  final AttendanceSubmission? todaySubmission;
  final int weekPresent;
  final int weekDropped;
  final int weekAbsent;
  final double weekRate;
  final int historyCount;
}

class AttendanceMarkingDraft {
  const AttendanceMarkingDraft({
    required this.students,
    required this.presentIds,
    required this.droppedIds,
    required this.editingSubmissionId,
    this.lastSavedAt,
  });

  final List<AttendanceStudent> students;
  final Set<String> presentIds;
  final Set<String> droppedIds;
  final String? editingSubmissionId;
  final DateTime? lastSavedAt;

  int get presentCount => presentIds.length;
  int get boardedCount => presentIds.length;
  int get droppedCount => droppedIds.length;
  int get onboardCount => (boardedCount - droppedCount).clamp(0, boardedCount);
  int get absentCount => students.length - presentIds.length;

  AttendanceMarkingDraft copyWith({
    Set<String>? presentIds,
    Set<String>? droppedIds,
    String? editingSubmissionId,
    DateTime? lastSavedAt,
  }) {
    return AttendanceMarkingDraft(
      students: students,
      presentIds: presentIds ?? this.presentIds,
      droppedIds: droppedIds ?? this.droppedIds,
      editingSubmissionId: editingSubmissionId ?? this.editingSubmissionId,
      lastSavedAt: lastSavedAt ?? this.lastSavedAt,
    );
  }
}
