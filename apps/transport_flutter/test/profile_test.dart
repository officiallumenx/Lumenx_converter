import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/auth_test_helpers.dart';

void main() {
  testWidgets('Profile overview, settings toggles, support, logout', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await pumpAuthenticatedApp(tester);

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('Ramesh Kumar'), findsOneWidget);
    expect(find.text('School Bus Driver'), findsWidgets);
    expect(find.text('Notification settings'), findsOneWidget);

    await tester.tap(find.text('Logout'));
    await tester.pumpAndSettle();

    await tester.tap(
      find
          .descendant(
            of: find.byType(AlertDialog),
            matching: find.text('Logout'),
          )
          .last,
    );
    await tester.pumpAndSettle();

    expect(find.text('Driver sign in'), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
  });
}
