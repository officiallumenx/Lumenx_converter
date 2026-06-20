import '../../../shared/mock_data/mock_drivers.dart';
import '../../../shared/mock_data/mock_routes.dart';
import '../../../shared/mock_data/mock_students.dart';
import '../../../shared/mock_data/mock_vehicles.dart';
import '../../../shared/models/vehicle.dart';
import '../models/vehicle_models.dart';

String? routeLabelFor(String? routeId) {
  if (routeId == null) return null;
  for (final r in mockRoutes) {
    if (r.id == routeId) return r.name;
  }
  return routeId;
}

String? routeCodeFor(String? routeId) {
  if (routeId == null) return null;
  for (final r in mockRoutes) {
    if (r.id == routeId) return r.code;
  }
  return null;
}

String? driverNameForRoute(String? routeId) {
  if (routeId == null) return null;
  for (final d in mockDrivers) {
    if (d.routeId == routeId) return d.name;
  }
  for (final r in mockRoutes) {
    if (r.id == routeId) return r.driverName;
  }
  return null;
}

int? studentCountForRoute(String? routeId) {
  if (routeId == null) return null;
  return mockStudents.where((s) => s.routeId == routeId).length;
}

VehicleListItem toListItem(Vehicle vehicle) {
  final routeLabel = routeLabelFor(vehicle.routeId);
  return VehicleListItem(
    vehicle: vehicle,
    routeLabel: routeLabel ?? 'Unassigned',
    driverName: driverNameForRoute(vehicle.routeId),
  );
}

List<VehicleListItem> buildVehicleListItems() {
  return mockVehicles.map(toListItem).toList();
}

VehicleProfileDetail? buildVehicleProfile(String id) {
  Vehicle? vehicle;
  for (final v in mockVehicles) {
    if (v.id == id) {
      vehicle = v;
      break;
    }
  }
  if (vehicle == null) return null;

  final item = toListItem(vehicle);
  return VehicleProfileDetail(
    listItem: item,
    routeCode: routeCodeFor(vehicle.routeId),
    studentCount: studentCountForRoute(vehicle.routeId),
  );
}

bool matchesVehicleSearch(VehicleListItem item, String query) {
  if (query.isEmpty) return true;
  final q = query.toLowerCase();
  final v = item.vehicle;
  return v.registrationNo.toLowerCase().contains(q) ||
      v.id.toLowerCase().contains(q) ||
      (v.model?.toLowerCase().contains(q) ?? false) ||
      item.routeLabel.toLowerCase().contains(q) ||
      (item.driverName?.toLowerCase().contains(q) ?? false) ||
      v.status.label.toLowerCase().contains(q);
}

bool matchesVehicleStatusFilter(Vehicle vehicle, VehicleStatusFilter filter) {
  return switch (filter) {
    VehicleStatusFilter.all => true,
    VehicleStatusFilter.active => vehicle.status == VehicleStatus.active,
    VehicleStatusFilter.inactive => vehicle.status == VehicleStatus.inactive,
    VehicleStatusFilter.maintenance =>
      vehicle.status == VehicleStatus.maintenance,
  };
}

bool matchesVehicleRouteFilter(Vehicle vehicle, VehicleRouteFilter filter) {
  final routeId = filter.routeId;
  if (routeId == null) return true;
  if (routeId == '__unassigned__') return vehicle.routeId == null;
  return vehicle.routeId == routeId;
}

class VehiclesLoadException implements Exception {
  VehiclesLoadException(this.message);
  final String message;
  @override
  String toString() => message;
}

class VehiclesRepository {
  bool _failNextLoad = false;
  void simulateNextLoadFailure() => _failNextLoad = true;

  Future<List<VehicleListItem>> loadVehicles() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (_failNextLoad) {
      _failNextLoad = false;
      throw VehiclesLoadException(
        'Could not load vehicles. Please check your connection.',
      );
    }
    return buildVehicleListItems();
  }

  Future<VehicleProfileDetail?> loadVehicleProfile(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    return buildVehicleProfile(id);
  }
}
