import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/drivers_repository.dart';
import '../models/driver_models.dart';

final driversRepositoryProvider = Provider((ref) => DriversRepository());

final driversSearchProvider = StateProvider<String>((ref) => '');

final driversStatusFilterProvider =
    StateProvider<DriverStatusFilter>((ref) => DriverStatusFilter.all);

final driversRouteFilterProvider =
    StateProvider<DriverRouteFilter>((ref) => DriverRouteFilter.all);

class DriversListController extends AsyncNotifier<List<DriverListItem>> {
  @override
  Future<List<DriverListItem>> build() async {
    return ref.read(driversRepositoryProvider).loadDrivers();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(driversRepositoryProvider).loadDrivers(),
    );
  }
}

final driversListControllerProvider =
    AsyncNotifierProvider<DriversListController, List<DriverListItem>>(
  DriversListController.new,
);

final filteredDriversProvider =
    Provider<AsyncValue<List<DriverListItem>>>((ref) {
  final drivers = ref.watch(driversListControllerProvider);
  final query = ref.watch(driversSearchProvider);
  final status = ref.watch(driversStatusFilterProvider);
  final route = ref.watch(driversRouteFilterProvider);

  return drivers.whenData(
    (items) => items
        .where((item) => matchesDriverSearch(item, query.trim()))
        .where((item) => matchesDriverStatusFilter(item.driver, status))
        .where((item) => matchesDriverRouteFilter(item.driver, route))
        .toList(),
  );
});

final driverProfileProvider =
    FutureProvider.autoDispose.family<DriverProfileDetail?, String>((ref, id) {
  return ref.read(driversRepositoryProvider).loadDriverProfile(id);
});

void clearDriverFilters(WidgetRef ref) {
  ref.read(driversSearchProvider.notifier).state = '';
  ref.read(driversStatusFilterProvider.notifier).state = DriverStatusFilter.all;
  ref.read(driversRouteFilterProvider.notifier).state = DriverRouteFilter.all;
}
