import '../../../shared/models/driver.dart';
import '../../../shared/models/transport_route.dart';
import '../../../shared/models/transport_student.dart';
import '../../../shared/models/vehicle.dart';

/// List-row model for route cards.
class RouteListItem {
  const RouteListItem({
    required this.route,
    required this.studentCount,
    required this.firstStop,
    required this.lastStop,
  });

  final TransportRoute route;
  final int studentCount;
  final String firstStop;
  final String lastStop;
}

/// Full route detail with assignments.
class RouteDetail {
  const RouteDetail({
    required this.route,
    required this.stops,
    required this.students,
    this.driver,
    this.vehicle,
  });

  final TransportRoute route;
  final List<RouteStop> stops;
  final List<TransportStudent> students;
  final Driver? driver;
  final Vehicle? vehicle;
}

class RouteStop {
  const RouteStop({
    required this.order,
    required this.name,
    required this.pickupTime,
  });

  final int order;
  final String name;
  final String pickupTime;
}

enum RouteStatusFilter { all, active, inactive, maintenance }

enum RouteDriverFilter { all, ramesh, suresh }
