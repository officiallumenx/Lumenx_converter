import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/offline/offline_sync.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/trip_readiness_repository.dart';
import '../models/trip_readiness_models.dart';

final tripReadinessRepositoryProvider = Provider<TripReadinessRepository>(
  (ref) => TripReadinessRepository(),
);

class TripReadinessController extends AsyncNotifier<TripReadinessSession> {
  TripReadinessRepository get _repo =>
      ref.read(tripReadinessRepositoryProvider);
  static const _orderedChecks = [
    ReadinessRequirementType.gps,
    ReadinessRequirementType.internet,
    ReadinessRequirementType.locationPermission,
    ReadinessRequirementType.notificationPermission,
  ];

  @override
  Future<TripReadinessSession> build() async {
    final auth = ref.watch(authSessionProvider);
    if (auth == null) {
      throw StateError('Driver is not signed in.');
    }
    return _repo.loadSession(auth.driverId);
  }

  Future<bool> attemptTripStart() async {
    final current = state.valueOrNull;
    if (current == null) return false;

    state = AsyncValue.data(
      current.copyWith(
        isChecking: true,
        hasAttemptedStart: true,
        workflowStatus: TripWorkflowStatus.inProgress,
        currentStepIndex: 0,
      ),
    );

    var next = state.valueOrNull ?? current;
    try {
      for (var i = 0; i < _orderedChecks.length; i++) {
        final checkType = _orderedChecks[i];
        final result = await _repo.runCheck(
          driverId: current.driverId,
          requirement: checkType,
        );

        final updatedRequirements = next.requirements
            .map((item) => item.type == checkType ? result : item)
            .toList(growable: false);

        next = next.copyWith(
          requirements: updatedRequirements,
          currentStepIndex: i + 1,
          workflowStatus: TripWorkflowStatus.inProgress,
        );
        state = AsyncValue.data(next);

        if (!result.passed) {
          next = next.copyWith(
            isChecking: false,
            workflowStatus: TripWorkflowStatus.ready,
          );
          state = AsyncValue.data(next);
          return false;
        }
      }

      next = next.copyWith(
        isChecking: false,
        workflowStatus: TripWorkflowStatus.completed,
      );
      state = AsyncValue.data(next);
      ref
          .read(offlineSyncProvider.notifier)
          .recordLocalChange(
            entity: SyncEntityType.tripAction,
            summary: 'Start trip for ${next.routeName}',
          );
      return true;
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      return false;
    }
  }

  Future<void> resolveRequirement(ReadinessRequirementType requirement) async {
    final current = state.valueOrNull;
    if (current == null) return;

    state = AsyncValue.data(current.copyWith(isChecking: true));
    try {
      final requirements = await _repo.resolveRequirement(
        driverId: current.driverId,
        requirement: requirement,
      );
      state = AsyncValue.data(
        current.copyWith(
          requirements: requirements,
          isChecking: false,
          hasAttemptedStart: true,
          workflowStatus: TripWorkflowStatus.ready,
        ),
      );
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
}

final tripReadinessControllerProvider =
    AsyncNotifierProvider<TripReadinessController, TripReadinessSession>(
      TripReadinessController.new,
    );
