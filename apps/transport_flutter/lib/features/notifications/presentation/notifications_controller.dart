import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/session/driver_app_session.dart';
import '../data/notifications_repository.dart';
import '../models/notification_models.dart';

final notificationsRepositoryProvider =
    Provider((ref) => NotificationsRepository());

final notificationsCategoryFilterProvider =
    StateProvider<NotificationCategoryFilter>(
  (ref) => NotificationCategoryFilter.all,
);

final notificationsReadFilterProvider =
    StateProvider<NotificationReadFilter>((ref) => NotificationReadFilter.all);
final notificationsSearchQueryProvider = StateProvider<String>((ref) => '');

class NotificationsListController
    extends AsyncNotifier<List<NotificationListItem>> {
  @override
  Future<List<NotificationListItem>> build() async {
    return ref.read(notificationsRepositoryProvider).loadNotifications();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(notificationsRepositoryProvider).loadNotifications(),
    );
  }

  Future<void> markRead(String id) async {
    ref.read(notificationsRepositoryProvider).markRead(id);
    state = AsyncValue.data(
      ref.read(notificationsRepositoryProvider).loadNotificationsSync(),
    );
  }

  Future<void> markAllRead() async {
    ref.read(notificationsRepositoryProvider).markAllRead();
    state = AsyncValue.data(
      ref.read(notificationsRepositoryProvider).loadNotificationsSync(),
    );
  }
}

final notificationsListControllerProvider = AsyncNotifierProvider<
    NotificationsListController, List<NotificationListItem>>(
  NotificationsListController.new,
);

final filteredNotificationsProvider =
    Provider<AsyncValue<List<NotificationListItem>>>((ref) {
  final notifications = ref.watch(notificationsListControllerProvider);
  final category = ref.watch(notificationsCategoryFilterProvider);
  final readFilter = ref.watch(notificationsReadFilterProvider);
  final searchQuery = ref.watch(notificationsSearchQueryProvider).trim().toLowerCase();
  final session = ref.watch(activeDriverSessionProvider);

  return notifications.whenData(
    (items) => items
        .where((item) => matchesDriverNotification(item, session))
        .where((item) => matchesCategoryFilter(item, category))
        .where((item) => matchesReadFilter(item, readFilter))
        .where((item) {
          if (searchQuery.isEmpty) return true;
          final blob = '${item.title} ${item.body}'.toLowerCase();
          return blob.contains(searchQuery);
        })
        .toList(),
  );
});

final notificationsUnreadCountProvider = Provider<int>((ref) {
  final filtered = ref.watch(filteredNotificationsProvider);
  return filtered.valueOrNull?.where((n) => !n.read).length ?? 0;
});

void clearNotificationFilters(WidgetRef ref) {
  ref.read(notificationsCategoryFilterProvider.notifier).state =
      NotificationCategoryFilter.all;
  ref.read(notificationsReadFilterProvider.notifier).state =
      NotificationReadFilter.all;
  ref.read(notificationsSearchQueryProvider.notifier).state = '';
}
