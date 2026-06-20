import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_button.dart';
import '../../../../shared/components/lx_card.dart';

class AttendanceActionBar extends StatelessWidget {
  const AttendanceActionBar({
    super.key,
    required this.presentCount,
    required this.droppedCount,
    required this.onboardCount,
    required this.totalCount,
    required this.onMarkAll,
    required this.onReset,
    required this.onSaveDraft,
    required this.onSubmit,
    this.isEditing = false,
    this.submitting = false,
    this.lastSavedAt,
  });

  final int presentCount;
  final int droppedCount;
  final int onboardCount;
  final int totalCount;
  final VoidCallback onMarkAll;
  final VoidCallback onReset;
  final VoidCallback onSaveDraft;
  final VoidCallback onSubmit;
  final bool isEditing;
  final bool submitting;
  final DateTime? lastSavedAt;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final narrow = constraints.maxWidth < 480;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _Stat(
                    label: 'Boarded',
                    value: '$presentCount',
                    color: AppColors.success,
                  ),
                  _Stat(
                    label: 'Dropped',
                    value: '$droppedCount',
                    color: AppColors.warning,
                  ),
                  _Stat(
                    label: 'Onboard',
                    value: '$onboardCount',
                    color: AppColors.primary,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              if (narrow) ...[
                LxButton(
                  label: 'Mark all boarded',
                  icon: Icons.done_all,
                  variant: LxButtonVariant.secondary,
                  expanded: true,
                  onPressed: onMarkAll,
                ),
                const SizedBox(height: AppSpacing.sm),
                LxButton(
                  label: 'Reset',
                  icon: Icons.restart_alt,
                  variant: LxButtonVariant.outline,
                  expanded: true,
                  onPressed: onReset,
                ),
                const SizedBox(height: AppSpacing.sm),
                LxButton(
                  label: 'Save draft',
                  icon: Icons.save_outlined,
                  variant: LxButtonVariant.ghost,
                  expanded: true,
                  onPressed: onSaveDraft,
                ),
              ] else
                Row(
                  children: [
                    Expanded(
                      child: LxButton(
                        label: 'Mark all boarded',
                        icon: Icons.done_all,
                        variant: LxButtonVariant.secondary,
                        onPressed: onMarkAll,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: LxButton(
                        label: 'Reset',
                        icon: Icons.restart_alt,
                        variant: LxButtonVariant.outline,
                        onPressed: onReset,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: LxButton(
                        label: 'Save draft',
                        icon: Icons.save_outlined,
                        variant: LxButtonVariant.ghost,
                        onPressed: onSaveDraft,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: AppSpacing.sm),
              if (lastSavedAt != null) ...[
                Text(
                  'Draft saved at ${_timeLabel(lastSavedAt!)}',
                  style: Theme.of(context).textTheme.labelSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.sm),
              ],
              LxButton(
                label: isEditing ? 'Save changes' : 'Submit attendance',
                icon: Icons.send,
                expanded: true,
                loading: submitting,
                onPressed: submitting ? null : onSubmit,
              ),
            ],
          );
        },
      ),
    );
  }

  String _timeLabel(DateTime time) {
    final hh = (time.hour % 12 == 0) ? 12 : time.hour % 12;
    final mm = time.minute.toString().padLeft(2, '0');
    final suffix = time.hour >= 12 ? 'PM' : 'AM';
    return '$hh:$mm $suffix';
  }
}

class _Stat extends StatelessWidget {
  const _Stat({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                color: color,
                fontWeight: FontWeight.w700,
              ),
        ),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}

class AssignedRouteBanner extends StatelessWidget {
  const AssignedRouteBanner({
    super.key,
    required this.routeName,
    required this.vehicleReg,
    required this.driverName,
    required this.studentCount,
  });

  final String routeName;
  final String vehicleReg;
  final String driverName;
  final int studentCount;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: const Icon(Icons.route, color: AppColors.primary),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Assigned route',
                  style: Theme.of(context).textTheme.labelSmall,
                ),
                Text(routeName, style: Theme.of(context).textTheme.titleMedium),
                Text(
                  '$driverName · $vehicleReg · $studentCount students',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
