enum DriverStatus { active, onLeave, inactive }

class Driver {
  const Driver({
    required this.id,
    required this.name,
    required this.phone,
    required this.status,
    this.licenseNo,
    this.routeId,
  });

  final String id;
  final String name;
  final String phone;
  final DriverStatus status;
  final String? licenseNo;
  final String? routeId;
}
