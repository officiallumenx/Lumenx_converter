import '../models/sos_models.dart';

class SosRepository {
  SosRepository() {
    _history.addAll(_seedHistory);
  }

  final List<SosAlertRecord> _history = [];
  int _seq = 200;

  Future<List<SosAlertRecord>> loadHistory() async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    return List<SosAlertRecord>.from(_history.reversed);
  }

  List<SosAlertRecord> loadHistorySync() {
    return List<SosAlertRecord>.from(_history.reversed);
  }

  Future<SosAlertRecord> createAlert({
    required String driverId,
    required String driverName,
    required String routeName,
    required String vehicleReg,
    required SosEmergencyType type,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    final alert = SosAlertRecord(
      id: 'SOS-${++_seq}',
      driverId: driverId,
      driverName: driverName,
      routeName: routeName,
      vehicleReg: vehicleReg,
      type: type,
      createdAt: DateTime.now(),
      adminAlertCreated: true,
    );
    _history.add(alert);
    return alert;
  }
}

final _seedHistory = <SosAlertRecord>[
  SosAlertRecord(
    id: 'SOS-191',
    driverId: 'DR-01',
    driverName: 'Ramesh Kumar',
    routeName: 'Route 01',
    vehicleReg: 'AP16AB1234',
    type: SosEmergencyType.breakdown,
    createdAt: DateTime(2026, 5, 30, 8, 42),
    adminAlertCreated: true,
  ),
  SosAlertRecord(
    id: 'SOS-192',
    driverId: 'DR-01',
    driverName: 'Ramesh Kumar',
    routeName: 'Route 01',
    vehicleReg: 'AP16AB1234',
    type: SosEmergencyType.safetyIssue,
    createdAt: DateTime(2026, 5, 31, 15, 5),
    adminAlertCreated: true,
  ),
  SosAlertRecord(
    id: 'SOS-193',
    driverId: 'DR-02',
    driverName: 'Suresh Babu',
    routeName: 'Route 02',
    vehicleReg: 'AP16AB5678',
    type: SosEmergencyType.medicalEmergency,
    createdAt: DateTime(2026, 6, 1, 7, 58),
    adminAlertCreated: true,
  ),
];

