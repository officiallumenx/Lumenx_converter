import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../../../shared/components/lx_search_field.dart';
import '../../models/attendance_models.dart';
import '../attendance_controller.dart';
import 'attendance_action_bar.dart';
import 'attendance_student_row.dart';

class MarkAttendanceView extends ConsumerStatefulWidget {
  const MarkAttendanceView({
    super.key,
    required this.maxListHeight,
  });

  final double maxListHeight;

  @override
  ConsumerState<MarkAttendanceView> createState() => _MarkAttendanceViewState();
}

class _MarkAttendanceViewState extends ConsumerState<MarkAttendanceView> {
  bool _submitting = false;
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(driverSessionProvider);
    final draft = ref.watch(attendanceMarkingProvider);
    final query = ref.watch(attendanceSearchQueryProvider);
    final phase = ref.watch(attendanceMarkPhaseProvider);

    if (session == null || draft == null) {
      return const Center(child: Text('Session not ready'));
    }

    final isEditing = draft.editingSubmissionId != null;
    final filteredStudents = _filterStudents(draft, query);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        AssignedRouteBanner(
          routeName: session.routeName,
          vehicleReg: session.vehicleReg,
          driverName: session.driverName,
          studentCount: draft.students.length,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          phase == AttendanceMarkPhase.boarding
              ? 'Student List -> Tap Student -> Boarded'
              : 'Student List -> Tap Student -> Dropped',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: isEditing
                    ? Theme.of(context).colorScheme.primary
                    : Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.6),
                fontWeight: isEditing ? FontWeight.w600 : FontWeight.normal,
              ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _PhaseToggle(
          phase: phase,
          onChanged: (next) =>
              ref.read(attendanceMarkPhaseProvider.notifier).state = next,
        ),
        const SizedBox(height: AppSpacing.md),
        _TripSummaryCard(draft: draft),
        const SizedBox(height: AppSpacing.md),
        LxSearchField(
          hint: 'Search by name, roll no, stop',
          controller: _searchController,
          onChanged: (value) =>
              ref.read(attendanceSearchQueryProvider.notifier).state = value,
        ),
        const SizedBox(height: AppSpacing.md),
        LxCard(
          padding: EdgeInsets.zero,
          child: SizedBox(
            height: widget.maxListHeight,
            child: filteredStudents.isEmpty
                ? const Center(
                    child: Text('No students match your search.'),
                  )
                : ListView.separated(
                    itemCount: filteredStudents.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final student = filteredStudents[index];
                      final isBoarded = draft.presentIds.contains(student.id);
                      final isDropped = draft.droppedIds.contains(student.id);
                      return AttendanceStudentRow(
                        key: ValueKey(student.id),
                        student: student,
                        isBoarded: isBoarded,
                        isDropped: isDropped,
                        markPhase: phase,
                        onTap: () {
                          final notifier =
                              ref.read(attendanceMarkingProvider.notifier);
                          if (phase == AttendanceMarkPhase.boarding) {
                            notifier.togglePresent(student.id);
                          } else {
                            notifier.toggleDropped(student.id);
                          }
                        },
                        onCallParent: () => _callParent(context, student.parentPhone),
                      );
                    },
                  ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AttendanceActionBar(
          presentCount: draft.boardedCount,
          droppedCount: draft.droppedCount,
          onboardCount: draft.onboardCount,
          totalCount: draft.students.length,
          isEditing: isEditing,
          submitting: _submitting,
          onMarkAll: () =>
              ref.read(attendanceMarkingProvider.notifier).markAllPresent(),
          onReset: () {
            if (phase == AttendanceMarkPhase.boarding) {
              ref.read(attendanceMarkingProvider.notifier).reset();
            } else {
              ref.read(attendanceMarkingProvider.notifier).resetDropped();
            }
          },
          onSaveDraft: () => _saveDraft(context),
          onSubmit: () => _submit(context),
          lastSavedAt: draft.lastSavedAt,
        ),
      ],
    );
  }

  List<AttendanceStudent> _filterStudents(
    AttendanceMarkingDraft draft,
    String query,
  ) {
    if (query.trim().isEmpty) return draft.students;
    final needle = query.trim().toLowerCase();
    return draft.students.where((student) {
      return student.name.toLowerCase().contains(needle) ||
          student.rollNo.toLowerCase().contains(needle) ||
          student.stopName.toLowerCase().contains(needle);
    }).toList(growable: false);
  }

  Future<void> _submit(BuildContext context) async {
    if (_submitting) return;
    setState(() => _submitting = true);

    final draft = ref.read(attendanceMarkingProvider);
    final submission =
        ref.read(attendanceMarkingProvider.notifier).submit();

    if (!mounted) return;
    setState(() => _submitting = false);

    if (submission == null) return;

    final isEdit = draft?.editingSubmissionId != null;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            isEdit
                ? 'Updated · ${submission.boardedCount} boarded, ${submission.droppedCount} dropped'
                : 'Submitted · ${submission.boardedCount} boarded, ${submission.droppedCount} dropped',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );

    ref.read(attendanceTabProvider.notifier).state = 2;
  }

  Future<void> _callParent(BuildContext context, String parentPhone) async {
    final normalized = parentPhone.replaceAll(' ', '');
    final uri = Uri(scheme: 'tel', path: normalized);
    if (!await launchUrl(uri)) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text('Could not launch dialer for $parentPhone'),
            behavior: SnackBarBehavior.floating,
          ),
        );
    }
  }

  void _saveDraft(BuildContext context) {
    ref.read(attendanceMarkingProvider.notifier).saveDraft();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Draft saved. You can submit later.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }
}

class _PhaseToggle extends StatelessWidget {
  const _PhaseToggle({
    required this.phase,
    required this.onChanged,
  });

  final AttendanceMarkPhase phase;
  final ValueChanged<AttendanceMarkPhase> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<AttendanceMarkPhase>(
      segments: const [
        ButtonSegment(
          value: AttendanceMarkPhase.boarding,
          icon: Icon(Icons.login),
          label: Text('Boarding'),
        ),
        ButtonSegment(
          value: AttendanceMarkPhase.drop,
          icon: Icon(Icons.logout),
          label: Text('Drop'),
        ),
      ],
      selected: {phase},
      onSelectionChanged: (value) => onChanged(value.first),
    );
  }
}

class _TripSummaryCard extends StatelessWidget {
  const _TripSummaryCard({required this.draft});

  final AttendanceMarkingDraft draft;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _TripStat(label: 'Boarded', value: '${draft.boardedCount}'),
          _TripStat(label: 'Dropped', value: '${draft.droppedCount}'),
          _TripStat(label: 'Onboard', value: '${draft.onboardCount}'),
        ],
      ),
    );
  }
}

class _TripStat extends StatelessWidget {
  const _TripStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall,
        ),
      ],
    );
  }
}
