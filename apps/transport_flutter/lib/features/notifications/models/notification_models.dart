import '../../../shared/models/notification_item.dart';

/// Row model for notification list cards.
class NotificationListItem {
  const NotificationListItem({required this.notification});

  final NotificationItem notification;

  String get id => notification.id;
  String get title => notification.title;
  String get body => notification.body;
  NotificationType get type => notification.type;
  DateTime get createdAt => notification.createdAt;
  bool get read => notification.read;
}

enum NotificationCategoryFilter {
  all,
  routeUpdate,
  tripUpdate,
  attendanceAlert,
  systemAlert,
}

enum NotificationReadFilter { all, unread, read }

extension NotificationTypeX on NotificationType {
  String get label => switch (this) {
        NotificationType.routeUpdate => 'Route Updates',
        NotificationType.tripUpdate => 'Trip Updates',
        NotificationType.attendanceAlert => 'Attendance Alerts',
        NotificationType.systemAlert => 'System Alerts',
      };
}

extension NotificationCategoryFilterX on NotificationCategoryFilter {
  NotificationType? get type => switch (this) {
        NotificationCategoryFilter.all => null,
        NotificationCategoryFilter.routeUpdate =>
          NotificationType.routeUpdate,
        NotificationCategoryFilter.tripUpdate =>
          NotificationType.tripUpdate,
        NotificationCategoryFilter.attendanceAlert =>
          NotificationType.attendanceAlert,
        NotificationCategoryFilter.systemAlert =>
          NotificationType.systemAlert,
      };

  String get label => switch (this) {
        NotificationCategoryFilter.all => 'All',
        NotificationCategoryFilter.routeUpdate => 'Route Updates',
        NotificationCategoryFilter.tripUpdate => 'Trip Updates',
        NotificationCategoryFilter.attendanceAlert => 'Attendance Alerts',
        NotificationCategoryFilter.systemAlert => 'System Alerts',
      };
}

extension NotificationReadFilterX on NotificationReadFilter {
  String get label => switch (this) {
        NotificationReadFilter.all => 'All',
        NotificationReadFilter.unread => 'Unread',
        NotificationReadFilter.read => 'Read',
      };
}
