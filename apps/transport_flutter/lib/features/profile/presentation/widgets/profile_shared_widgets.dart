import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_button.dart';
import '../../../../shared/components/lx_card.dart';

class ProfileErrorView extends StatelessWidget {
  const ProfileErrorView({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            size: 40,
            color: Theme.of(context).colorScheme.error,
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Could not load profile',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            message,
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),
          LxButton(label: 'Retry', icon: Icons.refresh, onPressed: onRetry),
        ],
      ),
    );
  }
}

class ProfileLoadingView extends StatelessWidget {
  const ProfileLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        SizedBox(height: 80, child: Center(child: CircularProgressIndicator())),
      ],
    );
  }
}

class ProfileSignedOutView extends StatelessWidget {
  const ProfileSignedOutView({super.key, required this.onSignIn});

  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      child: Column(
        children: [
          Icon(
            Icons.logout,
            size: 48,
            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.35),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'You are signed out',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Sign in to access your driver profile and mark attendance.',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),
          LxButton(
            label: 'Sign in',
            icon: Icons.login,
            expanded: true,
            onPressed: onSignIn,
          ),
        ],
      ),
    );
  }
}

class ProfileSubpageHeader extends StatelessWidget {
  const ProfileSubpageHeader({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        Text(title, style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }
}
