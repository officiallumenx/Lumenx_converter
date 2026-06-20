import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../../../shared/models/trip.dart';
import '../../models/dashboard_snapshot.dart';
import 'dashboard_empty_trips_view.dart';

class DashboardTripsSection extends StatelessWidget {
  const DashboardTripsSection({super.key, required this.snapshot});

  final DashboardSnapshot snapshot;

  static final _timeFmt = DateFormat('h:mm a');

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'My runs today',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: AppSpacing.md),
        if (snapshot.myTripsToday.isEmpty)
          const DashboardEmptyTripsView()
        else
          LxCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (var i = 0; i < snapshot.myTripsToday.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  _TripRow(
                    trip: snapshot.myTripsToday[i],
                    timeLabel:
                        _timeFmt.format(snapshot.myTripsToday[i].scheduledAt),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _TripRow extends StatelessWidget {
  const _TripRow({required this.trip, required this.timeLabel});

  final Trip trip;
  final String timeLabel;

  @override
  Widget build(BuildContext context) {
    final (icon, color, label) = _statusVisuals(trip.status);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  trip.routeName,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  '$timeLabel · ${trip.vehicleReg ?? '—'}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
              if (trip.studentsOnBoard > 0)
                Text(
                  '${trip.studentsOnBoard} onboard',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
            ],
          ),
        ],
      ),
    );
  }

  (IconData, Color, String) _statusVisuals(TripStatus status) =>
      switch (status) {
        TripStatus.inProgress => (
            Icons.play_circle_filled,
            AppColors.success,
            'In progress',
          ),
        TripStatus.completed => (
            Icons.check_circle,
            AppColors.primary,
            'Completed',
          ),
        TripStatus.scheduled => (
            Icons.schedule,
            AppColors.mutedForeground,
            'Scheduled',
          ),
        TripStatus.delayed => (
            Icons.warning_amber_rounded,
            AppColors.warning,
            'Delayed',
          ),
        TripStatus.cancelled => (
            Icons.cancel,
            AppColors.destructive,
            'Cancelled',
          ),
      };
}
