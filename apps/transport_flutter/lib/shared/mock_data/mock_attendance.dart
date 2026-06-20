import '../models/attendance_record.dart';
import 'mock_students.dart';

List<AttendanceRecord> buildMockAttendance() {
  final records = <AttendanceRecord>[];
  var id = 1;
  final today = DateTime(2026, 6, 1);

  for (var dayOffset = 0; dayOffset < 14; dayOffset++) {
    final date = today.subtract(Duration(days: dayOffset));
    if (date.weekday == DateTime.sunday) continue;

    for (var i = 0; i < mockStudents.length; i++) {
      final student = mockStudents[i];
      AttendanceStatus status;
      if ((i + dayOffset) % 17 == 0) {
        status = AttendanceStatus.absent;
      } else if ((i + dayOffset) % 23 == 0) {
        status = AttendanceStatus.leave;
      } else {
        status = AttendanceStatus.present;
      }

      records.add(
        AttendanceRecord(
          id: 'ATT-${id.toString().padLeft(4, '0')}',
          studentId: student.id,
          routeId: student.routeId,
          date: date,
          status: status,
          note: status == AttendanceStatus.absent
              ? 'Not at stop'
              : status == AttendanceStatus.leave
                  ? 'Approved leave'
                  : null,
        ),
      );
      id++;
    }
  }
  return records;
}

final mockAttendance = buildMockAttendance();
