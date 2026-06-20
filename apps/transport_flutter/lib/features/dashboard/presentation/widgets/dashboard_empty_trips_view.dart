import 'package:flutter/material.dart';

import '../../../../shared/components/lx_empty_state.dart';

class DashboardEmptyTripsView extends StatelessWidget {
  const DashboardEmptyTripsView({super.key});

  @override
  Widget build(BuildContext context) {
    return const LxEmptyState(
      icon: Icons.event_busy_outlined,
      title: 'No runs scheduled today',
      description:
          'Your morning and afternoon trips will appear here when assigned by transport admin.',
    );
  }
}
