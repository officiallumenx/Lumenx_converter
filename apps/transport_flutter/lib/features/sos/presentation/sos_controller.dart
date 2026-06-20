import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../attendance/presentation/attendance_controller.dart';
import '../data/sos_repository.dart';
import '../models/sos_models.dart';

final sosRepositoryProvider = Provider<SosRepository>((ref) => SosRepository());

final sosSelectedTypeProvider =
    StateProvider<SosEmergencyType?>((ref) => null);

class SosHistoryController extends AsyncNotifier<List<SosAlertRecord>> {
  @override
  Future<List<SosAlertRecord>> build() async {
    return ref.read(sosRepositoryProvider).loadHistory();
  }

  Future<SosAlertRecord?> triggerSos(SosEmergencyType type) async {
    final session = ref.read(driverSessionProvider);
    if (session == null) return null;
    final alert = await ref.read(sosRepositoryProvider).createAlert(
          driverId: session.driverId,
          driverName: session.driverName,
          routeName: session.routeName,
          vehicleReg: session.vehicleReg,
          type: type,
        );
    state = AsyncValue.data(ref.read(sosRepositoryProvider).loadHistorySync());
    return alert;
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(sosRepositoryProvider).loadHistory(),
    );
  }
}

final sosHistoryControllerProvider =
    AsyncNotifierProvider<SosHistoryController, List<SosAlertRecord>>(
  SosHistoryController.new,
);

