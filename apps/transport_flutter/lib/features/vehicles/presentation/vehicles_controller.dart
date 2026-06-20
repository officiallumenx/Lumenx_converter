import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/vehicles_repository.dart';
import '../models/vehicle_models.dart';

final vehiclesRepositoryProvider = Provider((ref) => VehiclesRepository());

final vehiclesSearchProvider = StateProvider<String>((ref) => '');

final vehiclesStatusFilterProvider =
    StateProvider<VehicleStatusFilter>((ref) => VehicleStatusFilter.all);

final vehiclesRouteFilterProvider =
    StateProvider<VehicleRouteFilter>((ref) => VehicleRouteFilter.all);

class VehiclesListController extends AsyncNotifier<List<VehicleListItem>> {
  @override
  Future<List<VehicleListItem>> build() async {
    return ref.read(vehiclesRepositoryProvider).loadVehicles();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(vehiclesRepositoryProvider).loadVehicles(),
    );
  }
}

final vehiclesListControllerProvider =
    AsyncNotifierProvider<VehiclesListController, List<VehicleListItem>>(
  VehiclesListController.new,
);

final filteredVehiclesProvider =
    Provider<AsyncValue<List<VehicleListItem>>>((ref) {
  final vehicles = ref.watch(vehiclesListControllerProvider);
  final query = ref.watch(vehiclesSearchProvider);
  final status = ref.watch(vehiclesStatusFilterProvider);
  final route = ref.watch(vehiclesRouteFilterProvider);

  return vehicles.whenData(
    (items) => items
        .where((item) => matchesVehicleSearch(item, query.trim()))
        .where((item) => matchesVehicleStatusFilter(item.vehicle, status))
        .where((item) => matchesVehicleRouteFilter(item.vehicle, route))
        .toList(),
  );
});

final vehicleProfileProvider =
    FutureProvider.autoDispose.family<VehicleProfileDetail?, String>((ref, id) {
  return ref.read(vehiclesRepositoryProvider).loadVehicleProfile(id);
});

void clearVehicleFilters(WidgetRef ref) {
  ref.read(vehiclesSearchProvider.notifier).state = '';
  ref.read(vehiclesStatusFilterProvider.notifier).state =
      VehicleStatusFilter.all;
  ref.read(vehiclesRouteFilterProvider.notifier).state =
      VehicleRouteFilter.all;
}
