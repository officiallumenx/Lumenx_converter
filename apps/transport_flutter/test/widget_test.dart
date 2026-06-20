import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lumenx_transport/features/dashboard/presentation/widgets/dashboard_loading_view.dart';

import 'helpers/auth_test_helpers.dart';

void main() {
  testWidgets('Driver home loads with stats and quick actions', (tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await pumpAuthenticatedApp(tester);

    expect(find.text('Driver Home'), findsOneWidget);
    expect(find.byType(DashboardLoadingView), findsNothing);

    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();

    expect(find.textContaining('ASSIGNED ROUTE'), findsOneWidget);
    expect(find.text('Quick Actions'), findsOneWidget);
    expect(find.text('Start Trip'), findsOneWidget);
    expect(find.text('Take Attendance'), findsOneWidget);
    expect(find.text('End Trip'), findsOneWidget);
  });
}
