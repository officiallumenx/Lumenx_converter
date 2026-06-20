import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// User-selected theme mode aligned with Connect behavior.
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);

void setAppThemeMode(WidgetRef ref, ThemeMode mode) {
  ref.read(themeModeProvider.notifier).state = mode;
}

void toggleAppTheme(WidgetRef ref) {
  final current = ref.read(themeModeProvider);
  final next = switch (current) {
    ThemeMode.light => ThemeMode.dark,
    ThemeMode.dark => ThemeMode.system,
    ThemeMode.system => ThemeMode.light,
  };
  ref.read(themeModeProvider.notifier).state = next;
}
