import '../../../shared/models/profile.dart';

/// Mutable notification preferences for the transport coordinator.
class NotificationSettings {
  const NotificationSettings({
    required this.routeUpdates,
    required this.attendanceAlerts,
    required this.vehicleAlerts,
    required this.transportAlerts,
    required this.emailDigest,
    required this.pushNotifications,
  });

  final bool routeUpdates;
  final bool attendanceAlerts;
  final bool vehicleAlerts;
  final bool transportAlerts;
  final bool emailDigest;
  final bool pushNotifications;

  NotificationSettings copyWith({
    bool? routeUpdates,
    bool? attendanceAlerts,
    bool? vehicleAlerts,
    bool? transportAlerts,
    bool? emailDigest,
    bool? pushNotifications,
  }) {
    return NotificationSettings(
      routeUpdates: routeUpdates ?? this.routeUpdates,
      attendanceAlerts: attendanceAlerts ?? this.attendanceAlerts,
      vehicleAlerts: vehicleAlerts ?? this.vehicleAlerts,
      transportAlerts: transportAlerts ?? this.transportAlerts,
      emailDigest: emailDigest ?? this.emailDigest,
      pushNotifications: pushNotifications ?? this.pushNotifications,
    );
  }
}

/// Editable profile fields for the account owner.
class EditableProfile {
  const EditableProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.institute,
    required this.phone,
    required this.department,
    required this.routeName,
    required this.vehicleReg,
    this.photoStyleKey = 'classic-blue',
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String institute;
  final String phone;
  final String department;
  final String routeName;
  final String vehicleReg;
  final String photoStyleKey;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  EditableProfile copyWith({
    String? name,
    String? email,
    String? phone,
    String? institute,
    String? department,
    String? photoStyleKey,
  }) {
    return EditableProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role,
      institute: institute ?? this.institute,
      phone: phone ?? this.phone,
      department: department ?? this.department,
      routeName: routeName,
      vehicleReg: vehicleReg,
      photoStyleKey: photoStyleKey ?? this.photoStyleKey,
    );
  }

  factory EditableProfile.fromUserProfile(UserProfile profile) {
    return EditableProfile(
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      institute: profile.institute,
      phone: profile.phone,
      department: profile.department,
      routeName: 'Not assigned',
      vehicleReg: 'Not assigned',
    );
  }

  UserProfile toUserProfile() {
    return UserProfile(
      id: id,
      name: name,
      email: email,
      role: role,
      institute: institute,
      phone: phone,
      department: department,
    );
  }
}

class SupportFaq {
  const SupportFaq({required this.question, required this.answer});

  final String question;
  final String answer;
}

class SupportContact {
  const SupportContact({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final String icon;
}

enum ProfileMenuSection {
  editProfile,
  theme,
  notificationSettings,
  support,
  about,
}

extension ProfileMenuSectionX on ProfileMenuSection {
  String get title => switch (this) {
    ProfileMenuSection.editProfile => 'Edit profile',
    ProfileMenuSection.theme => 'Theme',
    ProfileMenuSection.notificationSettings => 'Notifications',
    ProfileMenuSection.support => 'Support',
    ProfileMenuSection.about => 'About LumenX',
  };

  String get subtitle => switch (this) {
    ProfileMenuSection.editProfile => 'Update profile photo',
    ProfileMenuSection.theme => 'Light, dark, or system',
    ProfileMenuSection.notificationSettings =>
      'Alerts and delivery preferences',
    ProfileMenuSection.support => 'Help center & contact',
    ProfileMenuSection.about => 'Version, terms, privacy',
  };

  String get routeSuffix => switch (this) {
    ProfileMenuSection.editProfile => 'edit',
    ProfileMenuSection.theme => 'theme',
    ProfileMenuSection.notificationSettings => 'settings',
    ProfileMenuSection.support => 'support',
    ProfileMenuSection.about => 'about',
  };
}
