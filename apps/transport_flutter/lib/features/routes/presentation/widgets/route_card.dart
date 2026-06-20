import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../../../shared/models/transport_route.dart';
import '../../models/route_models.dart';

class RouteCard extends StatelessWidget {
  const RouteCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  final RouteListItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final route = item.route;
    final status = _statusStyle(route.status);

    return LxCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                child: const Icon(
                  Icons.route,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      route.name,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      '${route.code} · ${route.stopCount} stops',
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
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: status.bg,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Text(
                  status.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: status.fg,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              _Meta(
                icon: Icons.groups_outlined,
                label: '${item.studentCount} students',
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: _Meta(
                  icon: Icons.location_on_outlined,
                  label: '${item.firstStop} → ${item.lastStop}',
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              _Meta(
                icon: Icons.badge_outlined,
                label: route.driverName ?? 'No driver',
              ),
              const SizedBox(width: AppSpacing.lg),
              _Meta(
                icon: Icons.directions_bus_outlined,
                label: route.vehicleReg ?? 'No vehicle',
              ),
            ],
          ),
        ],
      ),
    );
  }

  ({String label, Color bg, Color fg}) _statusStyle(RouteStatus status) =>
      switch (status) {
        RouteStatus.active => (
            label: 'Active',
            bg: AppColors.success.withValues(alpha: 0.12),
            fg: AppColors.success,
          ),
        RouteStatus.inactive => (
            label: 'Inactive',
            bg: AppColors.muted,
            fg: AppColors.mutedForeground,
          ),
        RouteStatus.maintenance => (
            label: 'Maintenance',
            bg: AppColors.warning.withValues(alpha: 0.15),
            fg: AppColors.warning,
          ),
      };
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
