import 'package:flutter/material.dart';

import '../../../../shared/components/lx_error_state.dart';

class DashboardErrorView extends StatelessWidget {
  const DashboardErrorView({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return LxErrorState(
      title: 'Could not load dashboard',
      message: message,
      onRetry: onRetry,
    );
  }
}
