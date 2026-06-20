import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_button.dart';
import '../../../../shared/components/lx_card.dart';

class RoutesErrorView extends StatelessWidget {
  const RoutesErrorView({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        children: [
          Icon(
            Icons.map_outlined,
            size: 44,
            color: Theme.of(context).colorScheme.error.withValues(alpha: 0.8),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Could not load routes',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.6),
                ),
          ),
          const SizedBox(height: AppSpacing.xl),
          LxButton(
            label: 'Retry',
            icon: Icons.refresh,
            expanded: true,
            onPressed: onRetry,
          ),
        ],
      ),
    );
  }
}
