enum NotificationType {
  routeUpdate,
  tripUpdate,
  attendanceAlert,
  systemAlert,
}

class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
    required this.createdAt,
    required this.read,
  });

  final String id;
  final String title;
  final String body;
  final NotificationType type;
  final DateTime createdAt;
  final bool read;

  NotificationItem copyWith({bool? read}) {
    return NotificationItem(
      id: id,
      title: title,
      body: body,
      type: type,
      createdAt: createdAt,
      read: read ?? this.read,
    );
  }
}
