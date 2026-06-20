import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/components/lx_text_field.dart';
import '../routes_controller.dart';

class RouteSearchBar extends ConsumerStatefulWidget {
  const RouteSearchBar({super.key});

  @override
  ConsumerState<RouteSearchBar> createState() => _RouteSearchBarState();
}

class _RouteSearchBarState extends ConsumerState<RouteSearchBar> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: ref.read(routesSearchProvider));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(routesSearchProvider, (previous, next) {
      if (_controller.text != next) {
        _controller.text = next;
      }
    });

    return LxTextField(
      hint: 'Search routes, drivers, vehicles…',
      prefixIcon: Icons.search,
      controller: _controller,
      onChanged: (value) {
        ref.read(routesSearchProvider.notifier).state = value;
      },
    );
  }
}
