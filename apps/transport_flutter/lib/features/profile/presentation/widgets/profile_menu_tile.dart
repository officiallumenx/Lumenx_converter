import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../models/profile_models.dart';

class ProfileMenuTile extends StatelessWidget {
  const ProfileMenuTile({
    super.key,
    required this.section,
    required this.onTap,
  });

  final ProfileMenuSection section;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final icon = switch (section) {
      ProfileMenuSection.editProfile => Icons.edit_outlined,
      ProfileMenuSection.theme => Icons.palette_outlined,
      ProfileMenuSection.notificationSettings => Icons.notifications_outlined,
      ProfileMenuSection.support => Icons.support_agent_outlined,
      ProfileMenuSection.about => Icons.info_outline,
    };

    return LxCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  section.title,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  section.subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right,
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.35),
          ),
        ],
      ),
    );
  }
}
