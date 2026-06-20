import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/offline/offline_sync.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../shared/components/lx_button.dart';
import '../models/dashboard_snapshot.dart';
import 'dashboard_controller.dart';
import 'widgets/dashboard_empty_state_view.dart';
import 'widgets/dashboard_error_view.dart';
import 'widgets/dashboard_loading_view.dart';
import 'widgets/dashboard_quick_actions.dart';
import 'widgets/dashboard_stats_grid.dart';

class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardControllerProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(dashboardControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          switchInCurve: Curves.easeOutCubic,
          child: Column(
            key: ValueKey(
              dashboard.isLoading
                  ? 'loading'
                  : dashboard.hasError
                  ? 'error'
                  : 'success',
            ),
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              dashboard.when(
                loading: () => const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    PageHeader(
                      title: 'Driver Home',
                      subtitle: AppConstants.appTagline,
                    ),
                    DashboardLoadingView(),
                  ],
                ),
                error: (error, _) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const PageHeader(title: 'Driver Home'),
                    DashboardErrorView(
                      message: error.toString(),
                      onRetry: () => ref
                          .read(dashboardControllerProvider.notifier)
                          .refresh(),
                    ),
                  ],
                ),
                data: (snapshot) => _DriverHomeContent(
                  snapshot: snapshot,
                  onTakeAttendance: () => context.go(RoutePaths.attendance),
                  onEndTrip: () {
                    ref
                        .read(offlineSyncProvider.notifier)
                        .recordLocalChange(
                          entity: SyncEntityType.tripAction,
                          summary: 'End trip for ${snapshot.routeName}',
                        );
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(
                          content: Text('Trip ended (saved locally)'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DriverHomeContent extends StatelessWidget {
  const _DriverHomeContent({
    required this.snapshot,
    required this.onTakeAttendance,
    required this.onEndTrip,
  });

  final DashboardSnapshot snapshot;
  final VoidCallback onTakeAttendance;
  final VoidCallback onEndTrip;

  @override
  Widget build(BuildContext context) {
    if (!snapshot.hasAssignment) {
      return const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PageHeader(title: 'Driver Home', subtitle: 'Dashboard'),
          DashboardEmptyStateView(),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        PageHeader(
          title: 'Driver Home',
          subtitle: '${snapshot.driverName} · ${snapshot.routeName}',
          actions: [
            LxButton(
              label: 'Parent View Demo',
              icon: Icons.visibility_outlined,
              size: LxButtonSize.sm,
              variant: LxButtonVariant.outline,
              onPressed: () => context.push(RoutePaths.parentVisibilityDemo),
            ),
          ],
        ),
        DashboardStatsGrid(snapshot: snapshot),
        const SizedBox(height: AppSpacing.xxl),
        DashboardQuickActions(
          onStartTrip: () => context.push(RoutePaths.tripReadiness),
          onTakeAttendance: onTakeAttendance,
          onEndTrip: onEndTrip,
          onSos: () => context.push(RoutePaths.sos),
        ),
      ],
    );
  }
}
