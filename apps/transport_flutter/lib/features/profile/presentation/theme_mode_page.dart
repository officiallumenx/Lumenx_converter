import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/theme_controller.dart';
import '../../../shared/components/lx_card.dart';
import 'widgets/profile_shared_widgets.dart';

class ThemeModePage extends ConsumerWidget {
  const ThemeModePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(themeModeProvider);

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ProfileSubpageHeader(title: 'Theme'),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Choose how LumenX Transport appears on this device.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          _ThemeOptionTile(
            title: 'Light Mode',
            subtitle: 'Always use the light theme',
            icon: Icons.light_mode_outlined,
            selected: selected == ThemeMode.light,
            onTap: () => setAppThemeMode(ref, ThemeMode.light),
          ),
          const SizedBox(height: AppSpacing.sm),
          _ThemeOptionTile(
            title: 'Dark Mode',
            subtitle: 'Always use the dark theme',
            icon: Icons.dark_mode_outlined,
            selected: selected == ThemeMode.dark,
            onTap: () => setAppThemeMode(ref, ThemeMode.dark),
          ),
          const SizedBox(height: AppSpacing.sm),
          _ThemeOptionTile(
            title: 'System Mode',
            subtitle: 'Match your device theme setting',
            icon: Icons.settings_suggest_outlined,
            selected: selected == ThemeMode.system,
            onTap: () => setAppThemeMode(ref, ThemeMode.system),
          ),
        ],
      ),
    );
  }
}

class _ThemeOptionTile extends StatelessWidget {
  const _ThemeOptionTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return LxCard(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                ),
              ],
            ),
          ),
          if (selected)
            Icon(
              Icons.check_circle,
              size: 20,
              color: Theme.of(context).colorScheme.primary,
            )
          else
            Icon(
              Icons.radio_button_unchecked,
              size: 18,
              color: Theme.of(
                context,
              ).colorScheme.onSurface.withValues(alpha: 0.35),
            ),
        ],
      ),
    );
  }
}
