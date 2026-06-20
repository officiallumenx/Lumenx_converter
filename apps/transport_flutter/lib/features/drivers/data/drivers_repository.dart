import 'package:flutter/material.dart';

import '../../../shared/mock_data/mock_drivers.dart';
import '../../../shared/mock_data/mock_routes.dart';
import '../../../shared/mock_data/mock_students.dart';
import '../../../shared/mock_data/mock_vehicles.dart';
import '../../../shared/models/driver.dart';
import '../models/driver_models.dart';

const _avatarColors = [
  Color(0xFF6366F1),
  Color(0xFF22C55E),
  Color(0xFFF59E0B),
  Color(0xFFEF4444),
  Color(0xFF8B5CF6),
  Color(0xFF06B6D4),
];

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

String? vehicleRegForRoute(String? routeId) {
  if (routeId == null) return null;
  for (final v in mockVehicles) {
    if (v.routeId == routeId) return v.registrationNo;
  }
  return null;
}

String? vehicleModelForRoute(String? routeId) {
  if (routeId == null) return null;
  for (final v in mockVehicles) {
    if (v.routeId == routeId) return v.model;
  }
  return null;
}

int? studentCountForRoute(String? routeId) {
  if (routeId == null) return null;
  return mockStudents.where((s) => s.routeId == routeId).length;
}

String initialsFor(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first[0].toUpperCase();
  return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
}

Color avatarColorFor(String id) {
  var hash = 0;
  for (final c in id.codeUnits) {
    hash = c + ((hash << 5) - hash);
  }
  return _avatarColors[hash.abs() % _avatarColors.length];
}

DriverListItem toListItem(Driver driver) {
  final routeLabel = routeLabelFor(driver.routeId);
  return DriverListItem(
    driver: driver,
    routeLabel: routeLabel ?? 'Unassigned',
    vehicleReg: vehicleRegForRoute(driver.routeId),
    initials: initialsFor(driver.name),
    avatarColor: avatarColorFor(driver.id),
  );
}

List<DriverListItem> buildDriverListItems() {
  return mockDrivers.map(toListItem).toList();
}

DriverProfileDetail? buildDriverProfile(String id) {
  Driver? driver;
  for (final d in mockDrivers) {
    if (d.id == id) {
      driver = d;
      break;
    }
  }
  if (driver == null) return null;

  final item = toListItem(driver);
  return DriverProfileDetail(
    listItem: item,
    routeCode: routeCodeFor(driver.routeId),
    vehicleModel: vehicleModelForRoute(driver.routeId),
    studentCount: studentCountForRoute(driver.routeId),
  );
}

bool matchesDriverSearch(DriverListItem item, String query) {
  if (query.isEmpty) return true;
  final q = query.toLowerCase();
  final d = item.driver;
  return d.name.toLowerCase().contains(q) ||
      d.id.toLowerCase().contains(q) ||
      d.phone.toLowerCase().contains(q) ||
      item.routeLabel.toLowerCase().contains(q) ||
      (item.vehicleReg?.toLowerCase().contains(q) ?? false) ||
      (d.licenseNo?.toLowerCase().contains(q) ?? false) ||
      d.status.label.toLowerCase().contains(q);
}

bool matchesDriverStatusFilter(Driver driver, DriverStatusFilter filter) {
  return switch (filter) {
    DriverStatusFilter.all => true,
    DriverStatusFilter.active => driver.status == DriverStatus.active,
    DriverStatusFilter.onLeave => driver.status == DriverStatus.onLeave,
    DriverStatusFilter.inactive => driver.status == DriverStatus.inactive,
  };
}

bool matchesDriverRouteFilter(Driver driver, DriverRouteFilter filter) {
  final routeId = filter.routeId;
  if (routeId == null) return true;
  if (routeId == '__unassigned__') return driver.routeId == null;
  return driver.routeId == routeId;
}

class DriversLoadException implements Exception {
  DriversLoadException(this.message);
  final String message;
  @override
  String toString() => message;
}

class DriversRepository {
  bool _failNextLoad = false;
  void simulateNextLoadFailure() => _failNextLoad = true;

  Future<List<DriverListItem>> loadDrivers() async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    if (_failNextLoad) {
      _failNextLoad = false;
      throw DriversLoadException(
        'Could not load drivers. Please check your connection.',
      );
    }
    return buildDriverListItems();
  }

  Future<DriverProfileDetail?> loadDriverProfile(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 220));
    return buildDriverProfile(id);
  }
}
