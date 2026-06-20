import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/lx_theme_extension.dart';

/// Connect filter pill — rounded-full, primary fill when selected.
class LxFilterChip extends StatelessWidget {
  const LxFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.primary;
    final onPrimary =
        isDark ? AppColors.darkBackground : AppColors.primaryForeground;
    final lx = context.lxTheme;

    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.sm),
      child: Material(
        color: selected ? primary : lx.muted,
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: 6,
            ),
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: selected ? onPrimary : lx.mutedForeground,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Horizontal scroll row of filter pills with optional label.
class LxFilterBar extends StatelessWidget {
  const LxFilterBar({
    super.key,
    this.label,
    required this.children,
  });

  final String? label;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final lx = context.lxTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: lx.mutedForeground,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: children),
        ),
      ],
    );
  }
}
