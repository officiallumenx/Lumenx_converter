import 'package:flutter_riverpod/flutter_riverpod.dart';

enum SyncEntityType { attendance, tripAction }

class PendingSyncItem {
  const PendingSyncItem({
    required this.id,
    required this.entity,
    required this.summary,
    required this.createdAt,
  });

  final String id;
  final SyncEntityType entity;
  final String summary;
  final DateTime createdAt;
}

class OfflineSyncState {
  const OfflineSyncState({
    this.isOnline = true,
    this.pendingItems = const [],
    this.lastSyncedAt,
    this.lastSyncedCount = 0,
  });

  final bool isOnline;
  final List<PendingSyncItem> pendingItems;
  final DateTime? lastSyncedAt;
  final int lastSyncedCount;

  OfflineSyncState copyWith({
    bool? isOnline,
    List<PendingSyncItem>? pendingItems,
    DateTime? lastSyncedAt,
    int? lastSyncedCount,
  }) {
    return OfflineSyncState(
      isOnline: isOnline ?? this.isOnline,
      pendingItems: pendingItems ?? this.pendingItems,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      lastSyncedCount: lastSyncedCount ?? this.lastSyncedCount,
    );
  }
}

class OfflineSyncController extends Notifier<OfflineSyncState> {
  int _seq = 0;

  @override
  OfflineSyncState build() => const OfflineSyncState();

  void setOnline(bool value) {
    final prev = state;
    if (prev.isOnline == value) return;
    state = prev.copyWith(isOnline: value);
    if (value) {
      _syncPending();
    }
  }

  void recordLocalChange({
    required SyncEntityType entity,
    required String summary,
  }) {
    if (state.isOnline) return;

    final item = PendingSyncItem(
      id: 'SYNC-${++_seq}',
      entity: entity,
      summary: summary,
      createdAt: DateTime.now(),
    );
    final next = List<PendingSyncItem>.from(state.pendingItems)..add(item);
    state = state.copyWith(pendingItems: next);
  }

  void _syncPending() {
    if (state.pendingItems.isEmpty) return;
    final syncedCount = state.pendingItems.length;
    state = state.copyWith(
      pendingItems: const [],
      lastSyncedAt: DateTime.now(),
      lastSyncedCount: syncedCount,
    );
  }
}

final offlineSyncProvider =
    NotifierProvider<OfflineSyncController, OfflineSyncState>(
      OfflineSyncController.new,
    );

final isOfflineModeProvider = Provider<bool>(
  (ref) => !ref.watch(offlineSyncProvider).isOnline,
);

final pendingSyncCountProvider = Provider<int>(
  (ref) => ref.watch(offlineSyncProvider).pendingItems.length,
);
