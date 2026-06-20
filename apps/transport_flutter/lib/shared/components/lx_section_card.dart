import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import 'lx_card.dart';

/// Connect `SectionCard` — titled section wrapper with optional action.
class LxSectionCard extends StatelessWidget {
  const LxSectionCard({
    super.key,
    this.title,
    this.action,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.lg),
  });

  final String? title;
  final Widget? action;
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (title != null || action != null)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final stacked = constraints.maxWidth < 520;
                  if (stacked) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (title != null)
                          Text(
                            title!,
                            style: Theme.of(context).textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        if (title != null && action != null)
                          const SizedBox(height: AppSpacing.sm),
                        action ?? const SizedBox.shrink(),
                      ],
                    );
                  }

                  final rowChildren = <Widget>[
                    if (title != null)
                      Expanded(
                        child: Text(
                          title!,
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      ),
                  ];
                  if (action != null) {
                    rowChildren.add(action!);
                  }
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: rowChildren,
                  );
                },
              ),
            ),
          child,
        ],
      ),
    );
  }
}
