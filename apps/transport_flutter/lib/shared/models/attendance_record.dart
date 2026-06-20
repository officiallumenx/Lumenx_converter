enum AttendanceStatus { present, absent, leave }

class AttendanceRecord {
  const AttendanceRecord({
    required this.id,
    required this.studentId,
    required this.routeId,
    required this.date,
    required this.status,
    this.note,
  });

  final String id;
  final String studentId;
  final String routeId;
  final DateTime date;
  final AttendanceStatus status;
  final String? note;
}
