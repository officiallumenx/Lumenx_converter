import 'package:flutter/material.dart';

import '../../../../shared/components/lx_button.dart';
import '../../../../shared/components/lx_empty_state.dart';

class NotificationsEmptyView extends StatelessWidget {
  const NotificationsEmptyView({
    super.key,
    required this.onClearFilters,
  });

  final VoidCallback onClearFilters;

  @override
  Widget build(BuildContext context) {
    return LxEmptyState(
      icon: Icons.notifications_off_outlined,
      title: 'No notifications match filters',
      description: 'Try a different category or read status filter.',
      action: LxButton(
        label: 'Clear filters',
        variant: LxButtonVariant.outline,
        onPressed: onClearFilters,
      ),
    );
  }
}
