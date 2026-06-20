import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_button.dart';
import '../../../../shared/components/lx_card.dart';
import '../../../../shared/mock_data/mock_drivers.dart';
import '../attendance_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DriverLoginView extends ConsumerWidget {
  const DriverLoginView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Driver login',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Sign in to mark transport attendance for your assigned route.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.6),
              ),
        ),
        const SizedBox(height: AppSpacing.xxl),
        for (final driver in mockDrivers) ...[
          _DriverLoginCard(
            driverName: driver.name,
            routeHint: driver.routeId == 'RT-01' ? 'Route 01' : 'Route 02',
            onLogin: () => loginDriver(ref, driver.id),
          ),
          const SizedBox(height: AppSpacing.md),
        ],
      ],
    );
  }
}

class _DriverLoginCard extends StatelessWidget {
  const _DriverLoginCard({
    required this.driverName,
    required this.routeHint,
    required this.onLogin,
  });

  final String driverName;
  final String routeHint;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final narrow = constraints.maxWidth < 420;
          if (narrow) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor:
                          AppColors.primary.withValues(alpha: 0.12),
                      child: const Icon(Icons.badge, color: AppColors.primary),
                    ),
                    const SizedBox(width: AppSpacing.lg),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(driverName,
                              style: Theme.of(context).textTheme.titleMedium),
                          Text('Assigned · $routeHint',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                LxButton(
                  label: 'Login',
                  icon: Icons.login,
                  expanded: true,
                  onPressed: onLogin,
                ),
              ],
            );
          }

          return Row(
            children: [
              CircleAvatar(
                backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                child: const Icon(Icons.badge, color: AppColors.primary),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(driverName,
                        style: Theme.of(context).textTheme.titleMedium),
                    Text('Assigned · $routeHint',
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              LxButton(label: 'Login', icon: Icons.login, onPressed: onLogin),
            ],
          );
        },
      ),
    );
  }
}
