import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/components/lx_text_field.dart';
import '../students_controller.dart';

class StudentSearchBar extends ConsumerStatefulWidget {
  const StudentSearchBar({super.key});

  @override
  ConsumerState<StudentSearchBar> createState() => _StudentSearchBarState();
}

class _StudentSearchBarState extends ConsumerState<StudentSearchBar> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ref.read(studentsSearchProvider));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(studentsSearchProvider, (previous, next) {
      if (_controller.text != next) _controller.text = next;
    });

    return LxTextField(
      hint: 'Search name, roll, route, class…',
      prefixIcon: Icons.search,
      controller: _controller,
      onChanged: (value) {
        ref.read(studentsSearchProvider.notifier).state = value;
      },
    );
  }
}
