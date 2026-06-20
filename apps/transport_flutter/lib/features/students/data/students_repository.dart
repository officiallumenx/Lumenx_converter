import 'package:flutter/material.dart';

import '../../../shared/mock_data/mock_routes.dart';
import '../../../shared/mock_data/mock_students.dart';
import '../../../shared/models/transport_student.dart';
import '../models/student_models.dart';

const _parentFirstNames = [
  'Srinivas', 'Lakshmi', 'Venkat', 'Padma', 'Krishna', 'Sunitha',
  'Ravi', 'Kavitha', 'Mohan', 'Anjali', 'Prasad', 'Vijaya',
];

const _avatarColors = [
  Color(0xFF6366F1),
  Color(0xFF22C55E),
  Color(0xFFF59E0B),
  Color(0xFFEF4444),
  Color(0xFF8B5CF6),
  Color(0xFF06B6D4),
  Color(0xFFEC4899),
  Color(0xFF14B8A6),
];

String routeLabelFor(String routeId) {
  for (final r in mockRoutes) {
    if (r.id == routeId) return r.name;
  }
  return routeId;
}

String routeCodeFor(String routeId) {
  for (final r in mockRoutes) {
    if (r.id == routeId) return r.code;
  }
  return '—';
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

String parentNameFor(TransportStudent student, int index) {
  final last = student.name.split(' ').last;
  return '${_parentFirstNames[index % _parentFirstNames.length]} $last';
}

StudentListItem toListItem(TransportStudent student, int index) {
  return StudentListItem(
    student: student,
    routeLabel: routeLabelFor(student.routeId),
    classLabel: '${student.className}-${student.section}',
    initials: initialsFor(student.name),
    avatarColor: avatarColorFor(student.id),
    parentName: parentNameFor(student, index),
  );
}

List<StudentListItem> buildStudentListItems() {
  return mockStudents
      .asMap()
      .entries
      .map((e) => toListItem(e.value, e.key))
      .toList();
}

StudentProfileDetail? buildStudentProfile(String id) {
  final index = mockStudents.indexWhere((s) => s.id == id);
  if (index < 0) return null;
  final student = mockStudents[index];
  final item = toListItem(student, index);
  return StudentProfileDetail(
    listItem: item,
    routeCode: routeCodeFor(student.routeId),
    pickupStop: student.stopName,
  );
}

bool matchesStudentSearch(StudentListItem item, String query) {
  if (query.isEmpty) return true;
  final q = query.toLowerCase();
  final s = item.student;
  return s.name.toLowerCase().contains(q) ||
      s.rollNo.toLowerCase().contains(q) ||
      item.routeLabel.toLowerCase().contains(q) ||
      item.classLabel.toLowerCase().contains(q) ||
      s.className.toLowerCase().contains(q) ||
      s.stopName.toLowerCase().contains(q) ||
      item.parentName.toLowerCase().contains(q);
}

bool matchesRouteFilter(StudentListItem item, StudentRouteFilter filter) {
  final routeId = filter.routeId;
  if (routeId == null) return true;
  return item.student.routeId == routeId;
}

bool matchesClassFilter(StudentListItem item, StudentClassFilter filter) {
  final classValue = filter.classValue;
  if (classValue == null) return true;
  return item.student.className == classValue;
}

class StudentsLoadException implements Exception {
  StudentsLoadException(this.message);
  final String message;
  @override
  String toString() => message;
}

class StudentsRepository {
  bool _failNextLoad = false;
  void simulateNextLoadFailure() => _failNextLoad = true;

  Future<List<StudentListItem>> loadStudents() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (_failNextLoad) {
      _failNextLoad = false;
      throw StudentsLoadException(
        'Could not load students. Please check your connection.',
      );
    }
    return buildStudentListItems();
  }

  Future<StudentProfileDetail?> loadStudentProfile(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 280));
    return buildStudentProfile(id);
  }
}
