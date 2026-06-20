import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/models/driver.dart';
import '../models/driver_models.dart';
import 'drivers_controller.dart';
import 'widgets/driver_avatar.dart';
import 'widgets/drivers_error_view.dart';
import 'widgets/drivers_loading_view.dart';

class DriverDetailPage extends ConsumerWidget {
  const DriverDetailPage({super.key, required this.driverId});

  final String driverId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(driverProfileProvider(driverId));

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(driverProfileProvider(driverId)),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: profileAsync.when(
          loading: () => const DriversLoadingView(count: 2),
          error: (e, _) => DriversErrorView(
            message: e.toString(),
            onRetry: () => ref.invalidate(driverProfileProvider(driverId)),
          ),
          data: (profile) {
            if (profile == null) {
              return _NotFound(onBack: () => Navigator.of(context).pop());
            }
            return _DriverProfileBody(profile: profile);
          },
        ),
      ),
    );
  }
}

class _DriverProfileBody extends StatelessWidget {
  const _DriverProfileBody({required this.profile});

  final DriverProfileDetail profile;

  @override
  Widget build(BuildContext context) {
    final status = _statusStyle(profile.status);

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
              'Driver details',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        Center(
          child: Column(
            children: [
              DriverPhotoHeader(
                initials: profile.listItem.initials,
                color: profile.listItem.avatarColor,
                name: profile.name,
                employeeId: profile.employeeId,
              ),
              const SizedBox(height: AppSpacing.sm),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: status.bg,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Text(
                  status.label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: status.fg,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        LxCard(
          child: Column(
            children: [
              _InfoRow(
                icon: Icons.person_outline,
                label: 'Name',
                value: profile.name,
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.badge_outlined,
                label: 'Employee ID',
                value: profile.employeeId,
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.phone_outlined,
                label: 'Phone',
                value: profile.phone,
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.route,
                label: 'Assigned route',
                value: profile.driver.routeId != null
                    ? '${profile.routeLabel}${profile.routeCode != null ? ' (${profile.routeCode})' : ''}'
                    : 'Unassigned',
              ),
              const Divider(height: AppSpacing.xxl),
              _InfoRow(
                icon: Icons.directions_bus_outlined,
                label: 'Assigned vehicle',
                value: profile.vehicleReg ?? 'Not assigned',
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
                    'Contact',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                profile.phone,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              if (profile.licenseNo != null) ...[
                const SizedBox(height: AppSpacing.sm),
                Text(
                  'License ${profile.licenseNo}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.55),
                      ),
                ),
              ],
              const SizedBox(height: AppSpacing.lg),
              LxButton(
                label: 'Call driver',
                icon: Icons.phone,
                expanded: true,
                onPressed: () => _callDriver(context, profile.phone),
              ),
            ],
          ),
        ),
        if (profile.studentCount != null) ...[
          const SizedBox(height: AppSpacing.lg),
          LxCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.groups_outlined,
                        size: 18, color: AppColors.primary),
                    const SizedBox(width: AppSpacing.sm),
                    Text(
                      'Route assignment',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                _InfoRow(
                  icon: Icons.school_outlined,
                  label: 'Students on route',
                  value: '${profile.studentCount}',
                ),
                if (profile.vehicleModel != null) ...[
                  const Divider(height: AppSpacing.xxl),
                  _InfoRow(
                    icon: Icons.info_outline,
                    label: 'Vehicle model',
                    value: profile.vehicleModel!,
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }

  void _callDriver(BuildContext context, String phone) {
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

  ({String label, Color bg, Color fg}) _statusStyle(DriverStatus status) =>
      switch (status) {
        DriverStatus.active => (
            label: 'Active',
            bg: AppColors.success.withValues(alpha: 0.12),
            fg: AppColors.success,
          ),
        DriverStatus.onLeave => (
            label: 'On leave',
            bg: AppColors.warning.withValues(alpha: 0.15),
            fg: AppColors.warning,
          ),
        DriverStatus.inactive => (
            label: 'Inactive',
            bg: AppColors.muted,
            fg: AppColors.mutedForeground,
          ),
      };
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
          Text(
            'Driver not found',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.lg),
          TextButton(onPressed: onBack, child: const Text('Go back')),
        ],
      ),
    );
  }
}
