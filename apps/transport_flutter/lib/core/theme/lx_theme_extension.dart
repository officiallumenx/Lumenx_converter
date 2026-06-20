import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_shadows.dart';

/// Semantic design tokens aligned with LumenX Connect CSS variables.
@immutable
class LumenXTheme extends ThemeExtension<LumenXTheme> {
  const LumenXTheme({
    required this.sidebar,
    required this.sidebarForeground,
    required this.sidebarAccent,
    required this.sidebarBorder,
    required this.muted,
    required this.mutedForeground,
    required this.accent,
    required this.accentForeground,
    required this.success,
    required this.successForeground,
    required this.warning,
    required this.warningForeground,
    required this.destructive,
    required this.border,
    required this.primaryGlow,
  });

  final Color sidebar;
  final Color sidebarForeground;
  final Color sidebarAccent;
  final Color sidebarBorder;
  final Color muted;
  final Color mutedForeground;
  final Color accent;
  final Color accentForeground;
  final Color success;
  final Color successForeground;
  final Color warning;
  final Color warningForeground;
  final Color destructive;
  final Color border;
  final Color primaryGlow;

  static const light = LumenXTheme(
    sidebar: AppColors.sidebar,
    sidebarForeground: AppColors.sidebarForeground,
    sidebarAccent: AppColors.sidebarAccent,
    sidebarBorder: AppColors.sidebarBorder,
    muted: AppColors.muted,
    mutedForeground: AppColors.mutedForeground,
    accent: AppColors.accent,
    accentForeground: AppColors.accentForeground,
    success: AppColors.success,
    successForeground: AppColors.successForeground,
    warning: AppColors.warning,
    warningForeground: AppColors.warningForeground,
    destructive: AppColors.destructive,
    border: AppColors.border,
    primaryGlow: AppColors.primaryGlow,
  );

  static const dark = LumenXTheme(
    sidebar: AppColors.darkSidebar,
    sidebarForeground: AppColors.darkSidebarForeground,
    sidebarAccent: AppColors.darkSidebarAccent,
    sidebarBorder: AppColors.darkSidebarBorder,
    muted: AppColors.darkMuted,
    mutedForeground: AppColors.darkMutedForeground,
    accent: AppColors.darkAccent,
    accentForeground: AppColors.darkAccentForeground,
    success: AppColors.darkSuccess,
    successForeground: AppColors.darkSuccessForeground,
    warning: AppColors.darkWarning,
    warningForeground: AppColors.darkWarningForeground,
    destructive: AppColors.darkDestructive,
    border: AppColors.darkBorder,
    primaryGlow: AppColors.darkPrimaryGlow,
  );

  List<BoxShadow> get softShadow => AppShadows.soft(border);
  List<BoxShadow> glowShadow(Color primary) => AppShadows.glow(primary);

  @override
  LumenXTheme copyWith({
    Color? sidebar,
    Color? sidebarForeground,
    Color? sidebarAccent,
    Color? sidebarBorder,
    Color? muted,
    Color? mutedForeground,
    Color? accent,
    Color? accentForeground,
    Color? success,
    Color? successForeground,
    Color? warning,
    Color? warningForeground,
    Color? destructive,
    Color? border,
    Color? primaryGlow,
  }) {
    return LumenXTheme(
      sidebar: sidebar ?? this.sidebar,
      sidebarForeground: sidebarForeground ?? this.sidebarForeground,
      sidebarAccent: sidebarAccent ?? this.sidebarAccent,
      sidebarBorder: sidebarBorder ?? this.sidebarBorder,
      muted: muted ?? this.muted,
      mutedForeground: mutedForeground ?? this.mutedForeground,
      accent: accent ?? this.accent,
      accentForeground: accentForeground ?? this.accentForeground,
      success: success ?? this.success,
      successForeground: successForeground ?? this.successForeground,
      warning: warning ?? this.warning,
      warningForeground: warningForeground ?? this.warningForeground,
      destructive: destructive ?? this.destructive,
      border: border ?? this.border,
      primaryGlow: primaryGlow ?? this.primaryGlow,
    );
  }

  @override
  LumenXTheme lerp(LumenXTheme? other, double t) {
    if (other == null) return this;
    return LumenXTheme(
      sidebar: Color.lerp(sidebar, other.sidebar, t)!,
      sidebarForeground:
          Color.lerp(sidebarForeground, other.sidebarForeground, t)!,
      sidebarAccent: Color.lerp(sidebarAccent, other.sidebarAccent, t)!,
      sidebarBorder: Color.lerp(sidebarBorder, other.sidebarBorder, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      mutedForeground: Color.lerp(mutedForeground, other.mutedForeground, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentForeground: Color.lerp(accentForeground, other.accentForeground, t)!,
      success: Color.lerp(success, other.success, t)!,
      successForeground:
          Color.lerp(successForeground, other.successForeground, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningForeground:
          Color.lerp(warningForeground, other.warningForeground, t)!,
      destructive: Color.lerp(destructive, other.destructive, t)!,
      border: Color.lerp(border, other.border, t)!,
      primaryGlow: Color.lerp(primaryGlow, other.primaryGlow, t)!,
    );
  }
}

extension LumenXThemeContext on BuildContext {
  LumenXTheme get lxTheme =>
      Theme.of(this).extension<LumenXTheme>() ?? LumenXTheme.light;
}
