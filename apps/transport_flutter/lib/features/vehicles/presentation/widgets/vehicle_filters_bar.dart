import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../models/vehicle_models.dart';
import '../vehicles_controller.dart';

class VehicleFiltersBar extends ConsumerWidget {
  const VehicleFiltersBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(vehiclesStatusFilterProvider);
    final route = ref.watch(vehiclesRouteFilterProvider);

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
                selected: status == VehicleStatusFilter.all,
                onTap: () => ref
                    .read(vehiclesStatusFilterProvider.notifier)
                    .state = VehicleStatusFilter.all,
              ),
              _FilterChip(
                label: 'Active',
                selected: status == VehicleStatusFilter.active,
                onTap: () => ref
                    .read(vehiclesStatusFilterProvider.notifier)
                    .state = VehicleStatusFilter.active,
              ),
              _FilterChip(
                label: 'Inactive',
                selected: status == VehicleStatusFilter.inactive,
                onTap: () => ref
                    .read(vehiclesStatusFilterProvider.notifier)
                    .state = VehicleStatusFilter.inactive,
              ),
              _FilterChip(
                label: 'Maintenance',
                selected: status == VehicleStatusFilter.maintenance,
                onTap: () => ref
                    .read(vehiclesStatusFilterProvider.notifier)
                    .state = VehicleStatusFilter.maintenance,
              ),
              const SizedBox(width: AppSpacing.sm),
              _FilterChip(
                label: 'All routes',
                selected: route == VehicleRouteFilter.all,
                onTap: () => ref
                    .read(vehiclesRouteFilterProvider.notifier)
                    .state = VehicleRouteFilter.all,
              ),
              _FilterChip(
                label: 'Route 01',
                selected: route == VehicleRouteFilter.route01,
                onTap: () => ref
                    .read(vehiclesRouteFilterProvider.notifier)
                    .state = VehicleRouteFilter.route01,
              ),
              _FilterChip(
                label: 'Route 02',
                selected: route == VehicleRouteFilter.route02,
                onTap: () => ref
                    .read(vehiclesRouteFilterProvider.notifier)
                    .state = VehicleRouteFilter.route02,
              ),
              _FilterChip(
                label: 'Route 03',
                selected: route == VehicleRouteFilter.route03,
                onTap: () => ref
                    .read(vehiclesRouteFilterProvider.notifier)
                    .state = VehicleRouteFilter.route03,
              ),
              _FilterChip(
                label: 'Unassigned',
                selected: route == VehicleRouteFilter.unassigned,
                onTap: () => ref
                    .read(vehiclesRouteFilterProvider.notifier)
                    .state = VehicleRouteFilter.unassigned,
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
