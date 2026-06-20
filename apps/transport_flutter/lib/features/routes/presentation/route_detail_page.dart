import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/models/driver.dart';
import '../../../shared/models/transport_student.dart';
import '../../../shared/models/vehicle.dart';
import '../models/route_models.dart';
import 'routes_controller.dart';
import 'widgets/routes_error_view.dart';
import 'widgets/routes_loading_view.dart';

class RouteDetailPage extends ConsumerWidget {
  const RouteDetailPage({super.key, required this.routeId});

  final String routeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(routeDetailProvider(routeId));

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(routeDetailProvider(routeId)),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: detailAsync.when(
          loading: () => const RoutesLoadingView(),
          error: (e, _) => RoutesErrorView(
            message: e.toString(),
            onRetry: () => ref.invalidate(routeDetailProvider(routeId)),
          ),
          data: (detail) {
            if (detail == null) {
              return _NotFound(onBack: () => Navigator.of(context).pop());
            }
            return _RouteDetailBody(detail: detail);
          },
        ),
      ),
    );
  }
}

class _RouteDetailBody extends StatelessWidget {
  const _RouteDetailBody({required this.detail});

  final RouteDetail detail;

  @override
  Widget build(BuildContext context) {
    final route = detail.route;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pop(),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    route.name,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  Text(
                    '${route.code} · ${route.stopCount} stops · ${detail.students.length} students',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.6),
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        _AssignmentRow(
          driver: detail.driver,
          vehicle: detail.vehicle,
        ),
        const SizedBox(height: AppSpacing.xxl),
        _SectionTitle(title: 'Route stops', icon: Icons.location_on_outlined),
        const SizedBox(height: AppSpacing.md),
        LxCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < detail.stops.length; i++) ...[
                if (i > 0) const Divider(height: 1),
                ListTile(
                  leading: CircleAvatar(
                    radius: 14,
                    backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                    child: Text(
                      '${detail.stops[i].order}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  title: Text(detail.stops[i].name),
                  trailing: Text(
                    detail.stops[i].pickupTime,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        _SectionTitle(
          title: 'Students assigned',
          icon: Icons.groups_outlined,
          trailing: '${detail.students.length}',
        ),
        const SizedBox(height: AppSpacing.md),
        LxCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < detail.students.take(10).length; i++) ...[
                if (i > 0) const Divider(height: 1),
                _StudentRow(student: detail.students[i]),
              ],
              if (detail.students.length > 10)
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Text(
                    '+ ${detail.students.length - 10} more students on this route',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.55),
                        ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _AssignmentRow extends StatelessWidget {
  const _AssignmentRow({this.driver, this.vehicle});

  final Driver? driver;
  final Vehicle? vehicle;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final stacked = constraints.maxWidth < 520;
        if (stacked) {
          return Column(
            children: [
              _DriverCard(driver: driver),
              const SizedBox(height: AppSpacing.md),
              _VehicleCard(vehicle: vehicle),
            ],
          );
        }
        return Row(
          children: [
            Expanded(child: _DriverCard(driver: driver)),
            const SizedBox(width: AppSpacing.md),
            Expanded(child: _VehicleCard(vehicle: vehicle)),
          ],
        );
      },
    );
  }
}

class _DriverCard extends StatelessWidget {
  const _DriverCard({this.driver});

  final Driver? driver;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.badge_outlined, size: 18, color: AppColors.primary),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Driver assigned',
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (driver == null)
            Text(
              'No driver assigned',
              style: Theme.of(context).textTheme.bodyMedium,
            )
          else ...[
            Text(
              driver!.name,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(driver!.phone, style: Theme.of(context).textTheme.bodySmall),
            if (driver!.licenseNo != null)
              Text(
                'License ${driver!.licenseNo}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.55),
                    ),
              ),
          ],
        ],
      ),
    );
  }
}

class _VehicleCard extends StatelessWidget {
  const _VehicleCard({this.vehicle});

  final Vehicle? vehicle;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.directions_bus_outlined,
                  size: 18, color: AppColors.primary),
              const SizedBox(width: AppSpacing.sm),
              Text(
                'Vehicle assigned',
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (vehicle == null)
            Text(
              'No vehicle assigned',
              style: Theme.of(context).textTheme.bodyMedium,
            )
          else ...[
            Text(
              vehicle!.registrationNo,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              '${vehicle!.model ?? 'Bus'} · ${vehicle!.capacity} seats',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _StudentRow extends StatelessWidget {
  const _StudentRow({required this.student});

  final TransportStudent student;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        child: Text(student.name[0], style: const TextStyle(fontSize: 14)),
      ),
      title: Text(student.name),
      subtitle: Text('${student.className}-${student.section} · ${student.stopName}'),
      trailing: Text(
        student.rollNo,
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
    required this.icon,
    this.trailing,
  });

  final String title;
  final IconData icon;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: AppSpacing.sm),
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        if (trailing != null) ...[
          const Spacer(),
          Text(
            trailing!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.55),
                ),
          ),
        ],
      ],
    );
  }
}

class _NotFound extends StatelessWidget {
  const _NotFound({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        children: [
          const Icon(Icons.error_outline, size: 40),
          const SizedBox(height: AppSpacing.lg),
          Text('Route not found', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.lg),
          TextButton(onPressed: onBack, child: const Text('Go back')),
        ],
      ),
    );
  }
}
