import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';

class StudentsEmptyView extends StatelessWidget {
  const StudentsEmptyView({
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
                ? 'No students match your search'
                : 'No students match filters',
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            searchActive
                ? 'Search by name, roll number, route, or class.'
                : 'Clear filters to see all enrolled students.',
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
