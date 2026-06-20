import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/attendance/data/attendance_repository.dart';
import '../../features/attendance/models/attendance_models.dart';
import '../../features/attendance/presentation/attendance_controller.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/profile/data/profile_repository.dart';
import '../../features/profile/presentation/profile_controller.dart';

/// Initializes attendance marking for the logged-in driver.
void syncDriverAttendanceSession(ProviderContainer container) {
  final session = container.read(authSessionProvider);
  if (session == null) {
    container.read(driverSessionProvider.notifier).state = null;
    container.read(attendanceMarkingProvider.notifier).clearSession();
    return;
  }

  final profile = container.read(profileControllerProvider).valueOrNull ??
      container.read(profileRepositoryProvider).loadProfileSync();

  final driverSession =
      container.read(attendanceRepositoryProvider).sessionForDriver(profile.id);
  container.read(driverSessionProvider.notifier).state = driverSession;

  final today = container
      .read(attendanceRepositoryProvider)
      .todaySubmission(driverSession.routeId);
  container.read(attendanceMarkingProvider.notifier).startSession(
        driverSession,
        existing: today,
      );
}

/// Read-only driver session derived from auth when signed in.
final activeDriverSessionProvider = Provider<DriverSession?>((ref) {
  ref.watch(authSessionProvider);
  ref.watch(profileControllerProvider);
  return ref.watch(driverSessionProvider);
});
