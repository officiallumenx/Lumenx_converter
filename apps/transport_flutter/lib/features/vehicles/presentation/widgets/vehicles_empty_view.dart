import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';

class VehiclesEmptyView extends StatelessWidget {
  const VehiclesEmptyView({
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
            searchActive
                ? 'No vehicles match your search'
                : 'No vehicles match filters',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            searchActive
                ? 'Search by registration, model, driver, or route.'
                : 'Clear filters to see the full fleet registry.',
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
