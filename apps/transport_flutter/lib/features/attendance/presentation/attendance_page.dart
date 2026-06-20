import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/routing/route_paths.dart';
import '../../../core/session/driver_app_session.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_empty_state.dart';
import 'attendance_controller.dart';
import 'widgets/attendance_history_view.dart';
import 'widgets/attendance_summary_view.dart';
import 'widgets/mark_attendance_view.dart';

class AttendancePage extends ConsumerStatefulWidget {
  const AttendancePage({super.key});

  @override
  ConsumerState<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends ConsumerState<AttendancePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      syncDriverAttendanceSession(ProviderScope.containerOf(context));
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(activeDriverSessionProvider);

    if (session == null) {
      return SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const PageHeader(
              title: 'Attendance',
              subtitle: 'Mark student present & submit',
            ),
            LxEmptyState(
              icon: Icons.login,
              title: 'Sign in to mark attendance',
              description:
                  'Open Profile and sign in to load your assigned route and student list.',
              action: LxButton(
                label: 'Go to Profile',
                icon: Icons.person_outline,
                expanded: true,
                onPressed: () => context.go(RoutePaths.profile),
              ),
            ),
          ],
        ),
      );
    }

    final tab = ref.watch(attendanceTabProvider);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PageHeader(
            title: 'Attendance',
            subtitle: '${session.driverName} · ${session.routeName}',
          ),
          _AttendanceTabs(
            index: tab,
            onChanged: (i) =>
                ref.read(attendanceTabProvider.notifier).state = i,
          ),
          const SizedBox(height: AppSpacing.lg),
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            switchInCurve: Curves.easeOutCubic,
            child: switch (tab) {
              0 => MarkAttendanceView(
                key: const ValueKey('mark'),
                maxListHeight: MediaQuery.sizeOf(context).height * 0.48,
              ),
              1 => SizedBox(
                key: const ValueKey('history'),
                height: MediaQuery.sizeOf(context).height * 0.55,
                child: const AttendanceHistoryView(),
              ),
              2 => const AttendanceSummaryView(key: ValueKey('summary')),
              _ => const SizedBox.shrink(),
            },
          ),
        ],
      ),
    );
  }
}

class _AttendanceTabs extends StatelessWidget {
  const _AttendanceTabs({required this.index, required this.onChanged});

  final int index;
  final ValueChanged<int> onChanged;

  static const _labels = ['Mark', 'History', 'Summary'];

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<int>(
      segments: [
        for (var i = 0; i < _labels.length; i++)
          ButtonSegment(value: i, label: Text(_labels[i])),
      ],
      selected: {index},
      onSelectionChanged: (s) => onChanged(s.first),
    );
  }
}
