import 'package:flutter/material.dart';

import '../../../../shared/components/lx_empty_state.dart';

class DashboardEmptyStateView extends StatelessWidget {
  const DashboardEmptyStateView({super.key});

  @override
  Widget build(BuildContext context) {
    return const LxEmptyState(
      icon: Icons.directions_bus_outlined,
      title: 'No route assigned yet',
      description:
          'Your assigned route and vehicle will appear here after transport admin publishes today\'s roster.',
    );
  }
}
