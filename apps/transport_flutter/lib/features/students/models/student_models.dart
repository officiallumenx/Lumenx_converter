import 'package:flutter/material.dart';

import '../../../shared/models/transport_student.dart';

/// Row model for student list cards.
class StudentListItem {
  const StudentListItem({
    required this.student,
    required this.routeLabel,
    required this.classLabel,
    required this.initials,
    required this.avatarColor,
    required this.parentName,
  });

  final TransportStudent student;
  final String routeLabel;
  final String classLabel;
  final String initials;
  final Color avatarColor;
  final String parentName;
}

/// Full student profile for the details page.
class StudentProfileDetail {
  const StudentProfileDetail({
    required this.listItem,
    required this.routeCode,
    required this.pickupStop,
  });

  final StudentListItem listItem;
  final String routeCode;
  final String pickupStop;

  TransportStudent get student => listItem.student;
  String get name => student.name;
  String get rollNo => student.rollNo;
  String get classLabel => listItem.classLabel;
  String get routeLabel => listItem.routeLabel;
  String get parentPhone => student.parentPhone;
  String get parentName => listItem.parentName;
  String get initials => listItem.initials;
  Color get avatarColor => listItem.avatarColor;
}

enum StudentRouteFilter { all, route01, route02, route03 }

enum StudentClassFilter {
  all,
  c6,
  c7,
  c8,
  c9,
  c10,
  c11,
  c12,
}

extension StudentClassFilterX on StudentClassFilter {
  String? get classValue => switch (this) {
        StudentClassFilter.all => null,
        StudentClassFilter.c6 => '6',
        StudentClassFilter.c7 => '7',
        StudentClassFilter.c8 => '8',
        StudentClassFilter.c9 => '9',
        StudentClassFilter.c10 => '10',
        StudentClassFilter.c11 => '11',
        StudentClassFilter.c12 => '12',
      };

  String get label => switch (this) {
        StudentClassFilter.all => 'All classes',
        StudentClassFilter.c6 => 'Class 6',
        StudentClassFilter.c7 => 'Class 7',
        StudentClassFilter.c8 => 'Class 8',
        StudentClassFilter.c9 => 'Class 9',
        StudentClassFilter.c10 => 'Class 10',
        StudentClassFilter.c11 => 'Class 11',
        StudentClassFilter.c12 => 'Class 12',
      };
}

extension StudentRouteFilterX on StudentRouteFilter {
  String? get routeId => switch (this) {
        StudentRouteFilter.all => null,
        StudentRouteFilter.route01 => 'RT-01',
        StudentRouteFilter.route02 => 'RT-02',
        StudentRouteFilter.route03 => 'RT-03',
      };

  String get label => switch (this) {
        StudentRouteFilter.all => 'All routes',
        StudentRouteFilter.route01 => 'Route 01',
        StudentRouteFilter.route02 => 'Route 02',
        StudentRouteFilter.route03 => 'Route 03',
      };
}
