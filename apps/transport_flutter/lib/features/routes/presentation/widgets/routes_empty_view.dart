import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';

class RoutesEmptyView extends StatelessWidget {
  const RoutesEmptyView({
    super.key,
    required this.onClearFilters,
    this.searchActive = false,
  });

  final VoidCallback onClearFilters;
  final bool searchActive;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        children: [
          Icon(
            searchActive ? Icons.search_off : Icons.filter_list_off,
            size: 40,
            color: Theme.of(context)
                .colorScheme
                .onSurface
                .withValues(alpha: 0.35),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            searchActive ? 'No routes match your search' : 'No routes match filters',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            searchActive
                ? 'Try a route name, code, driver, or vehicle number.'
                : 'Clear filters to see all active routes.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.55),
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),
          TextButton(onPressed: onClearFilters, child: const Text('Clear filters')),
        ],
      ),
    );
  }
}
