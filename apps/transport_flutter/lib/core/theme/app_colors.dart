import 'package:flutter/material.dart';

/// Palette derived from LumenX Connect (`apps/connect/src/styles.css`).
abstract final class AppColors {
  // Light — core
  static const background = Color(0xFFFAFAFC);
  static const foreground = Color(0xFF1E1B4B);
  static const card = Color(0xFFFFFFFF);
  static const primary = Color(0xFF6366F1);
  static const primaryForeground = Color(0xFFFAFAFC);
  static const primaryGlow = Color(0xFF818CF8);
  static const secondary = Color(0xFFF4F4F8);
  static const muted = Color(0xFFF4F4F8);
  static const mutedForeground = Color(0xFF6B7280);
  static const accent = Color(0xFFEEF2FF);
  static const accentForeground = Color(0xFF4338CA);
  static const success = Color(0xFF22C55E);
  static const successForeground = Color(0xFFFFFFFF);
  static const warning = Color(0xFFF59E0B);
  static const warningForeground = Color(0xFF422006);
  static const destructive = Color(0xFFEF4444);
  static const border = Color(0xFFE8E8EF);

  // Light — sidebar
  static const sidebar = Color(0xFFFAFAFC);
  static const sidebarForeground = Color(0xFF1E293B);
  static const sidebarAccent = Color(0xFFF4F4F8);
  static const sidebarBorder = Color(0xFFE8E8EF);

  // Dark — core
  static const darkBackground = Color(0xFF14141F);
  static const darkForeground = Color(0xFFF5F5FA);
  static const darkCard = Color(0xFF1E1E2E);
  static const darkPrimary = Color(0xFF818CF8);
  static const darkPrimaryGlow = Color(0xFF93A3FB);
  static const darkMuted = Color(0xFF2A2A3D);
  static const darkMutedForeground = Color(0xFF9CA3AF);
  static const darkAccent = Color(0xFF2D2D45);
  static const darkAccentForeground = Color(0xFFC7D2FE);
  static const darkBorder = Color(0xFF3A3A52);
  static const darkSuccess = Color(0xFF4ADE80);
  static const darkSuccessForeground = Color(0xFF14141F);
  static const darkWarning = Color(0xFFFBBF24);
  static const darkWarningForeground = Color(0xFF14141F);
  static const darkDestructive = Color(0xFFF87171);

  // Dark — sidebar
  static const darkSidebar = Color(0xFF181825);
  static const darkSidebarForeground = Color(0xFFE8E8EF);
  static const darkSidebarAccent = Color(0xFF2A2A3D);
  static const darkSidebarBorder = Color(0xFF3A3A52);
}
