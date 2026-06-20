import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../models/route_models.dart';
import '../routes_controller.dart';

class RouteFiltersBar extends ConsumerWidget {
  const RouteFiltersBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(routesStatusFilterProvider);
    final driver = ref.watch(routesDriverFilterProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Filters',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.65),
              ),
        ),
        const SizedBox(height: AppSpacing.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _FilterChip(
                label: 'All status',
                selected: status == RouteStatusFilter.all,
                onTap: () => ref
                    .read(routesStatusFilterProvider.notifier)
                    .state = RouteStatusFilter.all,
              ),
              _FilterChip(
                label: 'Active',
                selected: status == RouteStatusFilter.active,
                onTap: () => ref
                    .read(routesStatusFilterProvider.notifier)
                    .state = RouteStatusFilter.active,
              ),
              _FilterChip(
                label: 'Maintenance',
                selected: status == RouteStatusFilter.maintenance,
                onTap: () => ref
                    .read(routesStatusFilterProvider.notifier)
                    .state = RouteStatusFilter.maintenance,
              ),
              const SizedBox(width: AppSpacing.sm),
              _FilterChip(
                label: 'All drivers',
                selected: driver == RouteDriverFilter.all,
                onTap: () => ref
                    .read(routesDriverFilterProvider.notifier)
                    .state = RouteDriverFilter.all,
              ),
              _FilterChip(
                label: 'Ramesh Kumar',
                selected: driver == RouteDriverFilter.ramesh,
                onTap: () => ref
                    .read(routesDriverFilterProvider.notifier)
                    .state = RouteDriverFilter.ramesh,
              ),
              _FilterChip(
                label: 'Suresh Babu',
                selected: driver == RouteDriverFilter.suresh,
                onTap: () => ref
                    .read(routesDriverFilterProvider.notifier)
                    .state = RouteDriverFilter.suresh,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: AppSpacing.sm),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        showCheckmark: false,
      ),
    );
  }
}
