import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../models/student_models.dart';
import '../students_controller.dart';

class StudentFiltersBar extends ConsumerWidget {
  const StudentFiltersBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final route = ref.watch(studentsRouteFilterProvider);
    final classFilter = ref.watch(studentsClassFilterProvider);

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
              for (final f in StudentRouteFilter.values)
                _Chip(
                  label: f.label,
                  selected: route == f,
                  onTap: () =>
                      ref.read(studentsRouteFilterProvider.notifier).state = f,
                ),
              const SizedBox(width: AppSpacing.sm),
              for (final f in [
                StudentClassFilter.all,
                StudentClassFilter.c10,
                StudentClassFilter.c9,
                StudentClassFilter.c8,
                StudentClassFilter.c11,
                StudentClassFilter.c12,
              ])
                _Chip(
                  label: f.label,
                  selected: classFilter == f,
                  onTap: () => ref
                      .read(studentsClassFilterProvider.notifier)
                      .state = f,
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({
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
