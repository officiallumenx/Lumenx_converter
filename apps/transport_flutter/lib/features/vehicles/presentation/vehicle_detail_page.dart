import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/models/vehicle.dart';
import '../models/vehicle_models.dart';
import 'vehicles_controller.dart';
import 'widgets/vehicles_error_view.dart';
import 'widgets/vehicles_loading_view.dart';

class VehicleDetailPage extends ConsumerWidget {
  const VehicleDetailPage({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(vehicleProfileProvider(vehicleId));

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(vehicleProfileProvider(vehicleId)),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: profileAsync.when(
          loading: () => const VehiclesLoadingView(count: 2),
          error: (e, _) => VehiclesErrorView(
            message: e.toString(),
            onRetry: () => ref.invalidate(vehicleProfileProvider(vehicleId)),
          ),
          data: (profile) {
            if (profile == null) {
              return _NotFound(onBack: () => Navigator.of(context).pop());
            }
            return _VehicleProfileBody(profile: profile);
          },
        ),
      ),
    );
  }
}

class _VehicleProfileBody extends StatelessWidget {
  const _VehicleProfileBody({required this.profile});

  final VehicleProfileDetail profile;

  @override
  Widget build(BuildContext context) {
    final status = _statusStyle(profile.status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pop(),
            ),
            Text(
              'Vehicle details',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        Center(
          child: Column(
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                ),
                child: const Icon(
                  Icons.directions_bus,
                  size: 36,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                profile.registrationNo,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 4),
              Text(
                profile.model ?? 'School bus',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.6),
                    ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: status.bg,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Text(
                  status.label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: status.fg,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        LxCard(
          child: Column(
            children: [
              _InfoRow(
                icon: Icons.confirmation_number_outlined,
                label: 'Vehicle number',
                value: profile.registrationNo,
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.event_seat_outlined,
                label: 'Capacity',
                value: '${profile.capacity} seats',
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.badge_outlined,
                label: 'Driver',
                value: profile.driverName ?? 'Not assigned',
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.route,
                label: 'Route',
                value: profile.vehicle.routeId != null
                    ? '${profile.routeLabel}${profile.routeCode != null ? ' (${profile.routeCode})' : ''}'
                    : 'Unassigned',
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.info_outline,
                label: 'Status',
                value: profile.status.label,
              ),
            ],
          ),
        ),
        if (profile.studentCount != null) ...[
          const SizedBox(height: AppSpacing.lg),
          LxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.groups_outlined,
                        size: 18, color: AppColors.primary),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      'Route assignment',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                _InfoRow(
                  icon: Icons.school_outlined,
                  label: 'Students on route',
                  value: '${profile.studentCount}',
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'Capacity utilization: ${((profile.studentCount! / profile.capacity) * 100).toStringAsFixed(0)}%',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.55),
                      ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  ({String label, Color bg, Color fg}) _statusStyle(VehicleStatus status) =>
      switch (status) {
        VehicleStatus.active => (
            label: 'Active',
            bg: AppColors.success.withValues(alpha: 0.12),
            fg: AppColors.success,
          ),
        VehicleStatus.inactive => (
            label: 'Inactive',
            bg: AppColors.muted,
            fg: AppColors.mutedForeground,
          ),
        VehicleStatus.maintenance => (
            label: 'Maintenance',
            bg: AppColors.warning.withValues(alpha: 0.15),
            fg: AppColors.warning,
          ),
      };
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.55),
                    ),
              ),
              const SizedBox(height: 2),
              Text(value, style: Theme.of(context).textTheme.bodyLarge),
            ],
          ),
        ),
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
          const Icon(Icons.directions_bus_outlined, size: 40),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Vehicle not found',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.lg),
          TextButton(onPressed: onBack, child: const Text('Go back')),
        ],
      ),
    );
  }
}
