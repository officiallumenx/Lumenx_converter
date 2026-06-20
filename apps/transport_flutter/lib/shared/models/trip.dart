enum TripStatus { scheduled, inProgress, completed, delayed, cancelled }

class Trip {
  const Trip({
    required this.id,
    required this.routeId,
    required this.routeName,
    required this.scheduledAt,
    required this.status,
    required this.studentsOnBoard,
    this.driverName,
    this.vehicleReg,
  });

  final String id;
  final String routeId;
  final String routeName;
  final DateTime scheduledAt;
  final TripStatus status;
  final int studentsOnBoard;
  final String? driverName;
  final String? vehicleReg;
}
