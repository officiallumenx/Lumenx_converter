import '../../../shared/models/vehicle.dart';

/// Row model for vehicle list cards.
class VehicleListItem {
  const VehicleListItem({
    required this.vehicle,
    required this.routeLabel,
    required this.driverName,
  });

  final Vehicle vehicle;
  final String routeLabel;
  final String? driverName;
}

/// Full vehicle profile for the details page.
class VehicleProfileDetail {
  const VehicleProfileDetail({
    required this.listItem,
    required this.routeCode,
    required this.studentCount,
  });

  final VehicleListItem listItem;
  final String? routeCode;
  final int? studentCount;

  Vehicle get vehicle => listItem.vehicle;
  String get registrationNo => vehicle.registrationNo;
  int get capacity => vehicle.capacity;
  VehicleStatus get status => vehicle.status;
  String? get model => vehicle.model;
  String get routeLabel => listItem.routeLabel;
  String? get driverName => listItem.driverName;
}

enum VehicleStatusFilter { all, active, inactive, maintenance }

enum VehicleRouteFilter { all, route01, route02, route03, unassigned }

extension VehicleStatusX on VehicleStatus {
  String get label => switch (this) {
        VehicleStatus.active => 'Active',
        VehicleStatus.inactive => 'Inactive',
        VehicleStatus.maintenance => 'Maintenance',
      };
}

extension VehicleRouteFilterX on VehicleRouteFilter {
  String? get routeId => switch (this) {
        VehicleRouteFilter.all => null,
        VehicleRouteFilter.route01 => 'RT-01',
        VehicleRouteFilter.route02 => 'RT-02',
        VehicleRouteFilter.route03 => 'RT-03',
        VehicleRouteFilter.unassigned => '__unassigned__',
      };

  String get label => switch (this) {
        VehicleRouteFilter.all => 'All routes',
        VehicleRouteFilter.route01 => 'Route 01',
        VehicleRouteFilter.route02 => 'Route 02',
        VehicleRouteFilter.route03 => 'Route 03',
        VehicleRouteFilter.unassigned => 'Unassigned',
      };
}
