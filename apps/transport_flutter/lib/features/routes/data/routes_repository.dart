import '../../../shared/mock_data/mock_drivers.dart';
import '../../../shared/mock_data/mock_routes.dart';
import '../../../shared/mock_data/mock_students.dart';
import '../../../shared/mock_data/mock_vehicles.dart';
import '../../../shared/models/driver.dart';
import '../../../shared/models/transport_route.dart';
import '../../../shared/models/vehicle.dart';
import '../models/route_models.dart';

const _routeStops = <String, List<RouteStop>>{
  'RT-01': [
    RouteStop(order: 1, name: 'MG Road', pickupTime: '6:45 AM'),
    RouteStop(order: 2, name: 'RTC Complex', pickupTime: '6:52 AM'),
    RouteStop(order: 3, name: 'NTR Circle', pickupTime: '6:58 AM'),
    RouteStop(order: 4, name: 'Gandhi Park', pickupTime: '7:05 AM'),
    RouteStop(order: 5, name: 'Bus Stand', pickupTime: '7:12 AM'),
    RouteStop(order: 6, name: 'Railway Colony', pickupTime: '7:18 AM'),
    RouteStop(order: 7, name: 'University Gate', pickupTime: '7:25 AM'),
    RouteStop(order: 8, name: 'Market Yard', pickupTime: '7:32 AM'),
    RouteStop(order: 9, name: 'Temple Street', pickupTime: '7:38 AM'),
    RouteStop(order: 10, name: 'Lake View', pickupTime: '7:44 AM'),
    RouteStop(order: 11, name: 'Industrial Area', pickupTime: '7:50 AM'),
    RouteStop(order: 12, name: 'Housing Board', pickupTime: '7:55 AM'),
  ],
  'RT-02': [
    RouteStop(order: 1, name: 'City Center', pickupTime: '6:50 AM'),
    RouteStop(order: 2, name: 'Clock Tower', pickupTime: '6:57 AM'),
    RouteStop(order: 3, name: 'Civil Lines', pickupTime: '7:04 AM'),
    RouteStop(order: 4, name: 'Collector Office', pickupTime: '7:10 AM'),
    RouteStop(order: 5, name: 'High Court Road', pickupTime: '7:16 AM'),
    RouteStop(order: 6, name: 'Bank Street', pickupTime: '7:22 AM'),
    RouteStop(order: 7, name: 'Town Hall', pickupTime: '7:28 AM'),
    RouteStop(order: 8, name: 'Station Road', pickupTime: '7:35 AM'),
    RouteStop(order: 9, name: 'School Gate', pickupTime: '7:42 AM'),
  ],
  'RT-03': [
    RouteStop(order: 1, name: 'East Gate', pickupTime: '7:00 AM'),
    RouteStop(order: 2, name: 'Green Park', pickupTime: '7:08 AM'),
    RouteStop(order: 3, name: 'Tech Park', pickupTime: '7:15 AM'),
    RouteStop(order: 4, name: 'Medical College', pickupTime: '7:22 AM'),
    RouteStop(order: 5, name: 'Sports Complex', pickupTime: '7:30 AM'),
    RouteStop(order: 6, name: 'Residency Area', pickupTime: '7:38 AM'),
    RouteStop(order: 7, name: 'Campus Main', pickupTime: '7:45 AM'),
  ],
};

Driver? driverForRoute(String routeId) {
  for (final d in mockDrivers) {
    if (d.routeId == routeId) return d;
  }
  return null;
}

Vehicle? vehicleForRoute(String routeId) {
  for (final v in mockVehicles) {
    if (v.routeId == routeId) return v;
  }
  return null;
}

List<RouteListItem> buildRouteListItems() {
  return mockRoutes.map((route) {
    final stops = _routeStops[route.id] ?? const <RouteStop>[];
    final students =
        mockStudents.where((s) => s.routeId == route.id).toList();
    return RouteListItem(
      route: route,
      studentCount: students.length,
      firstStop: stops.isNotEmpty ? stops.first.name : '—',
      lastStop: stops.isNotEmpty ? stops.last.name : '—',
    );
  }).toList();
}

RouteDetail? buildRouteDetail(String id) {
  TransportRoute? route;
  for (final r in mockRoutes) {
    if (r.id == id) {
      route = r;
      break;
    }
  }
  if (route == null) return null;

  final stops = _routeStops[id] ?? const <RouteStop>[];
  final students = mockStudents.where((s) => s.routeId == id).toList();

  return RouteDetail(
    route: route,
    stops: stops,
    students: students,
    driver: driverForRoute(id),
    vehicle: vehicleForRoute(id),
  );
}

String driverFilterKey(Driver driver) {
  if (driver.name.contains('Ramesh')) return 'ramesh';
  if (driver.name.contains('Suresh')) return 'suresh';
  return driver.id;
}

bool matchesDriverFilter(RouteListItem item, RouteDriverFilter filter) {
  return switch (filter) {
    RouteDriverFilter.all => true,
    RouteDriverFilter.ramesh =>
      item.route.driverName?.contains('Ramesh') ?? false,
    RouteDriverFilter.suresh =>
      item.route.driverName?.contains('Suresh') ?? false,
  };
}

bool matchesStatusFilter(TransportRoute route, RouteStatusFilter filter) {
  return switch (filter) {
    RouteStatusFilter.all => true,
    RouteStatusFilter.active => route.status == RouteStatus.active,
    RouteStatusFilter.inactive => route.status == RouteStatus.inactive,
    RouteStatusFilter.maintenance =>
      route.status == RouteStatus.maintenance,
  };
}

bool matchesSearch(RouteListItem item, String query) {
  if (query.isEmpty) return true;
  final q = query.toLowerCase();
  final r = item.route;
  return r.name.toLowerCase().contains(q) ||
      r.code.toLowerCase().contains(q) ||
      (r.driverName?.toLowerCase().contains(q) ?? false) ||
      (r.vehicleReg?.toLowerCase().contains(q) ?? false) ||
      item.firstStop.toLowerCase().contains(q) ||
      item.lastStop.toLowerCase().contains(q);
}
