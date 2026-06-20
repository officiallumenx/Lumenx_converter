import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../models/attendance_models.dart';
import '../attendance_controller.dart';

class AttendanceHistoryView extends ConsumerWidget {
  const AttendanceHistoryView({super.key});

  static final _dateFmt = DateFormat('EEE, dd MMM yyyy');
  static final _timeFmt = DateFormat('h:mm a');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(attendanceHistoryProvider);

    if (history.isEmpty) {
      return const Center(
        child: Text('No attendance history yet. Submit your first session.'),
      );
    }

    return ListView.separated(
      itemCount: history.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final entry = history[index];
        final isToday = _sameDay(entry.date, kAttendanceToday);

        return LxCard(
          onTap: () => _editEntry(ref, entry),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                child: Icon(
                  isToday ? Icons.today : Icons.history,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _dateFmt.format(entry.date),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${entry.routeName} · ${_timeFmt.format(entry.submittedAt)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      '${entry.boardedCount} boarded · ${entry.droppedCount} dropped · ${entry.onboardCount} onboard',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.success,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.edit_outlined, size: 18),
            ],
          ),
        );
      },
    );
  }

  void _editEntry(WidgetRef ref, AttendanceSubmission entry) {
    ref.read(attendanceMarkingProvider.notifier).loadForEdit(entry);
    ref.read(attendanceTabProvider.notifier).state = 0;
    ref.read(attendanceRevisionProvider.notifier).state++;
  }
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;
