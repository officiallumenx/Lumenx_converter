import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/routing/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/page_header.dart';
import '../../../shared/components/lx_button.dart';
import '../../../shared/components/lx_card.dart';
import '../../../shared/components/lx_dialog.dart';
import '../../auth/presentation/auth_controller.dart';
import '../models/profile_models.dart';
import 'profile_controller.dart';
import 'widgets/profile_menu_tile.dart';
import 'widgets/profile_overview_card.dart';
import 'widgets/profile_shared_widgets.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileControllerProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(profileControllerProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: profileAsync.when(
          loading: () => const Column(
            children: [
              PageHeader(title: 'Profile', subtitle: 'Loading account…'),
              ProfileLoadingView(),
            ],
          ),
          error: (e, _) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const PageHeader(title: 'Profile'),
              ProfileErrorView(
                message: e.toString(),
                onRetry: () =>
                    ref.read(profileControllerProvider.notifier).refresh(),
              ),
            ],
          ),
          data: (profile) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              PageHeader(
                title: 'Profile',
                subtitle: '${profile.institute} · ${profile.role}',
              ),
              LxCard(child: ProfileOverviewCard(profile: profile)),
              const SizedBox(height: AppSpacing.md),
              LxCard(
                child: Column(
                  children: [
                    _InfoLine(label: 'Name', value: profile.name),
                    const Divider(height: AppSpacing.xxl),
                    _InfoLine(label: 'Phone', value: profile.phone),
                    const Divider(height: AppSpacing.xxl),
                    _InfoLine(label: 'Employee ID', value: profile.id),
                    const Divider(height: AppSpacing.xxl),
                    _InfoLine(label: 'Route', value: profile.routeName),
                    const Divider(height: AppSpacing.xxl),
                    _InfoLine(label: 'Vehicle', value: profile.vehicleReg),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Text(
                'Settings',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.65),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              for (final section in ProfileMenuSection.values) ...[
                ProfileMenuTile(
                  section: section,
                  onTap: () => context.push(_sectionPath(section)),
                ),
                if (section != ProfileMenuSection.values.last)
                  const SizedBox(height: AppSpacing.md),
              ],
              const SizedBox(height: AppSpacing.xxl),
              LxButton(
                label: 'Logout',
                icon: Icons.logout,
                variant: LxButtonVariant.destructive,
                expanded: true,
                onPressed: () => _logout(context, ref),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final confirmed = await LxDialog.show<bool>(
      context: context,
      title: 'Logout',
      message: 'Sign out of ${AppConstants.appName}?',
      confirmLabel: 'Logout',
      cancelLabel: 'Cancel',
      destructive: true,
    );
    if (confirmed != true || !context.mounted) return;

    ref.read(authControllerProvider.notifier).signOut();

    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(
          content: Text('Signed out successfully'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    context.go(RoutePaths.login);
  }
}

String _sectionPath(ProfileMenuSection section) => switch (section) {
  ProfileMenuSection.editProfile => RoutePaths.profileEdit,
  ProfileMenuSection.theme => RoutePaths.profileTheme,
  ProfileMenuSection.notificationSettings => RoutePaths.profileSettings,
  ProfileMenuSection.support => RoutePaths.profileSupport,
  ProfileMenuSection.about => RoutePaths.profileAbout,
};

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        const SizedBox(width: AppSpacing.md),
        Flexible(
          child: Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.end,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
