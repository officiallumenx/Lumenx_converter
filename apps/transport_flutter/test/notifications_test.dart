import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/auth_test_helpers.dart';

void main() {
  testWidgets('Driver notifications with route filter and mark read', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await pumpAuthenticatedApp(tester);

    await tester.tap(find.text('Notifications').last);
    await tester.pumpAndSettle();

    expect(find.text('Admin changed route assignment'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'trip time');
    await tester.pumpAndSettle();

    expect(find.text('Admin changed trip time'), findsOneWidget);
    expect(find.text('Admin changed route assignment'), findsNothing);

    await tester.tap(find.text('Mark all read'));
    await tester.pumpAndSettle();

    expect(find.textContaining('All caught up'), findsOneWidget);
  });
}
