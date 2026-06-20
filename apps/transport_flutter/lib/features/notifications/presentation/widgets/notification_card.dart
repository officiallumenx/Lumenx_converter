import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../../../shared/models/notification_item.dart';
import '../../models/notification_models.dart';

class NotificationCard extends StatelessWidget {
  const NotificationCard({
    super.key,
    required this.item,
    required this.timeLabel,
    required this.onTap,
    required this.onMarkRead,
  });

  final NotificationListItem item;
  final String timeLabel;
  final VoidCallback onTap;
  final VoidCallback onMarkRead;

  @override
  Widget build(BuildContext context) {
    final style = _categoryStyle(item.type);
    final unread = !item.read;

    return LxCard(
      onTap: onTap,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: style.bg,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: Icon(style.icon, color: style.fg, size: 20),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight:
                                  unread ? FontWeight.w700 : FontWeight.w600,
                            ),
                      ),
                    ),
                    if (unread)
                      Container(
                        width: 8,
                        height: 8,
                        margin: const EdgeInsets.only(left: AppSpacing.sm),
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.body,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.72),
                      ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: style.bg,
                        borderRadius:
                            BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Text(
                        item.type.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: style.fg,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      timeLabel,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.45),
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (unread) ...[
            const SizedBox(width: AppSpacing.sm),
            IconButton(
              tooltip: 'Mark read',
              icon: const Icon(Icons.done, size: 18),
              onPressed: onMarkRead,
              visualDensity: VisualDensity.compact,
            ),
          ],
        ],
      ),
    );
  }

  ({IconData icon, Color bg, Color fg}) _categoryStyle(NotificationType type) =>
      switch (type) {
        NotificationType.routeUpdate => (
            icon: Icons.route,
            bg: AppColors.primary.withValues(alpha: 0.12),
            fg: AppColors.primary,
          ),
        NotificationType.tripUpdate => (
            icon: Icons.departure_board_outlined,
            bg: AppColors.primary.withValues(alpha: 0.1),
            fg: AppColors.primary,
          ),
        NotificationType.attendanceAlert => (
            icon: Icons.fact_check_outlined,
            bg: AppColors.success.withValues(alpha: 0.12),
            fg: AppColors.success,
          ),
        NotificationType.systemAlert => (
            icon: Icons.campaign_outlined,
            bg: AppColors.warning.withValues(alpha: 0.14),
            fg: AppColors.warning,
          ),
      };
}
