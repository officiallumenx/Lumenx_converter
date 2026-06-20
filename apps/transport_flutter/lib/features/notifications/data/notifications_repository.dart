import '../../../shared/mock_data/mock_notifications.dart';
import '../../../shared/models/notification_item.dart';
import '../../attendance/models/attendance_models.dart';
import '../models/notification_models.dart';

List<NotificationListItem> buildNotificationListItems(
  List<NotificationItem> items,
) {
  return items.map((n) => NotificationListItem(notification: n)).toList();
}

bool matchesCategoryFilter(
  NotificationListItem item,
  NotificationCategoryFilter filter,
) {
  final type = filter.type;
  if (type == null) return true;
  return item.type == type;
}

bool matchesReadFilter(NotificationListItem item, NotificationReadFilter filter) {
  return switch (filter) {
    NotificationReadFilter.all => true,
    NotificationReadFilter.unread => !item.read,
    NotificationReadFilter.read => item.read,
  };
}

/// Driver inbox — notifications for the signed-in driver's route and vehicle.
bool matchesDriverNotification(
  NotificationListItem item,
  DriverSession? session,
) {
  if (session == null) return true;
  final blob = '${item.title} ${item.body}'.toLowerCase();
  final route = session.routeName.toLowerCase();
  if (blob.contains(route)) return true;
  final vehicle = session.vehicleReg.toLowerCase();
  if (blob.contains(vehicle)) return true;
  final driver = session.driverName.toLowerCase();
  if (blob.contains(driver)) return true;
  return item.type == NotificationType.systemAlert;
}

class NotificationsLoadException implements Exception {
  NotificationsLoadException(this.message);
  final String message;
  @override
  String toString() => message;
}

class NotificationsRepository {
  NotificationsRepository() {
    _items.addAll(mockNotifications);
  }

  final List<NotificationItem> _items = [];
  bool _failNextLoad = false;

  void simulateNextLoadFailure() => _failNextLoad = true;

  Future<List<NotificationListItem>> loadNotifications() async {
    await Future<void>.delayed(const Duration(milliseconds: 280));
    if (_failNextLoad) {
      _failNextLoad = false;
      throw NotificationsLoadException(
        'Could not load notifications. Please check your connection.',
      );
    }
    return loadNotificationsSync();
  }

  List<NotificationListItem> loadNotificationsSync() {
    return buildNotificationListItems(_sortedItems());
  }

  int unreadCount() => _items.where((n) => !n.read).length;

  void markRead(String id) {
    final index = _items.indexWhere((n) => n.id == id);
    if (index < 0) return;
    _items[index] = _items[index].copyWith(read: true);
  }

  void markAllRead() {
    for (var i = 0; i < _items.length; i++) {
      if (!_items[i].read) {
        _items[i] = _items[i].copyWith(read: true);
      }
    }
  }

  List<NotificationItem> _sortedItems() {
    final copy = List<NotificationItem>.from(_items);
    copy.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return copy;
  }
}
