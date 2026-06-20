import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/components/lx_card.dart';
import '../../data/demo_credentials.dart';

class DemoCredentialsCard extends StatelessWidget {
  const DemoCredentialsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return LxCard(
      padding: const EdgeInsets.all(AppSpacing.lg),
      elevatedOnHover: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Demo credentials',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'OTP for all flows: ${DemoDriverCredentials.otp}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: AppSpacing.md),
          for (final cred in DemoDriverCredentials.all) ...[
            _CredentialRow(credential: cred),
            if (cred != DemoDriverCredentials.all.last)
              const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}

class _CredentialRow extends StatelessWidget {
  const _CredentialRow({required this.credential});

  final DemoCredential credential;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${credential.driverId} · ${credential.name}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        Text(
          'Password: ${credential.password}',
          style: Theme.of(context).textTheme.labelSmall,
        ),
        Text(
          credential.flow,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: Theme.of(context)
                    .colorScheme
                    .onSurface
                    .withValues(alpha: 0.55),
              ),
        ),
      ],
    );
  }
}
