import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import '../models/student_models.dart';
import 'students_controller.dart';
import 'widgets/student_avatar.dart';
import 'widgets/students_error_view.dart';
import 'widgets/students_loading_view.dart';

class StudentDetailPage extends ConsumerWidget {
  const StudentDetailPage({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(studentProfileProvider(studentId));

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(studentProfileProvider(studentId)),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: profileAsync.when(
          loading: () => const StudentsLoadingView(count: 3),
          error: (e, _) => StudentsErrorView(
            message: e.toString(),
            onRetry: () => ref.invalidate(studentProfileProvider(studentId)),
          ),
          data: (profile) {
            if (profile == null) return _NotFound(onBack: () => Navigator.pop(context));
            return _StudentProfileBody(profile: profile);
          },
        ),
      ),
    );
  }
}

class _StudentProfileBody extends StatelessWidget {
  const _StudentProfileBody({required this.profile});

  final StudentProfileDetail profile;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => Navigator.of(context).pop(),
            ),
            Text(
              'Student profile',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        Center(
          child: StudentPhotoHeader(
            initials: profile.initials,
            color: profile.avatarColor,
            name: profile.name,
            rollNo: profile.rollNo,
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        LxCard(
          child: Column(
            children: [
              _InfoRow(
                icon: Icons.badge_outlined,
                label: 'Roll number',
                value: profile.rollNo,
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.class_outlined,
                label: 'Class',
                value: profile.classLabel,
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.route,
                label: 'Route',
                value: '${profile.routeLabel} (${profile.routeCode})',
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.location_on_outlined,
                label: 'Pickup stop',
                value: profile.pickupStop,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        LxCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.contact_phone_outlined,
                      size: 18, color: AppColors.primary),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Parent contact',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                profile.parentName,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                profile.parentPhone,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: AppSpacing.lg),
              LxButton(
                label: 'Call parent',
                icon: Icons.phone,
                expanded: true,
                onPressed: () => _callParent(context, profile.parentPhone),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _callParent(BuildContext context, String phone) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Calling $phone…'),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'OK',
            onPressed: () {},
          ),
        ),
      );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.55),
                    ),
              ),
              const SizedBox(height: 2),
              Text(value, style: Theme.of(context).textTheme.bodyLarge),
            ],
          ),
        ),
      ],
    );
  }
}

class _NotFound extends StatelessWidget {
  const _NotFound({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        children: [
          const Icon(Icons.person_off_outlined, size: 40),
          const SizedBox(height: AppSpacing.lg),
          Text('Student not found', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.lg),
          TextButton(onPressed: onBack, child: const Text('Go back')),
        ],
      ),
    );
  }
}
