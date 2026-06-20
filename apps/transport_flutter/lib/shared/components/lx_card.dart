import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_shadows.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/lx_theme_extension.dart';

/// Connect `surface-card` — rounded-2xl, border, soft shadow, hover elevation.
class LxCard extends StatefulWidget {
  const LxCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
    this.onTap,
    this.elevatedOnHover = true,
    this.backgroundColor,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final bool elevatedOnHover;
  final Color? backgroundColor;

  @override
  State<LxCard> createState() => _LxCardState();
}

class _LxCardState extends State<LxCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final lx = context.lxTheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.primary;
    final surface = widget.backgroundColor ??
        (isDark ? AppColors.darkCard : AppColors.card);

    final borderColor = _hovered && widget.elevatedOnHover
        ? Color.lerp(lx.border, primary, 0.18)!
        : lx.border;

    final card = AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(AppSpacing.radius2xl),
        border: Border.all(color: borderColor),
        boxShadow: _hovered && widget.elevatedOnHover
            ? AppShadows.elevated(lx.border)
            : lx.softShadow,
      ),
      padding: widget.padding,
      child: widget.child,
    );

    Widget content = card;
    if (widget.onTap != null) {
      content = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(AppSpacing.radius2xl),
          child: card,
        ),
      );
    }

    if (!widget.elevatedOnHover) return content;

    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: content,
    );
  }
}
