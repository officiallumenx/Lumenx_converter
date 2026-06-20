import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_spacing.dart';
import 'profile_controller.dart';
import 'widgets/profile_setting_toggle.dart';
import 'widgets/profile_shared_widgets.dart';

class NotificationSettingsPage extends ConsumerWidget {
  const NotificationSettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(notificationSettingsControllerProvider);
    final controller =
        ref.read(notificationSettingsControllerProvider.notifier);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProfileSubpageHeader(title: 'Notification settings'),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Choose which transport alerts you receive.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.55),
                ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Categories',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          ProfileSettingToggle(
            title: 'Route Updates',
            subtitle: 'Trip departures, delays, schedule changes',
            icon: Icons.route,
            value: settings.routeUpdates,
            onChanged: controller.setRouteUpdates,
          ),
          const SizedBox(height: AppSpacing.sm),
          ProfileSettingToggle(
            title: 'Attendance Alerts',
            subtitle: 'Missing submissions and low attendance',
            icon: Icons.fact_check_outlined,
            value: settings.attendanceAlerts,
            onChanged: controller.setAttendanceAlerts,
          ),
          const SizedBox(height: AppSpacing.sm),
          ProfileSettingToggle(
            title: 'Vehicle Alerts',
            subtitle: 'Maintenance, service, and fleet status',
            icon: Icons.directions_bus_outlined,
            value: settings.vehicleAlerts,
            onChanged: controller.setVehicleAlerts,
          ),
          const SizedBox(height: AppSpacing.sm),
          ProfileSettingToggle(
            title: 'Transport Alerts',
            subtitle: 'Driver check-ins, admin, and general notices',
            icon: Icons.campaign_outlined,
            value: settings.transportAlerts,
            onChanged: controller.setTransportAlerts,
          ),
          const SizedBox(height: AppSpacing.xxl),
          Text(
            'Delivery',
            style: Theme.of(context).textTheme.labelMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          ProfileSettingToggle(
            title: 'Push notifications',
            subtitle: 'Instant alerts on this device',
            icon: Icons.notifications_active_outlined,
            value: settings.pushNotifications,
            onChanged: controller.setPushNotifications,
          ),
          const SizedBox(height: AppSpacing.sm),
          ProfileSettingToggle(
            title: 'Daily email digest',
            subtitle: 'Summary at 6:00 PM on school days',
            icon: Icons.mail_outline,
            value: settings.emailDigest,
            onChanged: controller.setEmailDigest,
          ),
        ],
      ),
    );
  }
}
