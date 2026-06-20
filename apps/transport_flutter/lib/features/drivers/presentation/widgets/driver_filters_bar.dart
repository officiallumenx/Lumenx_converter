import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../models/driver_models.dart';
import '../drivers_controller.dart';

class DriverFiltersBar extends ConsumerWidget {
  const DriverFiltersBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(driversStatusFilterProvider);
    final route = ref.watch(driversRouteFilterProvider);

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
                selected: status == DriverStatusFilter.all,
                onTap: () => ref
                    .read(driversStatusFilterProvider.notifier)
                    .state = DriverStatusFilter.all,
              ),
              _FilterChip(
                label: 'Active',
                selected: status == DriverStatusFilter.active,
                onTap: () => ref
                    .read(driversStatusFilterProvider.notifier)
                    .state = DriverStatusFilter.active,
              ),
              _FilterChip(
                label: 'On leave',
                selected: status == DriverStatusFilter.onLeave,
                onTap: () => ref
                    .read(driversStatusFilterProvider.notifier)
                    .state = DriverStatusFilter.onLeave,
              ),
              _FilterChip(
                label: 'Inactive',
                selected: status == DriverStatusFilter.inactive,
                onTap: () => ref
                    .read(driversStatusFilterProvider.notifier)
                    .state = DriverStatusFilter.inactive,
              ),
              const SizedBox(width: AppSpacing.sm),
              _FilterChip(
                label: 'All routes',
                selected: route == DriverRouteFilter.all,
                onTap: () => ref
                    .read(driversRouteFilterProvider.notifier)
                    .state = DriverRouteFilter.all,
              ),
              _FilterChip(
                label: 'Route 01',
                selected: route == DriverRouteFilter.route01,
                onTap: () => ref
                    .read(driversRouteFilterProvider.notifier)
                    .state = DriverRouteFilter.route01,
              ),
              _FilterChip(
                label: 'Route 02',
                selected: route == DriverRouteFilter.route02,
                onTap: () => ref
                    .read(driversRouteFilterProvider.notifier)
                    .state = DriverRouteFilter.route02,
              ),
              _FilterChip(
                label: 'Route 03',
                selected: route == DriverRouteFilter.route03,
                onTap: () => ref
                    .read(driversRouteFilterProvider.notifier)
                    .state = DriverRouteFilter.route03,
              ),
              _FilterChip(
                label: 'Unassigned',
                selected: route == DriverRouteFilter.unassigned,
                onTap: () => ref
                    .read(driversRouteFilterProvider.notifier)
                    .state = DriverRouteFilter.unassigned,
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
