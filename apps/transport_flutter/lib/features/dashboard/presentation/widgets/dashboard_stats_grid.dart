import 'package:flutter/material.dart';

import '../../../../core/constants/breakpoints.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_stat_card.dart';
import '../../models/dashboard_snapshot.dart';

class DashboardStatsGrid extends StatelessWidget {
  const DashboardStatsGrid({super.key, required this.snapshot});

  final DashboardSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final cols = width >= Breakpoints.gridComfortable ? 4 : 2;
        final ratio = cols == 4 ? 1.15 : 1.0;

        return GridView.count(
          crossAxisCount: cols,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.md,
          crossAxisSpacing: AppSpacing.md,
          childAspectRatio: ratio,
          children: [
            LxStatCard(
              label: 'Assigned route',
              value: snapshot.routeName,
              icon: Icons.route,
              tone: LxStatTone.primary,
              hint: snapshot.routeId,
            ),
            LxStatCard(
              label: 'Assigned vehicle',
              value: snapshot.vehicleReg,
              icon: Icons.directions_bus,
              tone: LxStatTone.success,
              hint: 'Assigned bus',
            ),
            LxStatCard(
              label: 'Today\'s students',
              value: '${snapshot.studentsOnRoute}',
              icon: Icons.groups,
              tone: LxStatTone.defaultTone,
              hint: 'Expected riders',
            ),
            LxStatCard(
              label: 'Trip status',
              value: snapshot.tripStatusLabel,
              icon: Icons.trip_origin,
              tone: snapshot.activeTrip != null
                  ? LxStatTone.success
                  : LxStatTone.warning,
              hint: snapshot.tripStatusHint,
            ),
            LxStatCard(
              label: 'Today\'s attendance',
              value: snapshot.attendanceValue,
              icon: Icons.fact_check,
              tone: snapshot.attendanceSubmitted
                  ? LxStatTone.success
                  : LxStatTone.warning,
              hint: snapshot.attendanceHint,
            ),
          ],
        );
      },
    );
  }
}
