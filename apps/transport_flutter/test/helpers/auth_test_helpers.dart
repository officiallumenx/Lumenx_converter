import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lumenx_transport/app.dart';
import 'package:lumenx_transport/features/auth/presentation/auth_controller.dart';

/// Pumps the app with [driverId] already authenticated (skips login UI).
Future<void> pumpAuthenticatedApp(
  WidgetTester tester, {
  String driverId = 'DR-01',
}) async {
  await tester.pumpWidget(
    ProviderScope(
      child: const LumenXTransportApp(),
    ),
  );
  await tester.pumpAndSettle();

  final container = ProviderScope.containerOf(tester.element(find.byType(MaterialApp)));
  container.read(authControllerProvider.notifier).signInDirectForTesting(driverId);
  await tester.pumpAndSettle();
}

/// Signs in via the login form (returning user).
Future<void> signInOnLoginPage(
  WidgetTester tester, {
  required String driverId,
  required String password,
}) async {
  await tester.enterText(find.byType(TextField).at(0), driverId);
  await tester.enterText(find.byType(TextField).at(1), password);
  await tester.tap(find.text('Sign in'));
  await tester.pumpAndSettle();
}
