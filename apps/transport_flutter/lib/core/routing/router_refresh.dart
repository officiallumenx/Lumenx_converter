import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Notifies [GoRouter] when auth state changes for redirect refresh.
class RouterRefresh extends ChangeNotifier {
  void notify() => notifyListeners();
}

final routerRefreshProvider = Provider<RouterRefresh>((ref) => RouterRefresh());
