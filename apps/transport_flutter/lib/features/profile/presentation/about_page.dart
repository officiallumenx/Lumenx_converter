import 'package:flutter/material.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import 'widgets/profile_shared_widgets.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  static const _version = '1.0.0';
  static const _build = '2026.06.01';

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProfileSubpageHeader(title: 'About LumenX'),
          const SizedBox(height: AppSpacing.lg),
          Center(
            child: Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  ),
                  child: const Icon(
                    Icons.directions_bus,
                    size: 36,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  AppConstants.appName,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  'Version $_version · Build $_build',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xxl),
          LxCard(
            child: Text(
              '${AppConstants.appName} helps schools manage fleet dispatch, '
              'driver attendance, routes, and parent communication. '
              'This demo runs on realistic mock data for ${AppConstants.instituteName}.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          LxCard(
            child: Column(
              children: [
                _AboutRow(label: 'Product', value: 'LumenX Connect Suite'),
                const Divider(height: AppSpacing.xxl),
                _AboutRow(label: 'Module', value: 'Transport Operations'),
                const Divider(height: AppSpacing.xxl),
                _AboutRow(label: 'Institute', value: AppConstants.instituteName),
                const Divider(height: AppSpacing.xxl),
                _AboutRow(label: 'Support', value: 'support@lumenx.app'),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          LxButton(
            label: 'Terms of service',
            icon: Icons.description_outlined,
            variant: LxButtonVariant.outline,
            expanded: true,
            onPressed: () => _showInfo(context, 'Terms of service', 'Demo — full terms ship with production.'),
          ),
          const SizedBox(height: AppSpacing.sm),
          LxButton(
            label: 'Privacy policy',
            icon: Icons.privacy_tip_outlined,
            variant: LxButtonVariant.outline,
            expanded: true,
            onPressed: () => _showInfo(context, 'Privacy policy', 'Demo — student data handled per school policy.'),
          ),
        ],
      ),
    );
  }

  void _showInfo(BuildContext context, String title, String body) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('$title · $body'),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }
}

class _AboutRow extends StatelessWidget {
  const _AboutRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: Theme.of(context).textTheme.bodySmall),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}
