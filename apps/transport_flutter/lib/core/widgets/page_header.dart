import 'package:flutter/material.dart';

import '../constants/breakpoints.dart';
import '../theme/app_spacing.dart';

/// Connect `PageHeader` — responsive Sora title, muted subtitle, actions.
class PageHeader extends StatelessWidget {
  const PageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actions,
  });

  final String title;
  final String? subtitle;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final titleStyle = switch (true) {
      _ when width >= Breakpoints.tablet =>
        Theme.of(context).textTheme.headlineMedium,
      _ when width >= Breakpoints.mobile =>
        Theme.of(context).textTheme.headlineSmall,
      _ => Theme.of(context).textTheme.titleLarge,
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xl),
      child: width >= Breakpoints.mobile
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(child: _TitleBlock(title: title, subtitle: subtitle, titleStyle: titleStyle)),
                if (actions != null) ...[
                  const SizedBox(width: AppSpacing.lg),
                  Wrap(spacing: AppSpacing.sm, children: actions!),
                ],
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _TitleBlock(title: title, subtitle: subtitle, titleStyle: titleStyle),
                if (actions != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Wrap(spacing: AppSpacing.sm, children: actions!),
                ],
              ],
            ),
    );
  }
}

class _TitleBlock extends StatelessWidget {
  const _TitleBlock({
    required this.title,
    required this.subtitle,
    required this.titleStyle,
  });

  final String title;
  final String? subtitle;
  final TextStyle? titleStyle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: titleStyle?.copyWith(fontWeight: FontWeight.w600),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 6),
          Text(
            subtitle!,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.6),
                  height: 1.4,
                ),
          ),
        ],
      ],
    );
  }
}
