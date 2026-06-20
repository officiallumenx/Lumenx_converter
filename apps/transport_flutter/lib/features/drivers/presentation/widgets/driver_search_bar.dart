import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/components/lx_text_field.dart';
import '../drivers_controller.dart';

class DriverSearchBar extends ConsumerStatefulWidget {
  const DriverSearchBar({super.key});

  @override
  ConsumerState<DriverSearchBar> createState() => _DriverSearchBarState();
}

class _DriverSearchBarState extends ConsumerState<DriverSearchBar> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ref.read(driversSearchProvider));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(driversSearchProvider, (previous, next) {
      if (_controller.text != next) _controller.text = next;
    });

    return LxTextField(
      hint: 'Search name, employee ID, phone, route…',
      prefixIcon: Icons.search,
      controller: _controller,
      onChanged: (value) {
        ref.read(driversSearchProvider.notifier).state = value;
      },
    );
  }
}
