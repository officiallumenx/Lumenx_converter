import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/components/lx_text_field.dart';
import '../vehicles_controller.dart';

class VehicleSearchBar extends ConsumerStatefulWidget {
  const VehicleSearchBar({super.key});

  @override
  ConsumerState<VehicleSearchBar> createState() => _VehicleSearchBarState();
}

class _VehicleSearchBarState extends ConsumerState<VehicleSearchBar> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ref.read(vehiclesSearchProvider));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(vehiclesSearchProvider, (previous, next) {
      if (_controller.text != next) _controller.text = next;
    });

    return LxTextField(
      hint: 'Search registration, model, driver, route…',
      prefixIcon: Icons.search,
      controller: _controller,
      onChanged: (value) {
        ref.read(vehiclesSearchProvider.notifier).state = value;
      },
    );
  }
}
