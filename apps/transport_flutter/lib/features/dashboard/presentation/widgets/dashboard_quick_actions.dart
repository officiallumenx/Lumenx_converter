import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_button.dart';
import '../../../../shared/components/lx_section_card.dart';

class DashboardQuickActions extends StatelessWidget {
  const DashboardQuickActions({
    super.key,
    required this.onStartTrip,
    required this.onTakeAttendance,
    required this.onEndTrip,
    required this.onSos,
  });

  final VoidCallback onStartTrip;
  final VoidCallback onTakeAttendance;
  final VoidCallback onEndTrip;
  final VoidCallback onSos;

  @override
  Widget build(BuildContext context) {
    return LxSectionCard(
      title: 'Quick Actions',
      child: LayoutBuilder(
        builder: (context, constraints) {
          final stacked = constraints.maxWidth < 640;
          if (stacked) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                LxButton(
                  label: 'Start Trip',
                  icon: Icons.play_circle_outline,
                  expanded: true,
                  onPressed: onStartTrip,
                ),
                const SizedBox(height: AppSpacing.md),
                LxButton(
                  label: 'Take Attendance',
                  icon: Icons.fact_check_outlined,
                  expanded: true,
                  variant: LxButtonVariant.secondary,
                  onPressed: onTakeAttendance,
                ),
                const SizedBox(height: AppSpacing.md),
                LxButton(
                  label: 'End Trip',
                  icon: Icons.stop_circle_outlined,
                  expanded: true,
                  variant: LxButtonVariant.outline,
                  onPressed: onEndTrip,
                ),
                const SizedBox(height: AppSpacing.md),
                LxButton(
                  label: 'SOS',
                  icon: Icons.sos_outlined,
                  expanded: true,
                  variant: LxButtonVariant.destructive,
                  onPressed: onSos,
                ),
              ],
            );
          }

          return Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: LxButton(
                      label: 'Start Trip',
                      icon: Icons.play_circle_outline,
                      expanded: true,
                      onPressed: onStartTrip,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: LxButton(
                      label: 'Take Attendance',
                      icon: Icons.fact_check_outlined,
                      expanded: true,
                      variant: LxButtonVariant.secondary,
                      onPressed: onTakeAttendance,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: LxButton(
                      label: 'End Trip',
                      icon: Icons.stop_circle_outlined,
                      expanded: true,
                      variant: LxButtonVariant.outline,
                      onPressed: onEndTrip,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: LxButton(
                      label: 'SOS',
                      icon: Icons.sos_outlined,
                      expanded: true,
                      variant: LxButtonVariant.destructive,
                      onPressed: onSos,
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
