import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import 'students_controller.dart';
import 'widgets/student_card.dart';
import 'widgets/student_filters_bar.dart';
import 'widgets/student_search_bar.dart';
import 'widgets/students_empty_view.dart';
import 'widgets/students_error_view.dart';
import 'widgets/students_loading_view.dart';

class StudentsPage extends ConsumerWidget {
  const StudentsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final studentsAsync = ref.watch(studentsListControllerProvider);
    final filtered = ref.watch(filteredStudentsProvider);
    final search = ref.watch(studentsSearchProvider);

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(studentsListControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'Students',
              subtitle:
                  '${studentsAsync.valueOrNull?.length ?? 75} enrolled · Routes 01–03',
            ),
            const StudentSearchBar(),
            const SizedBox(height: AppSpacing.lg),
            const StudentFiltersBar(),
            const SizedBox(height: AppSpacing.md),
            filtered.when(
              loading: () => const SizedBox.shrink(),
              error: (_, _) => const SizedBox.shrink(),
              data: (items) => Text(
                '${items.length} student${items.length == 1 ? '' : 's'}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.55),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            studentsAsync.when(
              loading: () => const StudentsLoadingView(),
              error: (error, _) => StudentsErrorView(
                message: error.toString(),
                onRetry: () =>
                    ref.read(studentsListControllerProvider.notifier).refresh(),
              ),
              data: (_) => filtered.when(
                loading: () => const StudentsLoadingView(),
                error: (e, _) => StudentsErrorView(
                  message: e.toString(),
                  onRetry: () => ref
                      .read(studentsListControllerProvider.notifier)
                      .refresh(),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return StudentsEmptyView(
                      searchActive: search.trim().isNotEmpty,
                      onClearFilters: () => clearStudentFilters(ref),
                    );
                  }

                  return Column(
                    children: [
                      for (var i = 0; i < items.length; i++) ...[
                        if (i > 0) const SizedBox(height: AppSpacing.md),
                        StudentCard(
                          item: items[i],
                          onTap: () => context.push(
                            RoutePaths.studentDetail(items[i].student.id),
                          ),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
