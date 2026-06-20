import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_stat_card.dart';
import '../../../../shared/components/lx_card.dart';
import '../attendance_controller.dart';

class AttendanceSummaryView extends ConsumerWidget {
  const AttendanceSummaryView({super.key});

  static final _dateFmt = DateFormat('dd MMM yyyy');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(driverSessionProvider);
    final stats = ref.watch(attendanceSummaryProvider);

    if (session == null || stats == null) {
      return const Center(child: Text('Sign in to view summary'));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.md,
          crossAxisSpacing: AppSpacing.md,
          childAspectRatio: 1.5,
          children: [
            LxStatCard(
              label: 'Boarded today',
              value: stats.todaySubmission != null
                  ? '${stats.todaySubmission!.boardedCount}'
                  : '—',
              icon: Icons.login,
              tone: LxStatTone.success,
            ),
            LxStatCard(
              label: 'Dropped today',
              value: stats.todaySubmission != null
                  ? '${stats.todaySubmission!.droppedCount}'
                  : '—',
              icon: Icons.logout,
              tone: LxStatTone.warning,
            ),
            LxStatCard(
              label: 'Onboard now',
              value: stats.todaySubmission != null
                  ? '${stats.todaySubmission!.onboardCount}'
                  : '—',
              icon: Icons.directions_bus_filled,
              tone: LxStatTone.primary,
            ),
            LxStatCard(
              label: '7-day boarded',
              value: '${stats.weekRate.toStringAsFixed(1)}%',
              icon: Icons.trending_up,
              tone: LxStatTone.primary,
            ),
            LxStatCard(
              label: 'Sessions logged',
              value: '${stats.historyCount}',
              icon: Icons.history,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xxl),
        if (stats.todaySubmission != null)
          LxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Today's submission",
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: AppSpacing.md),
                _SummaryLine(
                  label: 'Date',
                  value: _dateFmt.format(stats.todaySubmission!.date),
                ),
                _SummaryLine(
                  label: 'Route',
                  value: stats.todaySubmission!.routeName,
                ),
                _SummaryLine(
                  label: 'Driver',
                  value: stats.todaySubmission!.driverName,
                ),
                _SummaryLine(
                  label: 'Boarded rate',
                  value:
                      '${stats.todaySubmission!.attendanceRate.toStringAsFixed(1)}%',
                ),
                _SummaryLine(
                  label: 'Dropped',
                  value: '${stats.todaySubmission!.droppedCount}',
                ),
                _SummaryLine(
                  label: 'Onboard',
                  value: '${stats.todaySubmission!.onboardCount}',
                ),
                const SizedBox(height: AppSpacing.md),
                TextButton.icon(
                  onPressed: () {
                    ref
                        .read(attendanceMarkingProvider.notifier)
                        .loadForEdit(stats.todaySubmission!);
                    ref.read(attendanceTabProvider.notifier).state = 0;
                  },
                  icon: const Icon(Icons.edit, size: 18),
                  label: const Text('Edit attendance'),
                ),
              ],
            ),
          )
        else
          LxCard(
            child: Text(
              'No attendance submitted for today yet. Mark students and tap Submit.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        const SizedBox(height: AppSpacing.lg),
        LxCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'This week',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: AppSpacing.md),
              _SummaryLine(
                label: 'Total boarded',
                value: '${stats.weekPresent}',
              ),
              _SummaryLine(
                label: 'Total dropped',
                value: '${stats.weekDropped}',
              ),
              _SummaryLine(
                label: 'Total absent',
                value: '${stats.weekAbsent}',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
        ],
      ),
    );
  }
}
