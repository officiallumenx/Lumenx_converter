import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class AppTypography {
  static TextTheme textTheme(Brightness brightness) {
    final base = brightness == Brightness.dark
        ? ThemeData.dark().textTheme
        : ThemeData.light().textTheme;

    final body = GoogleFonts.interTextTheme(base);
    final display = GoogleFonts.soraTextTheme(base);

    return body.copyWith(
      displayLarge: display.displayLarge?.copyWith(letterSpacing: -0.02),
      displayMedium: display.displayMedium?.copyWith(letterSpacing: -0.02),
      displaySmall: display.displaySmall?.copyWith(letterSpacing: -0.02),
      headlineLarge: display.headlineLarge?.copyWith(letterSpacing: -0.02),
      headlineMedium: display.headlineMedium?.copyWith(letterSpacing: -0.02),
      headlineSmall: display.headlineSmall?.copyWith(letterSpacing: -0.02),
      titleLarge: display.titleLarge?.copyWith(
        fontWeight: FontWeight.w600,
        letterSpacing: -0.02,
      ),
      titleMedium: display.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      labelSmall: body.labelSmall?.copyWith(
        fontSize: 10,
        fontWeight: FontWeight.w500,
        letterSpacing: 0.04,
      ),
    );
  }
}
