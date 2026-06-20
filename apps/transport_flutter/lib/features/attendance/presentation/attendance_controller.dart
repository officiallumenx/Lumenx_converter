import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/offline/offline_sync.dart';
import '../data/attendance_repository.dart';
import '../models/attendance_models.dart';

final driverSessionProvider = StateProvider<DriverSession?>((ref) => null);

final attendanceRevisionProvider = StateProvider<int>((ref) => 0);
final attendanceSearchQueryProvider = StateProvider<String>((ref) => '');
final attendanceMarkPhaseProvider = StateProvider<AttendanceMarkPhase>(
  (ref) => AttendanceMarkPhase.boarding,
);
final savedAttendanceDraftsProvider =
    StateProvider<Map<String, AttendanceMarkingDraft>>((ref) => {});

final attendanceHistoryProvider = Provider<List<AttendanceSubmission>>((ref) {
  ref.watch(attendanceRevisionProvider);
  final session = ref.watch(driverSessionProvider);
  if (session == null) return const [];
  return ref
      .read(attendanceRepositoryProvider)
      .getHistory()
      .where((h) => h.routeId == session.routeId)
      .toList();
});

final attendanceSummaryProvider = Provider<AttendanceSummaryStats?>((ref) {
  ref.watch(attendanceRevisionProvider);
  final session = ref.watch(driverSessionProvider);
  if (session == null) return null;
  return ref.read(attendanceRepositoryProvider).summaryStats(session.routeId);
});

class AttendanceMarkingController extends Notifier<AttendanceMarkingDraft?> {
  @override
  AttendanceMarkingDraft? build() => null;

  void startSession(DriverSession session, {AttendanceSubmission? existing}) {
    final repo = ref.read(attendanceRepositoryProvider);
    final students = repo.studentsForRoute(session.routeId);
    final savedDraft = ref.read(savedAttendanceDraftsProvider)[session.routeId];
    final presentIds =
        existing?.presentStudentIds ?? savedDraft?.presentIds ?? <String>{};
    final droppedIds =
        existing?.droppedStudentIds ?? savedDraft?.droppedIds ?? <String>{};

    state = AttendanceMarkingDraft(
      students: students,
      presentIds: Set.from(presentIds),
      droppedIds: Set.from(droppedIds),
      editingSubmissionId: existing?.id,
      lastSavedAt: savedDraft?.lastSavedAt,
    );
    ref.read(attendanceSearchQueryProvider.notifier).state = '';
    ref.read(attendanceMarkPhaseProvider.notifier).state =
        AttendanceMarkPhase.boarding;
  }

  void togglePresent(String studentId) {
    final draft = state;
    if (draft == null) return;
    final next = Set<String>.from(draft.presentIds);
    final dropped = Set<String>.from(draft.droppedIds);
    if (next.contains(studentId)) {
      next.remove(studentId);
      dropped.remove(studentId);
    } else {
      next.add(studentId);
    }
    state = draft.copyWith(presentIds: next, droppedIds: dropped);
  }

  void toggleDropped(String studentId) {
    final draft = state;
    if (draft == null) return;
    if (!draft.presentIds.contains(studentId)) return;

    final next = Set<String>.from(draft.droppedIds);
    if (next.contains(studentId)) {
      next.remove(studentId);
    } else {
      next.add(studentId);
    }
    state = draft.copyWith(droppedIds: next);
  }

  void markAllPresent() {
    final draft = state;
    if (draft == null) return;
    state = draft.copyWith(
      presentIds: draft.students.map((s) => s.id).toSet(),
      droppedIds: draft.droppedIds
          .where((id) => draft.students.any((s) => s.id == id))
          .toSet(),
    );
  }

  void reset() {
    final draft = state;
    if (draft == null) return;
    state = draft.copyWith(presentIds: {}, droppedIds: {});
  }

  void resetDropped() {
    final draft = state;
    if (draft == null) return;
    state = draft.copyWith(droppedIds: {});
  }

  AttendanceSubmission? submit() {
    final draft = state;
    final session = ref.read(driverSessionProvider);
    if (draft == null || session == null) return null;

    final submission = ref
        .read(attendanceRepositoryProvider)
        .submit(
          session: session,
          presentIds: draft.presentIds,
          droppedIds: draft.droppedIds,
          allStudentIds: draft.students.map((s) => s.id).toList(),
          existingId: draft.editingSubmissionId,
        );

    ref
        .read(offlineSyncProvider.notifier)
        .recordLocalChange(
          entity: SyncEntityType.attendance,
          summary: 'Attendance for ${session.routeName}',
        );

    state = draft.copyWith(editingSubmissionId: submission.id);
    _clearSavedDraft();
    ref.read(attendanceRevisionProvider.notifier).state++;
    return submission;
  }

  void saveDraft() {
    final draft = state;
    final session = ref.read(driverSessionProvider);
    if (draft == null || session == null) return;

    final next = draft.copyWith(lastSavedAt: DateTime.now());
    state = next;
    final currentMap = Map<String, AttendanceMarkingDraft>.from(
      ref.read(savedAttendanceDraftsProvider),
    );
    currentMap[session.routeId] = next;
    ref.read(savedAttendanceDraftsProvider.notifier).state = currentMap;
  }

  void loadForEdit(AttendanceSubmission submission) {
    final session = ref.read(driverSessionProvider);
    if (session == null) return;
    startSession(session, existing: submission);
  }

  void clearSession() {
    state = null;
    ref.read(attendanceSearchQueryProvider.notifier).state = '';
    ref.read(attendanceMarkPhaseProvider.notifier).state =
        AttendanceMarkPhase.boarding;
  }

  void _clearSavedDraft() {
    final session = ref.read(driverSessionProvider);
    if (session == null) return;
    final currentMap = Map<String, AttendanceMarkingDraft>.from(
      ref.read(savedAttendanceDraftsProvider),
    );
    currentMap.remove(session.routeId);
    ref.read(savedAttendanceDraftsProvider.notifier).state = currentMap;
  }
}

final attendanceMarkingProvider =
    NotifierProvider<AttendanceMarkingController, AttendanceMarkingDraft?>(
      AttendanceMarkingController.new,
    );

final attendanceTabProvider = StateProvider<int>((ref) => 0);

void loginDriver(WidgetRef ref, String driverId) {
  final session = ref
      .read(attendanceRepositoryProvider)
      .sessionForDriver(driverId);
  ref.read(driverSessionProvider.notifier).state = session;

  final today = ref
      .read(attendanceRepositoryProvider)
      .todaySubmission(session.routeId);
  ref
      .read(attendanceMarkingProvider.notifier)
      .startSession(session, existing: today);
  ref.read(attendanceTabProvider.notifier).state = 0;
}

void logoutDriver(WidgetRef ref) {
  ref.read(driverSessionProvider.notifier).state = null;
  ref.read(attendanceMarkingProvider.notifier).clearSession();
  ref.read(attendanceTabProvider.notifier).state = 0;
}
