import 'package:flutter/material.dart';

import 'lx_button.dart';
import 'lx_empty_state.dart';

export 'lx_empty_state.dart' show LxEmptyState;

/// Connect-style error card with retry action.
class LxErrorState extends StatelessWidget {
  const LxErrorState({
    super.key,
    required this.title,
    required this.message,
    required this.onRetry,
    this.icon = Icons.cloud_off_outlined,
  });

  final String title;
  final String message;
  final VoidCallback onRetry;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return LxEmptyState(
      icon: icon,
      title: title,
      description: message,
      action: LxButton(
        label: 'Retry',
        icon: Icons.refresh,
        expanded: true,
        onPressed: onRetry,
      ),
    );
  }
}
