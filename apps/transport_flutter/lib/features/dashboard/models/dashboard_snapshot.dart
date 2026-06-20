import '../../../shared/models/trip.dart';

/// Driver home metrics for the signed-in driver.
class DashboardSnapshot {
  const DashboardSnapshot({
    required this.date,
    required this.driverId,
    required this.driverName,
    required this.routeId,
    required this.routeName,
    required this.vehicleReg,
    required this.studentsOnRoute,
    required this.myTripsToday,
    this.attendanceTotalToday,
    this.attendancePresentToday,
    this.attendanceSubmitted = false,
  });

  final DateTime date;
  final String driverId;
  final String driverName;
  final String routeId;
  final String routeName;
  final String vehicleReg;
  final int studentsOnRoute;
  final List<Trip> myTripsToday;
  final int? attendanceTotalToday;
  final int? attendancePresentToday;
  final bool attendanceSubmitted;

  int get myTripCount => myTripsToday.length;

  bool get hasAssignment =>
      routeId.trim().isNotEmpty &&
      routeName.trim().isNotEmpty &&
      vehicleReg.trim().isNotEmpty;

  String get attendanceValue {
    if (!attendanceSubmitted || attendancePresentToday == null) {
      return 'Pending';
    }
    if (attendanceTotalToday != null && attendanceTotalToday! > 0) {
      return '$attendancePresentToday/$attendanceTotalToday';
    }
    return '$attendancePresentToday';
  }

  String get attendanceHint =>
      attendanceSubmitted ? 'Present students marked' : 'Submit attendance';

  String get tripStatusLabel {
    final trip = activeTrip ?? nextScheduledTrip;
    if (trip == null) return 'No trip';
    return switch (trip.status) {
      TripStatus.inProgress => 'In progress',
      TripStatus.completed => 'Completed',
      TripStatus.scheduled => 'Scheduled',
      TripStatus.delayed => 'Delayed',
      TripStatus.cancelled => 'Cancelled',
    };
  }

  String get tripStatusHint {
    if (activeTrip != null) {
      return '${activeTrip!.studentsOnBoard} students onboard';
    }
    if (nextScheduledTrip != null) {
      return 'Next at ${_twoDigit(nextScheduledTrip!.scheduledAt.hour)}:${_twoDigit(nextScheduledTrip!.scheduledAt.minute)}';
    }
    return 'No active trip';
  }

  static String _twoDigit(int value) => value.toString().padLeft(2, '0');

  Trip? get activeTrip {
    for (final trip in myTripsToday) {
      if (trip.status == TripStatus.inProgress) return trip;
    }
    return null;
  }

  Trip? get nextScheduledTrip {
    for (final trip in myTripsToday) {
      if (trip.status == TripStatus.scheduled) return trip;
    }
    return null;
  }
}
