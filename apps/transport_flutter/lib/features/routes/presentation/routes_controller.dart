import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/routes_repository.dart';
import '../models/route_models.dart';

class RoutesLoadException implements Exception {
  RoutesLoadException(this.message);
  final String message;
  @override
  String toString() => message;
}

class RoutesRepository {
  bool _failNextLoad = false;
  void simulateNextLoadFailure() => _failNextLoad = true;

  Future<List<RouteListItem>> loadRoutes() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (_failNextLoad) {
      _failNextLoad = false;
      throw RoutesLoadException(
        'Could not load routes. Please check your connection.',
      );
    }
    return buildRouteListItems();
  }

  Future<RouteDetail?> loadRouteDetail(String id) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
    return buildRouteDetail(id);
  }
}

final routesRepositoryProvider = Provider((ref) => RoutesRepository());

final routesSearchProvider = StateProvider<String>((ref) => '');

final routesStatusFilterProvider =
    StateProvider<RouteStatusFilter>((ref) => RouteStatusFilter.all);

final routesDriverFilterProvider =
    StateProvider<RouteDriverFilter>((ref) => RouteDriverFilter.all);

class RoutesListController extends AsyncNotifier<List<RouteListItem>> {
  @override
  Future<List<RouteListItem>> build() async {
    return ref.read(routesRepositoryProvider).loadRoutes();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(routesRepositoryProvider).loadRoutes(),
    );
  }
}

final routesListControllerProvider =
    AsyncNotifierProvider<RoutesListController, List<RouteListItem>>(
  RoutesListController.new,
);

final filteredRoutesProvider = Provider<AsyncValue<List<RouteListItem>>>((ref) {
  final routes = ref.watch(routesListControllerProvider);
  final query = ref.watch(routesSearchProvider);
  final status = ref.watch(routesStatusFilterProvider);
  final driver = ref.watch(routesDriverFilterProvider);

  return routes.whenData((items) {
    return items
        .where((item) => matchesSearch(item, query.trim()))
        .where((item) => matchesStatusFilter(item.route, status))
        .where((item) => matchesDriverFilter(item, driver))
        .toList();
  });
});

final routeDetailProvider =
    FutureProvider.autoDispose.family<RouteDetail?, String>((ref, id) {
  return ref.read(routesRepositoryProvider).loadRouteDetail(id);
});
