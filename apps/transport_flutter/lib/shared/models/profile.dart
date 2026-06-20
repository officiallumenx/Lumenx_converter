class UserProfile {
  const UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.institute,
    required this.phone,
    required this.department,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String institute;
  final String phone;
  final String department;

  UserProfile copyWith({
    String? name,
    String? email,
    String? phone,
    String? institute,
    String? department,
  }) {
    return UserProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role,
      institute: institute ?? this.institute,
      phone: phone ?? this.phone,
      department: department ?? this.department,
    );
  }
}

class DashboardSummary {
  const DashboardSummary({
    required this.activeRoutes,
    required this.tripsInProgress,
    required this.scheduledToday,
    required this.driversOnDuty,
    required this.studentsEnrolled,
    required this.attendanceRateToday,
  });

  final int activeRoutes;
  final int tripsInProgress;
  final int scheduledToday;
  final int driversOnDuty;
  final int studentsEnrolled;
  final double attendanceRateToday;
}
