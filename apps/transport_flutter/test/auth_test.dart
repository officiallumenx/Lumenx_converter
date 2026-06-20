import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lumenx_transport/app.dart';

import 'helpers/auth_test_helpers.dart';

void main() {
  testWidgets('Unauthenticated user sees login screen', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: LumenXTransportApp()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Driver sign in'), findsOneWidget);
    expect(find.text('Demo credentials'), findsOneWidget);
  });

  testWidgets('Returning driver signs in to dashboard', (tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const ProviderScope(child: LumenXTransportApp()),
    );
    await tester.pumpAndSettle();

    await signInOnLoginPage(
      tester,
      driverId: 'DR-01',
      password: 'Ramesh@2026',
    );

    expect(find.text('Driver Home'), findsOneWidget);
  });

  testWidgets('First-time driver completes OTP and password setup', (tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const ProviderScope(child: LumenXTransportApp()),
    );
    await tester.pumpAndSettle();

    await signInOnLoginPage(
      tester,
      driverId: 'DR-02',
      password: 'driver123',
    );

    expect(find.text('Verify OTP'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '123456');
    await tester.tap(find.text('Verify'));
    await tester.pumpAndSettle();

    expect(find.text('Create password'), findsOneWidget);

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'Suresh@02');
    await tester.enterText(fields.at(1), 'Suresh@02');
    await tester.tap(find.text('Save & continue'));
    await tester.pumpAndSettle();

    expect(find.text('Driver Home'), findsOneWidget);
  });

  testWidgets('Forgot password flow resets credentials', (tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const ProviderScope(child: LumenXTransportApp()),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'DR-01');
    await tester.tap(find.text('Send OTP'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), '123456');
    await tester.tap(find.text('Verify'));
    await tester.pumpAndSettle();

    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), 'Ramesh@2026');
    await tester.enterText(fields.at(1), 'Ramesh@2026');
    await tester.tap(find.text('Update password'));
    await tester.pumpAndSettle();

    expect(find.text('Password updated'), findsOneWidget);
  });
}
