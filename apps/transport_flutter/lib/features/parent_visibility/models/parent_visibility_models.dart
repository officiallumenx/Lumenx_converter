enum ParentTripStatus { ready, inProgress, completed }

class ParentVisibilitySnapshot {
  const ParentVisibilitySnapshot({
    required this.busNumber,
    required this.driverName,
    required this.driverPhone,
    required this.routeName,
    required this.tripStatus,
    required this.liveTrackingPlaceholder,
  });

  final String busNumber;
  final String driverName;
  final String driverPhone;
  final String routeName;
  final ParentTripStatus tripStatus;
  final String liveTrackingPlaceholder;
}

extension ParentTripStatusX on ParentTripStatus {
  String get label => switch (this) {
    ParentTripStatus.ready => 'Ready',
    ParentTripStatus.inProgress => 'In Progress',
    ParentTripStatus.completed => 'Completed',
  };

  String get hint => switch (this) {
    ParentTripStatus.ready => 'Trip has not started yet',
    ParentTripStatus.inProgress => 'Bus is currently running on route',
    ParentTripStatus.completed => 'Trip ended successfully',
  };
}
