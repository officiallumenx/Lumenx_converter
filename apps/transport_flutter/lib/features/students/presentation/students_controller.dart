import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/students_repository.dart';
import '../models/student_models.dart';

final studentsRepositoryProvider = Provider((ref) => StudentsRepository());

final studentsSearchProvider = StateProvider<String>((ref) => '');

final studentsRouteFilterProvider =
    StateProvider<StudentRouteFilter>((ref) => StudentRouteFilter.all);

final studentsClassFilterProvider =
    StateProvider<StudentClassFilter>((ref) => StudentClassFilter.all);

class StudentsListController extends AsyncNotifier<List<StudentListItem>> {
  @override
  Future<List<StudentListItem>> build() async {
    return ref.read(studentsRepositoryProvider).loadStudents();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(studentsRepositoryProvider).loadStudents(),
    );
  }
}

final studentsListControllerProvider =
    AsyncNotifierProvider<StudentsListController, List<StudentListItem>>(
  StudentsListController.new,
);

final filteredStudentsProvider =
    Provider<AsyncValue<List<StudentListItem>>>((ref) {
  final students = ref.watch(studentsListControllerProvider);
  final query = ref.watch(studentsSearchProvider);
  final route = ref.watch(studentsRouteFilterProvider);
  final classFilter = ref.watch(studentsClassFilterProvider);

  return students.whenData(
    (items) => items
        .where((item) => matchesStudentSearch(item, query.trim()))
        .where((item) => matchesRouteFilter(item, route))
        .where((item) => matchesClassFilter(item, classFilter))
        .toList(),
  );
});

final studentProfileProvider =
    FutureProvider.autoDispose.family<StudentProfileDetail?, String>((ref, id) {
  return ref.read(studentsRepositoryProvider).loadStudentProfile(id);
});

void clearStudentFilters(WidgetRef ref) {
  ref.read(studentsSearchProvider.notifier).state = '';
  ref.read(studentsRouteFilterProvider.notifier).state =
      StudentRouteFilter.all;
  ref.read(studentsClassFilterProvider.notifier).state =
      StudentClassFilter.all;
}
