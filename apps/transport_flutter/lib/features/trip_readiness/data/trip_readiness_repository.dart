import '../models/trip_readiness_models.dart';

class TripReadinessRepository {
  final Map<String, _DriverReadinessSeed> _seedByDriverId = {
    'DR-01': const _DriverReadinessSeed(
      driverName: 'Ramesh Kumar',
      routeName: 'Route 01',
      vehicleReg: 'AP09 TX 1142',
      flags: {
        ReadinessRequirementType.gps: true,
        ReadinessRequirementType.internet: true,
        ReadinessRequirementType.locationPermission: true,
        ReadinessRequirementType.notificationPermission: true,
      },
    ),
    'DR-02': const _DriverReadinessSeed(
      driverName: 'Suresh Babu',
      routeName: 'Route 02',
      vehicleReg: 'TS07 UB 7721',
      flags: {
        ReadinessRequirementType.gps: true,
        ReadinessRequirementType.internet: false,
        ReadinessRequirementType.locationPermission: true,
        ReadinessRequirementType.notificationPermission: true,
      },
    ),
    'DR-03': const _DriverReadinessSeed(
      driverName: 'Venkata Rao',
      routeName: 'Route 03',
      vehicleReg: 'TS09 KB 4108',
      flags: {
        ReadinessRequirementType.gps: false,
        ReadinessRequirementType.internet: true,
        ReadinessRequirementType.locationPermission: false,
        ReadinessRequirementType.notificationPermission: true,
      },
    ),
  };

  Future<TripReadinessSession> loadSession(String driverId) async {
    await Future<void>.delayed(const Duration(milliseconds: 260));
    final normalized = driverId.trim().toUpperCase();
    final seed = _seedByDriverId[normalized] ?? _seedByDriverId['DR-01']!;
    return TripReadinessSession(
      driverId: normalized,
      driverName: seed.driverName,
      routeName: seed.routeName,
      vehicleReg: seed.vehicleReg,
      requirements: _toStatuses(seed.flags),
      workflowStatus: TripWorkflowStatus.ready,
      currentStepIndex: 0,
    );
  }

  Future<ReadinessRequirementStatus> runCheck({
    required String driverId,
    required ReadinessRequirementType requirement,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 340));
    final normalized = driverId.trim().toUpperCase();
    final seed = _seedByDriverId[normalized] ?? _seedByDriverId['DR-01']!;
    final statuses = _toStatuses(seed.flags);
    return statuses.firstWhere((item) => item.type == requirement);
  }

  Future<List<ReadinessRequirementStatus>> resolveRequirement({
    required String driverId,
    required ReadinessRequirementType requirement,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    final normalized = driverId.trim().toUpperCase();
    final seed = _seedByDriverId[normalized];
    if (seed == null) return _toStatuses(_seedByDriverId['DR-01']!.flags);

    final updated = Map<ReadinessRequirementType, bool>.from(seed.flags)
      ..[requirement] = true;
    _seedByDriverId[normalized] = seed.copyWith(flags: updated);
    return _toStatuses(updated);
  }

  List<ReadinessRequirementStatus> _toStatuses(
    Map<ReadinessRequirementType, bool> flags,
  ) {
    return [
      ReadinessRequirementStatus(
        type: ReadinessRequirementType.gps,
        label: 'GPS',
        passed: flags[ReadinessRequirementType.gps] ?? false,
        description: (flags[ReadinessRequirementType.gps] ?? false)
            ? 'GPS signal locked.'
            : 'Enable high-accuracy GPS to continue.',
        actionableInstruction:
            'Open phone Settings > Location and set mode to High accuracy, then return and retry.',
      ),
      ReadinessRequirementStatus(
        type: ReadinessRequirementType.internet,
        label: 'Internet',
        passed: flags[ReadinessRequirementType.internet] ?? false,
        description: (flags[ReadinessRequirementType.internet] ?? false)
            ? 'Mobile data connection is stable.'
            : 'No active network. Turn on mobile data/Wi-Fi.',
        actionableInstruction:
            'Turn on mobile data or connect to a stable Wi-Fi network, then retry.',
      ),
      ReadinessRequirementStatus(
        type: ReadinessRequirementType.locationPermission,
        label: 'Location Permission',
        passed: flags[ReadinessRequirementType.locationPermission] ?? false,
        description:
            (flags[ReadinessRequirementType.locationPermission] ?? false)
                ? 'Location permission is granted.'
                : 'Grant location permission for trip tracking.',
        actionableInstruction:
            'Tap app permissions in settings and allow Location permission.',
      ),
      ReadinessRequirementStatus(
        type: ReadinessRequirementType.notificationPermission,
        label: 'Notification Permission',
        passed: flags[ReadinessRequirementType.notificationPermission] ?? false,
        description:
            (flags[ReadinessRequirementType.notificationPermission] ?? false)
                ? 'Trip notifications are enabled.'
                : 'Allow notifications for trip alarms/reminders.',
        actionableInstruction:
            'Enable notifications for LumenX Transport from app settings.',
      ),
    ];
  }
}

class _DriverReadinessSeed {
  const _DriverReadinessSeed({
    required this.driverName,
    required this.routeName,
    required this.vehicleReg,
    required this.flags,
  });

  final String driverName;
  final String routeName;
  final String vehicleReg;
  final Map<ReadinessRequirementType, bool> flags;

  _DriverReadinessSeed copyWith({
    Map<ReadinessRequirementType, bool>? flags,
  }) {
    return _DriverReadinessSeed(
      driverName: driverName,
      routeName: routeName,
      vehicleReg: vehicleReg,
      flags: flags ?? this.flags,
    );
  }
}

