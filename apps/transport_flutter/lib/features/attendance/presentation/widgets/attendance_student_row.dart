import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../models/attendance_models.dart';

class AttendanceStudentRow extends StatelessWidget {
  const AttendanceStudentRow({
    super.key,
    required this.student,
    required this.isBoarded,
    required this.isDropped,
    required this.markPhase,
    required this.onTap,
    required this.onCallParent,
  });

  final AttendanceStudent student;
  final bool isBoarded;
  final bool isDropped;
  final AttendanceMarkPhase markPhase;
  final VoidCallback onTap;
  final VoidCallback onCallParent;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isDropped
          ? AppColors.warning.withValues(alpha: 0.1)
          : isBoarded
          ? AppColors.success.withValues(alpha: 0.08)
          : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 120),
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isBoarded
                      ? (isDropped ? AppColors.warning : AppColors.success)
                      : AppColors.muted,
                  border: Border.all(
                    color: isBoarded
                        ? (isDropped ? AppColors.warning : AppColors.success)
                        : AppColors.border,
                    width: 2,
                  ),
                ),
                child: Icon(
                  isDropped
                      ? Icons.logout
                      : isBoarded
                          ? Icons.check
                          : Icons.person_outline,
                  color: isBoarded ? Colors.white : AppColors.mutedForeground,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.name,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Roll ${student.rollNo} · ${student.classLabel}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      student.stopName,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.5),
                          ),
                    ),
                  ],
                ),
              ),
              Text(
                isDropped
                    ? 'Dropped'
                    : isBoarded
                        ? 'Boarded'
                        : 'Absent',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDropped
                      ? AppColors.warning
                      : isBoarded
                          ? AppColors.success
                          : AppColors.destructive,
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              IconButton(
                tooltip: 'Call parent',
                icon: const Icon(Icons.call_outlined, size: 18),
                onPressed: onCallParent,
              ),
              const SizedBox(width: AppSpacing.xs),
              IconButton(
                tooltip: markPhase == AttendanceMarkPhase.boarding
                    ? 'Tap to mark boarded'
                    : 'Tap to mark dropped',
                icon: Icon(
                  markPhase == AttendanceMarkPhase.boarding
                      ? Icons.login
                      : Icons.logout,
                  size: 18,
                ),
                onPressed: onTap,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
