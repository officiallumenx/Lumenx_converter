enum VehicleStatus { active, maintenance, inactive }

class Vehicle {
  const Vehicle({
    required this.id,
    required this.registrationNo,
    required this.capacity,
    required this.status,
    this.routeId,
    this.model,
  });

  final String id;
  final String registrationNo;
  final int capacity;
  final VehicleStatus status;
  final String? routeId;
  final String? model;
}
