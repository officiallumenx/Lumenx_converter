import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../models/student_models.dart';
import 'student_avatar.dart';

class StudentCard extends StatelessWidget {
  const StudentCard({
    super.key,
    required this.item,
    required this.onTap,
  });

  final StudentListItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      onTap: onTap,
      child: Row(
        children: [
          StudentAvatar(
            initials: item.initials,
            color: item.avatarColor,
            size: 48,
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.student.name,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  'Roll ${item.student.rollNo} · ${item.classLabel}',
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
                      Icons.location_on_outlined,
                      size: 13,
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.45),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        item.student.stopName,
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
}
