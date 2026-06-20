import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../../../shared/models/driver.dart';
import '../../models/driver_models.dart';
import 'driver_avatar.dart';

class DriverCard extends StatelessWidget {
  const DriverCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  final DriverListItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final driver = item.driver;
    final status = _statusStyle(driver.status);

    return LxCard(
      onTap: onTap,
      child: Row(
        children: [
          DriverAvatar(
            initials: item.initials,
            color: item.avatarColor,
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        driver.name,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: status.bg,
                        borderRadius:
                            BorderRadius.circular(AppSpacing.radiusSm),
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
                const SizedBox(height: 2),
                Text(
                  '${driver.id} · ${driver.phone}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.65),
                      ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.route,
                      size: 13,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.45),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      item.routeLabel,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Icon(
                      Icons.directions_bus_outlined,
                      size: 13,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.45),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        item.vehicleReg ?? 'No vehicle',
                        style: Theme.of(context).textTheme.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: Theme.of(context)
                .colorScheme
                .onSurface
                .withValues(alpha: 0.35),
          ),
        ],
      ),
    );
  }

  ({String label, Color bg, Color fg}) _statusStyle(DriverStatus status) =>
      switch (status) {
        DriverStatus.active => (
            label: 'Active',
            bg: AppColors.success.withValues(alpha: 0.12),
            fg: AppColors.success,
          ),
        DriverStatus.onLeave => (
            label: 'On leave',
            bg: AppColors.warning.withValues(alpha: 0.15),
            fg: AppColors.warning,
          ),
        DriverStatus.inactive => (
            label: 'Inactive',
            bg: AppColors.muted,
            fg: AppColors.mutedForeground,
          ),
      };
}
