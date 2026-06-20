import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/lx_theme_extension.dart';

enum LxButtonVariant { primary, secondary, outline, ghost, destructive, link }

enum LxButtonSize { sm, md, lg }

class LxButton extends StatelessWidget {
  const LxButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.variant = LxButtonVariant.primary,
    this.size = LxButtonSize.md,
    this.loading = false,
    this.expanded = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final LxButtonVariant variant;
  final LxButtonSize size;
  final bool loading;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final lx = context.lxTheme;
    final primary = isDark ? AppColors.darkPrimary : AppColors.primary;
    final onPrimary =
        isDark ? AppColors.darkBackground : AppColors.primaryForeground;

    final (hPad, vPad, fontSize) = switch (size) {
      LxButtonSize.sm => (AppSpacing.md, AppSpacing.xs, 12.0),
      LxButtonSize.md => (AppSpacing.lg, AppSpacing.sm, 14.0),
      LxButtonSize.lg => (AppSpacing.xxl, AppSpacing.md, 14.0),
    };

    final child = loading
        ? SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: variant == LxButtonVariant.primary ||
                      variant == LxButtonVariant.destructive
                  ? onPrimary
                  : primary,
            ),
          )
        : Row(
            mainAxisSize: expanded ? MainAxisSize.max : MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: size == LxButtonSize.sm ? 14 : 16),
                SizedBox(width: size == LxButtonSize.sm ? 6 : AppSpacing.sm),
              ],
              Text(label, style: TextStyle(fontSize: fontSize)),
            ],
          );

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
    );

    final button = switch (variant) {
      LxButtonVariant.primary => FilledButton(
          onPressed: loading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: onPrimary,
            padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
            shape: shape,
          ),
          child: child,
        ),
      LxButtonVariant.secondary => FilledButton(
          onPressed: loading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: lx.muted,
            foregroundColor:
                isDark ? AppColors.darkForeground : AppColors.foreground,
            padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
            shape: shape,
          ),
          child: child,
        ),
      LxButtonVariant.outline => OutlinedButton(
          onPressed: loading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
            shape: shape,
            side: BorderSide(color: lx.border),
          ),
          child: child,
        ),
      LxButtonVariant.ghost => TextButton(
          onPressed: loading ? null : onPressed,
          style: TextButton.styleFrom(
            padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
            shape: shape,
          ),
          child: child,
        ),
      LxButtonVariant.destructive => FilledButton(
          onPressed: loading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: lx.destructive,
            foregroundColor: Colors.white,
            padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
            shape: shape,
          ),
          child: child,
        ),
      LxButtonVariant.link => TextButton(
          onPressed: loading ? null : onPressed,
          style: TextButton.styleFrom(
            padding: EdgeInsets.symmetric(horizontal: hPad, vertical: vPad),
            foregroundColor: primary,
            textStyle: TextStyle(
              fontSize: fontSize,
              decoration: TextDecoration.underline,
              decorationColor: primary.withValues(alpha: 0.4),
            ),
          ),
          child: child,
        ),
    };

    if (!expanded) return button;
    return SizedBox(width: double.infinity, child: button);
  }
}
