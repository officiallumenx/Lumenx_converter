enum RouteStatus { active, inactive, maintenance }

class TransportRoute {
  const TransportRoute({
    required this.id,
    required this.name,
    required this.code,
    required this.stopCount,
    required this.status,
    this.vehicleReg,
    this.driverName,
  });

  final String id;
  final String name;
  final String code;
  final int stopCount;
  final RouteStatus status;
  final String? vehicleReg;
  final String? driverName;
}
