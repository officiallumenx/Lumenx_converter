import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import 'drivers_controller.dart';
import 'widgets/driver_card.dart';
import 'widgets/driver_filters_bar.dart';
import 'widgets/driver_search_bar.dart';
import 'widgets/drivers_empty_view.dart';
import 'widgets/drivers_error_view.dart';
import 'widgets/drivers_loading_view.dart';

class DriversPage extends ConsumerWidget {
  const DriversPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final driversAsync = ref.watch(driversListControllerProvider);
    final filtered = ref.watch(filteredDriversProvider);
    final search = ref.watch(driversSearchProvider);

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(driversListControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'Drivers',
              subtitle:
                  '${driversAsync.valueOrNull?.length ?? 5} on roster · campus transport',
            ),
            const DriverSearchBar(),
            const SizedBox(height: AppSpacing.lg),
            const DriverFiltersBar(),
            const SizedBox(height: AppSpacing.md),
            filtered.when(
              loading: () => const SizedBox.shrink(),
              error: (_, _) => const SizedBox.shrink(),
              data: (items) => Text(
                '${items.length} driver${items.length == 1 ? '' : 's'}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.55),
                    ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            driversAsync.when(
              loading: () => const DriversLoadingView(),
              error: (error, _) => DriversErrorView(
                message: error.toString(),
                onRetry: () => ref
                    .read(driversListControllerProvider.notifier)
                    .refresh(),
              ),
              data: (_) => filtered.when(
                loading: () => const DriversLoadingView(),
                error: (e, _) => DriversErrorView(
                  message: e.toString(),
                  onRetry: () => ref
                      .read(driversListControllerProvider.notifier)
                      .refresh(),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return DriversEmptyView(
                      searchActive: search.trim().isNotEmpty,
                      onClearFilters: () => clearDriverFilters(ref),
                    );
                  }

                  return Column(
                    children: [
                      for (var i = 0; i < items.length; i++) ...[
                        if (i > 0) const SizedBox(height: AppSpacing.md),
                        DriverCard(
                          item: items[i],
                          onTap: () => context.push(
                            RoutePaths.driverDetail(items[i].driver.id),
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
