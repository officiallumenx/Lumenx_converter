import '../../../core/constants/app_constants.dart';
import '../../../shared/models/trip.dart';
import '../models/dashboard_snapshot.dart';

/// Demo transport day — aligned with attendance mock data.
final kDashboardToday = DateTime(2026, 6, 1);

class DashboardRepository {
  DashboardRepository();
  bool _failNextLoad = false;

  void simulateNextLoadFailure() => _failNextLoad = true;

  Future<DashboardSnapshot> load({String driverId = AppConstants.demoDriverId}) async {
    await Future<void>.delayed(const Duration(milliseconds: 350));

    if (_failNextLoad) {
      _failNextLoad = false;
      throw DashboardLoadException(
        'Unable to reach transport servers. Check your connection and try again.',
      );
    }

    return _buildSnapshot(driverId.trim().toUpperCase());
  }

  DashboardSnapshot _buildSnapshot(String driverId) {
    final demo = _demoByDriverId[driverId] ?? _demoByDriverId[AppConstants.demoDriverId]!;

    return DashboardSnapshot(
      date: kDashboardToday,
      driverId: driverId,
      driverName: demo.driverName,
      routeId: demo.routeId,
      routeName: demo.routeName,
      vehicleReg: demo.vehicleReg,
      studentsOnRoute: demo.studentsOnRoute,
      myTripsToday: demo.myTripsToday,
      attendanceTotalToday: demo.attendanceTotalToday,
      attendancePresentToday: demo.attendancePresentToday,
      attendanceSubmitted: demo.attendanceSubmitted,
    );
  }
}

class DashboardLoadException implements Exception {
  DashboardLoadException(this.message);
  final String message;

  @override
  String toString() => message;
}

class _DemoDashboardRecord {
  const _DemoDashboardRecord({
    required this.driverName,
    required this.routeId,
    required this.routeName,
    required this.vehicleReg,
    required this.studentsOnRoute,
    required this.myTripsToday,
    required this.attendanceSubmitted,
    this.attendancePresentToday,
    this.attendanceTotalToday,
  });

  final String driverName;
  final String routeId;
  final String routeName;
  final String vehicleReg;
  final int studentsOnRoute;
  final List<Trip> myTripsToday;
  final bool attendanceSubmitted;
  final int? attendancePresentToday;
  final int? attendanceTotalToday;
}

final _demoByDriverId = <String, _DemoDashboardRecord>{
  'DR-01': _DemoDashboardRecord(
    driverName: 'Ramesh Kumar',
    routeId: 'RT-01',
    routeName: 'Route 01',
    vehicleReg: 'AP09 TX 1142',
    studentsOnRoute: 42,
    attendanceSubmitted: true,
    attendancePresentToday: 39,
    attendanceTotalToday: 42,
    myTripsToday: [
      Trip(
        id: 'TRP-DR01-AM',
        routeId: 'RT-01',
        routeName: 'Morning Pickup',
        scheduledAt: DateTime(2026, 6, 1, 7, 15),
        status: TripStatus.completed,
        studentsOnBoard: 39,
        driverName: 'Ramesh Kumar',
        vehicleReg: 'AP09 TX 1142',
      ),
      Trip(
        id: 'TRP-DR01-PM',
        routeId: 'RT-01',
        routeName: 'Afternoon Drop',
        scheduledAt: DateTime(2026, 6, 1, 15, 40),
        status: TripStatus.scheduled,
        studentsOnBoard: 0,
        driverName: 'Ramesh Kumar',
        vehicleReg: 'AP09 TX 1142',
      ),
    ],
  ),
  'DR-02': _DemoDashboardRecord(
    driverName: 'Suresh Babu',
    routeId: 'RT-02',
    routeName: 'Route 02',
    vehicleReg: 'TS07 UB 7721',
    studentsOnRoute: 36,
    attendanceSubmitted: false,
    attendancePresentToday: null,
    attendanceTotalToday: 36,
    myTripsToday: [
      Trip(
        id: 'TRP-DR02-AM',
        routeId: 'RT-02',
        routeName: 'Morning Pickup',
        scheduledAt: DateTime(2026, 6, 1, 7, 25),
        status: TripStatus.inProgress,
        studentsOnBoard: 31,
        driverName: 'Suresh Babu',
        vehicleReg: 'TS07 UB 7721',
      ),
      Trip(
        id: 'TRP-DR02-PM',
        routeId: 'RT-02',
        routeName: 'Afternoon Drop',
        scheduledAt: DateTime(2026, 6, 1, 15, 35),
        status: TripStatus.scheduled,
        studentsOnBoard: 0,
        driverName: 'Suresh Babu',
        vehicleReg: 'TS07 UB 7721',
      ),
    ],
  ),
  'DR-03': _DemoDashboardRecord(
    driverName: 'Venkata Rao',
    routeId: '',
    routeName: '',
    vehicleReg: '',
    studentsOnRoute: 0,
    attendanceSubmitted: false,
    myTripsToday: [],
  ),
};
