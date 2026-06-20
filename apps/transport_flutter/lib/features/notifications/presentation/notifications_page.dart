import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../shared/components/lx_search_field.dart';
import 'notifications_controller.dart';
import 'widgets/notification_card.dart';
import 'widgets/notification_filters_bar.dart';
import 'widgets/notifications_empty_view.dart';
import 'widgets/notifications_error_view.dart';
import 'widgets/notifications_loading_view.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  static final _timeFmt = DateFormat('dd MMM · h:mm a');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationsListControllerProvider);
    final filtered = ref.watch(filteredNotificationsProvider);
    final unreadCount = ref.watch(notificationsUnreadCountProvider);
    final query = ref.watch(notificationsSearchQueryProvider);

    return RefreshIndicator(
      onRefresh: () =>
          ref.read(notificationsListControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            PageHeader(
              title: 'Notifications',
              subtitle: unreadCount == 0
                  ? 'All caught up · ${notificationsAsync.valueOrNull?.length ?? 12} alerts'
                  : '$unreadCount unread · ${notificationsAsync.valueOrNull?.length ?? 12} total',
              actions: [
                TextButton.icon(
                  onPressed: unreadCount == 0
                      ? null
                      : () => ref
                          .read(notificationsListControllerProvider.notifier)
                          .markAllRead(),
                  icon: const Icon(Icons.done_all, size: 18),
                  label: const Text('Mark all read'),
                ),
              ],
            ),
            const NotificationFiltersBar(),
            const SizedBox(height: AppSpacing.md),
            LxSearchField(
              hint: 'Search notifications',
              onChanged: (value) =>
                  ref.read(notificationsSearchQueryProvider.notifier).state = value,
            ),
            if (query.trim().isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Searching for "$query"',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
            const SizedBox(height: AppSpacing.md),
            filtered.when(
              loading: () => const SizedBox.shrink(),
              error: (_, _) => const SizedBox.shrink(),
              data: (items) => Text(
                '${items.length} notification${items.length == 1 ? '' : 's'}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.55),
                    ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            notificationsAsync.when(
              loading: () => const NotificationsLoadingView(),
              error: (error, _) => NotificationsErrorView(
                message: error.toString(),
                onRetry: () => ref
                    .read(notificationsListControllerProvider.notifier)
                    .refresh(),
              ),
              data: (_) => filtered.when(
                loading: () => const NotificationsLoadingView(),
                error: (e, _) => NotificationsErrorView(
                  message: e.toString(),
                  onRetry: () => ref
                      .read(notificationsListControllerProvider.notifier)
                      .refresh(),
                ),
                data: (items) {
                  if (items.isEmpty) {
                    return NotificationsEmptyView(
                      onClearFilters: () => clearNotificationFilters(ref),
                    );
                  }

                  final controller =
                      ref.read(notificationsListControllerProvider.notifier);

                  return Column(
                    children: [
                      for (var i = 0; i < items.length; i++) ...[
                        if (i > 0) const SizedBox(height: AppSpacing.md),
                        NotificationCard(
                          item: items[i],
                          timeLabel: _timeFmt.format(items[i].createdAt),
                          onTap: () {
                            if (!items[i].read) {
                              controller.markRead(items[i].id);
                            }
                          },
                          onMarkRead: () => controller.markRead(items[i].id),
                        ),
                      ],
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
