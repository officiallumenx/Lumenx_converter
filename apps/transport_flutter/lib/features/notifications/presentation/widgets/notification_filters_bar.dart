import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/components/lx_filter_chip.dart';
import '../../models/notification_models.dart';
import '../notifications_controller.dart';

class NotificationFiltersBar extends ConsumerWidget {
  const NotificationFiltersBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final category = ref.watch(notificationsCategoryFilterProvider);
    final readFilter = ref.watch(notificationsReadFilterProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LxFilterBar(
          label: 'Filters',
          children: [
            LxFilterChip(
              label: 'All categories',
              selected: category == NotificationCategoryFilter.all,
              onTap: () => ref
                  .read(notificationsCategoryFilterProvider.notifier)
                  .state = NotificationCategoryFilter.all,
            ),
            LxFilterChip(
              label: 'Route Updates',
              selected: category == NotificationCategoryFilter.routeUpdate,
              onTap: () => ref
                  .read(notificationsCategoryFilterProvider.notifier)
                  .state = NotificationCategoryFilter.routeUpdate,
            ),
            LxFilterChip(
              label: 'Trip Updates',
              selected: category == NotificationCategoryFilter.tripUpdate,
              onTap: () => ref
                  .read(notificationsCategoryFilterProvider.notifier)
                  .state = NotificationCategoryFilter.tripUpdate,
            ),
            LxFilterChip(
              label: 'Attendance Alerts',
              selected: category == NotificationCategoryFilter.attendanceAlert,
              onTap: () => ref
                  .read(notificationsCategoryFilterProvider.notifier)
                  .state = NotificationCategoryFilter.attendanceAlert,
            ),
            LxFilterChip(
              label: 'System Alerts',
              selected: category == NotificationCategoryFilter.systemAlert,
              onTap: () => ref
                  .read(notificationsCategoryFilterProvider.notifier)
                  .state = NotificationCategoryFilter.systemAlert,
            ),
          ],
        ),
        const SizedBox(height: 12),
        LxFilterBar(
          children: [
            LxFilterChip(
              label: 'All',
              selected: readFilter == NotificationReadFilter.all,
              onTap: () => ref
                  .read(notificationsReadFilterProvider.notifier)
                  .state = NotificationReadFilter.all,
            ),
            LxFilterChip(
              label: 'Unread',
              selected: readFilter == NotificationReadFilter.unread,
              onTap: () => ref
                  .read(notificationsReadFilterProvider.notifier)
                  .state = NotificationReadFilter.unread,
            ),
            LxFilterChip(
              label: 'Read',
              selected: readFilter == NotificationReadFilter.read,
              onTap: () => ref
                  .read(notificationsReadFilterProvider.notifier)
                  .state = NotificationReadFilter.read,
            ),
          ],
        ),
      ],
    );
  }
}
