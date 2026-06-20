import 'package:flutter/material.dart';

abstract final class AppShadows {
  static List<BoxShadow> soft(Color border) => [
        BoxShadow(
          color: border.withValues(alpha: 0.06),
          blurRadius: 16,
          offset: const Offset(0, 4),
        ),
        BoxShadow(
          color: border.withValues(alpha: 0.04),
          blurRadius: 2,
          offset: const Offset(0, 1),
        ),
      ];

  static List<BoxShadow> elevated(Color border) => [
        BoxShadow(
          color: border.withValues(alpha: 0.18),
          blurRadius: 32,
          offset: const Offset(0, 8),
          spreadRadius: -8,
        ),
      ];

  static List<BoxShadow> glow(Color primary) => [
        BoxShadow(
          color: primary.withValues(alpha: 0.45),
          blurRadius: 32,
          offset: const Offset(0, 8),
          spreadRadius: -8,
        ),
      ];
}
