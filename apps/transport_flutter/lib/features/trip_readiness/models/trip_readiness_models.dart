enum ReadinessRequirementType {
  gps,
  internet,
  locationPermission,
  notificationPermission,
}

enum TripWorkflowStatus {
  ready,
  inProgress,
  completed,
}

class ReadinessRequirementStatus {
  const ReadinessRequirementStatus({
    required this.type,
    required this.label,
    required this.passed,
    required this.description,
    required this.actionableInstruction,
  });

  final ReadinessRequirementType type;
  final String label;
  final bool passed;
  final String description;
  final String actionableInstruction;

  ReadinessRequirementStatus copyWith({
    bool? passed,
    String? description,
    String? actionableInstruction,
  }) {
    return ReadinessRequirementStatus(
      type: type,
      label: label,
      passed: passed ?? this.passed,
      description: description ?? this.description,
      actionableInstruction:
          actionableInstruction ?? this.actionableInstruction,
    );
  }
}

class TripReadinessSession {
  const TripReadinessSession({
    required this.driverId,
    required this.driverName,
    required this.routeName,
    required this.vehicleReg,
    required this.requirements,
    this.workflowStatus = TripWorkflowStatus.ready,
    this.currentStepIndex = 0,
    this.isChecking = false,
    this.hasAttemptedStart = false,
  });

  final String driverId;
  final String driverName;
  final String routeName;
  final String vehicleReg;
  final List<ReadinessRequirementStatus> requirements;
  final TripWorkflowStatus workflowStatus;
  final int currentStepIndex;
  final bool isChecking;
  final bool hasAttemptedStart;

  bool get canStartTrip => requirements.every((item) => item.passed);

  List<ReadinessRequirementStatus> get failedRequirements =>
      requirements.where((item) => !item.passed).toList(growable: false);

  String get workflowStatusLabel => switch (workflowStatus) {
        TripWorkflowStatus.ready => 'Ready',
        TripWorkflowStatus.inProgress => 'In Progress',
        TripWorkflowStatus.completed => 'Completed',
      };

  TripReadinessSession copyWith({
    List<ReadinessRequirementStatus>? requirements,
    TripWorkflowStatus? workflowStatus,
    int? currentStepIndex,
    bool? isChecking,
    bool? hasAttemptedStart,
  }) {
    return TripReadinessSession(
      driverId: driverId,
      driverName: driverName,
      routeName: routeName,
      vehicleReg: vehicleReg,
      requirements: requirements ?? this.requirements,
      workflowStatus: workflowStatus ?? this.workflowStatus,
      currentStepIndex: currentStepIndex ?? this.currentStepIndex,
      isChecking: isChecking ?? this.isChecking,
      hasAttemptedStart: hasAttemptedStart ?? this.hasAttemptedStart,
    );
  }
}

