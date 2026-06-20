import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../../../shared/models/vehicle.dart';
import '../../models/vehicle_models.dart';

class VehicleCard extends StatelessWidget {
  const VehicleCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  final VehicleListItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final vehicle = item.vehicle;
    final status = _statusStyle(vehicle.status);

    return LxCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                child: const Icon(
                  Icons.directions_bus,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      vehicle.registrationNo,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      '${vehicle.model ?? 'School bus'} · ${vehicle.capacity} seats',
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
                icon: Icons.badge_outlined,
                label: item.driverName ?? 'No driver assigned',
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: _Meta(
                  icon: Icons.route,
                  label: item.routeLabel,
                ),
              ),
            ],
          ),
        ],
      ),
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
