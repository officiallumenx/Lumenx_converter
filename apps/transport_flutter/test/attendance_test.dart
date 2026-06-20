import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/auth_test_helpers.dart';

void main() {
  testWidgets('Driver attendance workflow', (tester) async {
    tester.view.physicalSize = const Size(1200, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await pumpAuthenticatedApp(tester);

    await tester.tap(find.text('Attendance'));
    await tester.pumpAndSettle();

    expect(find.text('Assigned route'), findsOneWidget);

    await tester.ensureVisible(find.text('Mark all boarded'));
    await tester.tap(find.text('Mark all boarded'));
    await tester.pump();

    await tester.ensureVisible(find.text('Submit attendance').last);
    await tester.tap(find.text('Submit attendance').last);
    await tester.pumpAndSettle();

    expect(find.textContaining('Submitted'), findsOneWidget);

    await tester.ensureVisible(find.text('Summary').last);
    await tester.tap(find.text('Summary').last);
    await tester.pumpAndSettle();

    expect(find.textContaining('BOARDED TODAY'), findsOneWidget);
  });
}
