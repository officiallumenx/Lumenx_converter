import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import 'vehicles_controller.dart';
import 'widgets/vehicle_card.dart';
import 'widgets/vehicle_filters_bar.dart';
import 'widgets/vehicle_search_bar.dart';
import 'widgets/vehicles_empty_view.dart';
import 'widgets/vehicles_error_view.dart';
import 'widgets/vehicles_loading_view.dart';

class VehiclesPage extends ConsumerWidget {
  const VehiclesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vehiclesAsync = ref.watch(vehiclesListControllerProvider);
    final filtered = ref.watch(filteredVehiclesProvider);
    final search = ref.watch(vehiclesSearchProvider);

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(vehiclesListControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'Vehicles',
              subtitle:
                  '${vehiclesAsync.valueOrNull?.length ?? 5} in fleet · AP16 series',
            ),
            const VehicleSearchBar(),
            const SizedBox(height: AppSpacing.lg),
            const VehicleFiltersBar(),
            const SizedBox(height: AppSpacing.md),
            filtered.when(
              loading: () => const SizedBox.shrink(),
              error: (_, _) => const SizedBox.shrink(),
              data: (items) => Text(
                '${items.length} vehicle${items.length == 1 ? '' : 's'}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.55),
                    ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            vehiclesAsync.when(
              loading: () => const VehiclesLoadingView(),
              error: (error, _) => VehiclesErrorView(
                message: error.toString(),
                onRetry: () => ref
                    .read(vehiclesListControllerProvider.notifier)
                    .refresh(),
              ),
              data: (_) => filtered.when(
                loading: () => const VehiclesLoadingView(),
                error: (e, _) => VehiclesErrorView(
                  message: e.toString(),
                  onRetry: () => ref
                      .read(vehiclesListControllerProvider.notifier)
                      .refresh(),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return VehiclesEmptyView(
                      searchActive: search.trim().isNotEmpty,
                      onClearFilters: () => clearVehicleFilters(ref),
                    );
                  }

                  return Column(
                    children: [
                      for (var i = 0; i < items.length; i++) ...[
                        if (i > 0) const SizedBox(height: AppSpacing.md),
                        VehicleCard(
                          item: items[i],
                          onTap: () => context.push(
                            RoutePaths.vehicleDetail(items[i].vehicle.id),
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
}
