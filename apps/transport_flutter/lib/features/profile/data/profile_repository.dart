import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/auth_repository.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../../shared/mock_data/mock_drivers.dart';
import '../../../shared/mock_data/mock_routes.dart';
import '../../../shared/mock_data/mock_vehicles.dart';
import '../models/profile_models.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  ref.watch(authSessionProvider);
  final auth = ref.watch(authRepositoryProvider);
  return ProfileRepository(auth);
});

class ProfileRepository {
  ProfileRepository(this._auth);

  final AuthRepository _auth;

  final Map<String, NotificationSettings> _settings = {};
  final Map<String, String> _photoStyleByDriverId = {};
  bool _failNextLoad = false;

  void simulateNextLoadFailure() => _failNextLoad = true;

  EditableProfile _profileForSession() {
    final session = _auth.session;
    if (session == null) {
      throw ProfileLoadException('Not signed in.');
    }
    final account = _auth.accountFor(session.driverId);
    if (account == null) {
      throw ProfileLoadException('Driver profile not found.');
    }
    final routeName = _routeNameFor(account.id);
    final vehicleReg = _vehicleRegFor(account.id);
    final photoStyle = _photoStyleByDriverId[account.id] ?? 'classic-blue';
    return EditableProfile(
      id: account.id,
      name: account.name,
      email: account.email,
      role: 'School Bus Driver',
      institute: 'LumenX Demo Institute',
      phone: account.phone,
      department: account.department,
      routeName: routeName,
      vehicleReg: vehicleReg,
      photoStyleKey: photoStyle,
    );
  }

  Future<EditableProfile> loadProfile() async {
    await Future<void>.delayed(const Duration(milliseconds: 260));
    if (_failNextLoad) {
      _failNextLoad = false;
      throw ProfileLoadException(
        'Could not load profile. Please check your connection.',
      );
    }
    return _profileForSession();
  }

  EditableProfile loadProfileSync() => _profileForSession();

  Future<NotificationSettings> loadNotificationSettings() async {
    await Future<void>.delayed(const Duration(milliseconds: 120));
    return loadNotificationSettingsSync();
  }

  NotificationSettings loadNotificationSettingsSync() {
    final id = _auth.session?.driverId ?? 'default';
    return _settings[id] ?? _defaultSettings;
  }

  Future<EditableProfile> saveProfile(EditableProfile profile) async {
    await Future<void>.delayed(const Duration(milliseconds: 200));
    final id = _auth.session?.driverId;
    if (id != null) {
      _photoStyleByDriverId[id] = profile.photoStyleKey;
    }
    return _profileForSession();
  }

  Future<EditableProfile> updateProfilePhotoStyle(String photoStyleKey) async {
    final current = _profileForSession();
    return saveProfile(current.copyWith(photoStyleKey: photoStyleKey));
  }

  NotificationSettings updateNotificationSettings(
    NotificationSettings settings,
  ) {
    final id = _auth.session?.driverId ?? 'default';
    _settings[id] = settings;
    return settings;
  }

  List<SupportFaq> get faqs => supportFaqs;

  List<SupportContact> get contacts => supportContacts;

  Future<void> submitSupportTicket({
    required String subject,
    required String message,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 350));
  }

  String _routeNameFor(String driverId) {
    final driver = mockDrivers.firstWhere(
      (item) => item.id == driverId,
      orElse: () => mockDrivers.first,
    );
    if (driver.routeId == null) return 'Not assigned';
    final route = mockRoutes
        .where((item) => item.id == driver.routeId)
        .toList();
    if (route.isEmpty) return 'Not assigned';
    return route.first.name;
  }

  String _vehicleRegFor(String driverId) {
    final driver = mockDrivers.firstWhere(
      (item) => item.id == driverId,
      orElse: () => mockDrivers.first,
    );
    if (driver.routeId == null) return 'Not assigned';
    final vehicle = mockVehicles
        .where((item) => item.routeId == driver.routeId)
        .toList();
    if (vehicle.isEmpty) return 'Not assigned';
    return vehicle.first.registrationNo;
  }
}

const _defaultSettings = NotificationSettings(
  routeUpdates: true,
  attendanceAlerts: true,
  vehicleAlerts: true,
  transportAlerts: false,
  emailDigest: true,
  pushNotifications: true,
);

const supportFaqs = <SupportFaq>[
  SupportFaq(
    question: 'How do I mark student attendance?',
    answer:
        'Open Attendance → Mark tab, tap each student to mark present, then Submit. Students you do not tap are recorded as absent.',
  ),
  SupportFaq(
    question: 'Can I edit attendance after submitting?',
    answer:
        'Yes. Open History or Summary, select today\'s submission, and update present marks before the admin cutoff.',
  ),
  SupportFaq(
    question: 'Where do I see my route stops?',
    answer:
        'From Home, tap My Route to view your assigned stops and pickup times. Changes are made by transport admin.',
  ),
  SupportFaq(
    question: 'Who do I contact for emergencies?',
    answer:
        'Use the Emergency line in Support, or call transport helpdesk. For vehicle issues, submit a ticket with your bus registration.',
  ),
];

const supportContacts = <SupportContact>[
  SupportContact(
    label: 'Transport helpdesk',
    value: '+91 98765 10000',
    icon: 'phone',
  ),
  SupportContact(
    label: 'Email support',
    value: 'support@lumenx.app',
    icon: 'email',
  ),
  SupportContact(
    label: 'Emergency line',
    value: '+91 98765 10911',
    icon: 'emergency',
  ),
];

class ProfileLoadException implements Exception {
  ProfileLoadException(this.message);
  final String message;
  @override
  String toString() => message;
}
