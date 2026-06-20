import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/parent_visibility_models.dart';

class ParentVisibilityRepository {
  Future<ParentVisibilitySnapshot?> loadForDriver(String driverId) async {
    await Future<void>.delayed(const Duration(milliseconds: 260));
    return _demoByDriverId[driverId];
  }
}

const _demoByDriverId = <String, ParentVisibilitySnapshot>{
  'DR-01': ParentVisibilitySnapshot(
    busNumber: 'AP16AB1234',
    driverName: 'Ramesh Kumar',
    driverPhone: '+91 98765 43210',
    routeName: 'Route 01',
    tripStatus: ParentTripStatus.inProgress,
    liveTrackingPlaceholder:
        'Live map tile from LumenX Connect appears here in production.',
  ),
  'DR-02': ParentVisibilitySnapshot(
    busNumber: 'AP16AB5678',
    driverName: 'Suresh Babu',
    driverPhone: '+91 98765 43211',
    routeName: 'Route 02',
    tripStatus: ParentTripStatus.ready,
    liveTrackingPlaceholder: 'Tracking pin sync is scheduled once trip starts.',
  ),
  'DR-03': ParentVisibilitySnapshot(
    busNumber: 'AP16AB9012',
    driverName: 'Venkata Rao',
    driverPhone: '+91 98765 43212',
    routeName: 'Route 03',
    tripStatus: ParentTripStatus.completed,
    liveTrackingPlaceholder:
        'Replay and route timeline are shown to parents after completion.',
  ),
};

final parentVisibilityRepositoryProvider = Provider<ParentVisibilityRepository>(
  (ref) => ParentVisibilityRepository(),
);
