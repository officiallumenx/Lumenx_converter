import 'package:flutter/material.dart';

import '../../../shared/models/driver.dart';

/// Row model for driver list cards.
class DriverListItem {
  const DriverListItem({
    required this.driver,
    required this.routeLabel,
    required this.vehicleReg,
    required this.initials,
    required this.avatarColor,
  });

  final Driver driver;
  final String routeLabel;
  final String? vehicleReg;
  final String initials;
  final Color avatarColor;
}

/// Full driver profile for the details page.
class DriverProfileDetail {
  const DriverProfileDetail({
    required this.listItem,
    required this.routeCode,
    required this.vehicleModel,
    required this.studentCount,
  });

  final DriverListItem listItem;
  final String? routeCode;
  final String? vehicleModel;
  final int? studentCount;

  Driver get driver => listItem.driver;
  String get name => driver.name;
  String get employeeId => driver.id;
  String get phone => driver.phone;
  DriverStatus get status => driver.status;
  String? get licenseNo => driver.licenseNo;
  String get routeLabel => listItem.routeLabel;
  String? get vehicleReg => listItem.vehicleReg;
}

enum DriverStatusFilter { all, active, onLeave, inactive }

enum DriverRouteFilter { all, route01, route02, route03, unassigned }

extension DriverStatusX on DriverStatus {
  String get label => switch (this) {
        DriverStatus.active => 'Active',
        DriverStatus.onLeave => 'On leave',
        DriverStatus.inactive => 'Inactive',
      };
}

extension DriverRouteFilterX on DriverRouteFilter {
  String? get routeId => switch (this) {
        DriverRouteFilter.all => null,
        DriverRouteFilter.route01 => 'RT-01',
        DriverRouteFilter.route02 => 'RT-02',
        DriverRouteFilter.route03 => 'RT-03',
        DriverRouteFilter.unassigned => '__unassigned__',
      };

  String get label => switch (this) {
        DriverRouteFilter.all => 'All routes',
        DriverRouteFilter.route01 => 'Route 01',
        DriverRouteFilter.route02 => 'Route 02',
        DriverRouteFilter.route03 => 'Route 03',
        DriverRouteFilter.unassigned => 'Unassigned',
      };
}
