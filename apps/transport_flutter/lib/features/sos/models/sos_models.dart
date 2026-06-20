enum SosEmergencyType {
  breakdown,
  accident,
  medicalEmergency,
  safetyIssue,
}

extension SosEmergencyTypeX on SosEmergencyType {
  String get label => switch (this) {
        SosEmergencyType.breakdown => 'Breakdown',
        SosEmergencyType.accident => 'Accident',
        SosEmergencyType.medicalEmergency => 'Medical Emergency',
        SosEmergencyType.safetyIssue => 'Safety Issue',
      };

  String get description => switch (this) {
        SosEmergencyType.breakdown =>
          'Vehicle is not operational and needs immediate support.',
        SosEmergencyType.accident =>
          'Accident reported. Emergency response required.',
        SosEmergencyType.medicalEmergency =>
          'Medical emergency involving driver or student.',
        SosEmergencyType.safetyIssue =>
          'Safety risk detected during trip operations.',
      };
}

class SosAlertRecord {
  const SosAlertRecord({
    required this.id,
    required this.driverId,
    required this.driverName,
    required this.routeName,
    required this.vehicleReg,
    required this.type,
    required this.createdAt,
    required this.adminAlertCreated,
  });

  final String id;
  final String driverId;
  final String driverName;
  final String routeName;
  final String vehicleReg;
  final SosEmergencyType type;
  final DateTime createdAt;
  final bool adminAlertCreated;
}

