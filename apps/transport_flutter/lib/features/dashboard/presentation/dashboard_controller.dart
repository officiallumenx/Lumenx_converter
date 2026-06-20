import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/presentation/auth_controller.dart';
import '../data/dashboard_repository.dart';
import '../models/dashboard_snapshot.dart';

final dashboardRepositoryProvider = Provider((ref) => DashboardRepository());

class DashboardController extends AsyncNotifier<DashboardSnapshot> {
  @override
  Future<DashboardSnapshot> build() async {
    final auth = ref.watch(authSessionProvider);
    if (auth == null) {
      throw DashboardLoadException('Not signed in.');
    }
    return ref.read(dashboardRepositoryProvider).load(driverId: auth.driverId);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    final auth = ref.read(authSessionProvider);
    if (auth == null) return;
    state = await AsyncValue.guard(
      () => ref.read(dashboardRepositoryProvider).load(driverId: auth.driverId),
    );
  }
}

final dashboardControllerProvider =
    AsyncNotifierProvider<DashboardController, DashboardSnapshot>(
  DashboardController.new,
);
