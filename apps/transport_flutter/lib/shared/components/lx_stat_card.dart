import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/lx_theme_extension.dart';
import 'lx_card.dart';

enum LxStatTone { defaultTone, primary, success, warning }

class LxStatCard extends StatelessWidget {
  const LxStatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.hint,
    this.tone = LxStatTone.defaultTone,
  });

  final String label;
  final String value;
  final IconData? icon;
  final String? hint;
  final LxStatTone tone;

  @override
  Widget build(BuildContext context) {
    final lx = context.lxTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.primary;

    final (surface, iconBg, iconColor) = switch (tone) {
      LxStatTone.primary => (
          primary.withValues(alpha: 0.08),
          primary.withValues(alpha: 0.15),
          primary,
        ),
      LxStatTone.success => (
          lx.success.withValues(alpha: 0.1),
          lx.success.withValues(alpha: 0.15),
          lx.success,
        ),
      LxStatTone.warning => (
          lx.warning.withValues(alpha: 0.1),
          lx.warning.withValues(alpha: 0.2),
          lx.warning,
        ),
      LxStatTone.defaultTone => (
          isDark ? AppColors.darkCard : AppColors.card,
          lx.muted,
          lx.mutedForeground,
        ),
    };

    return LxCard(
      backgroundColor: surface,
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (icon != null)
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                  child: Icon(icon, size: 20, color: iconColor),
                ),
              if (icon != null) const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  label.toUpperCase(),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        fontSize: 10,
                        letterSpacing: 0.6,
                        color: lx.mutedForeground,
                        height: 1.3,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: tone == LxStatTone.defaultTone ? null : iconColor,
                ),
          ),
          SizedBox(
            height: 36,
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Text(
                hint ?? '\u00a0',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: lx.mutedForeground,
                      height: 1.3,
                    ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
