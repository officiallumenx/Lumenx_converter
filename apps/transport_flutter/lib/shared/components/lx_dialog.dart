import 'package:flutter/material.dart';

import 'lx_button.dart';

class LxDialog {
  static Future<T?> show<T>({
    required BuildContext context,
    required String title,
    required String message,
    String confirmLabel = 'Confirm',
    String cancelLabel = 'Cancel',
    bool destructive = false,
  }) {
    return showDialog<T>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          title,
          style: Theme.of(ctx).textTheme.titleLarge,
        ),
        content: Text(
          message,
          style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(
                color: Theme.of(ctx)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.7),
              ),
        ),
        actionsAlignment: MainAxisAlignment.end,
        actions: [
          LxButton(
            label: cancelLabel,
            variant: LxButtonVariant.ghost,
            size: LxButtonSize.sm,
            onPressed: () => Navigator.of(ctx).pop(),
          ),
          LxButton(
            label: confirmLabel,
            variant: destructive
                ? LxButtonVariant.destructive
                : LxButtonVariant.primary,
            size: LxButtonSize.sm,
            onPressed: () => Navigator.of(ctx).pop(true),
          ),
        ],
      ),
    );
  }
}
