import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../models/route_models.dart';
import 'routes_controller.dart';
import 'widgets/route_card.dart';
import 'widgets/route_filters_bar.dart';
import 'widgets/route_search_bar.dart';
import 'widgets/routes_empty_view.dart';
import 'widgets/routes_error_view.dart';
import 'widgets/routes_loading_view.dart';

class RoutesPage extends ConsumerWidget {
  const RoutesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routesAsync = ref.watch(routesListControllerProvider);
    final filtered = ref.watch(filteredRoutesProvider);
    final search = ref.watch(routesSearchProvider);

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(routesListControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'Routes',
              subtitle: '${routesAsync.valueOrNull?.length ?? 3} campus routes · Route 01–03',
            ),
            const RouteSearchBar(),
            const SizedBox(height: AppSpacing.lg),
            const RouteFiltersBar(),
            const SizedBox(height: AppSpacing.xl),
            routesAsync.when(
              loading: () => const RoutesLoadingView(),
              error: (error, _) => RoutesErrorView(
                message: error.toString(),
                onRetry: () => ref
                    .read(routesListControllerProvider.notifier)
                    .refresh(),
              ),
              data: (_) => filtered.when(
                loading: () => const RoutesLoadingView(),
                error: (e, _) => RoutesErrorView(
                  message: e.toString(),
                  onRetry: () => ref
                      .read(routesListControllerProvider.notifier)
                      .refresh(),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return RoutesEmptyView(
                      searchActive: search.trim().isNotEmpty,
                      onClearFilters: () => _clearFilters(ref),
                    );
                  }

                  return Column(
                    children: [
                      for (var i = 0; i < items.length; i++) ...[
                        if (i > 0) const SizedBox(height: AppSpacing.md),
                        RouteCard(
                          item: items[i],
                          onTap: () => context.push(
                            RoutePaths.routeDetail(items[i].route.id),
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _clearFilters(WidgetRef ref) {
    ref.read(routesSearchProvider.notifier).state = '';
    ref.read(routesStatusFilterProvider.notifier).state =
        RouteStatusFilter.all;
    ref.read(routesDriverFilterProvider.notifier).state =
        RouteDriverFilter.all;
  }
}
