import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/session/driver_app_session.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/profile_repository.dart';
import '../models/profile_models.dart';

class ProfileController extends AsyncNotifier<EditableProfile> {
  @override
  Future<EditableProfile> build() async {
    ref.watch(authSessionProvider);
    if (ref.read(authSessionProvider) == null) {
      throw ProfileLoadException('Not signed in.');
    }
    final profile = await ref.read(profileRepositoryProvider).loadProfile();
    syncDriverAttendanceSession(ref.container);
    return profile;
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(profileRepositoryProvider).loadProfile(),
    );
    syncDriverAttendanceSession(ref.container);
  }

  Future<void> save(EditableProfile profile) async {
    final saved = await ref
        .read(profileRepositoryProvider)
        .saveProfile(profile);
    state = AsyncValue.data(saved);
    syncDriverAttendanceSession(ref.container);
  }

  Future<void> updatePhotoStyle(String photoStyleKey) async {
    final saved = await ref
        .read(profileRepositoryProvider)
        .updateProfilePhotoStyle(photoStyleKey);
    state = AsyncValue.data(saved);
    syncDriverAttendanceSession(ref.container);
  }
}

final profileControllerProvider =
    AsyncNotifierProvider<ProfileController, EditableProfile>(
      ProfileController.new,
    );

class NotificationSettingsController extends Notifier<NotificationSettings> {
  @override
  NotificationSettings build() {
    ref.watch(authSessionProvider);
    return ref.read(profileRepositoryProvider).loadNotificationSettingsSync();
  }

  void setRouteUpdates(bool value) =>
      _update(state.copyWith(routeUpdates: value));

  void setAttendanceAlerts(bool value) =>
      _update(state.copyWith(attendanceAlerts: value));

  void setVehicleAlerts(bool value) =>
      _update(state.copyWith(vehicleAlerts: value));

  void setTransportAlerts(bool value) =>
      _update(state.copyWith(transportAlerts: value));

  void setEmailDigest(bool value) =>
      _update(state.copyWith(emailDigest: value));

  void setPushNotifications(bool value) =>
      _update(state.copyWith(pushNotifications: value));

  void _update(NotificationSettings next) {
    state = ref
        .read(profileRepositoryProvider)
        .updateNotificationSettings(next);
  }
}

final notificationSettingsControllerProvider =
    NotifierProvider<NotificationSettingsController, NotificationSettings>(
      NotificationSettingsController.new,
    );

final supportFaqsProvider = Provider((ref) {
  ref.watch(profileRepositoryProvider);
  return ref.read(profileRepositoryProvider).faqs;
});

final supportContactsProvider = Provider((ref) {
  ref.watch(profileRepositoryProvider);
  return ref.read(profileRepositoryProvider).contacts;
});
