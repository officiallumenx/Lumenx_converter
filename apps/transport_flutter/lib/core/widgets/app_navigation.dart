import 'package:flutter/material.dart';

import '../constants/app_constants.dart';
import '../constants/breakpoints.dart';
import '../routing/navigation_destinations.dart';
import '../routing/route_paths.dart';
import '../theme/app_colors.dart';
import '../theme/app_shadows.dart';
import '../theme/app_spacing.dart';
import '../theme/lx_theme_extension.dart';

class AppSidebar extends StatelessWidget {
  const AppSidebar({
    super.key,
    required this.currentPath,
    required this.onNavigate,
  });

  final String currentPath;
  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    final lx = context.lxTheme;

    return Container(
      width: Breakpoints.desktopSidebarWidth,
      decoration: BoxDecoration(
        color: lx.sidebar,
        border: Border(right: BorderSide(color: lx.sidebarBorder)),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              height: 64,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: Row(
                  children: [
                    Icon(
                      Icons.directions_bus,
                      size: 20,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        AppConstants.appWordmark,
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.6,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Divider(height: 1, color: lx.sidebarBorder),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  for (final dest in kNavDestinations)
                    _SidebarTile(
                      dest: dest,
                      selected: _isSelected(currentPath, dest.path),
                      onTap: () => onNavigate(dest.path),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Text(
                'Driver app · v1',
                style: Theme.of(
                  context,
                ).textTheme.labelSmall?.copyWith(color: lx.mutedForeground),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SidebarTile extends StatelessWidget {
  const _SidebarTile({
    required this.dest,
    required this.selected,
    required this.onTap,
  });

  final NavDestination dest;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.primary;
    final onPrimary = isDark
        ? AppColors.darkBackground
        : AppColors.primaryForeground;
    final lx = context.lxTheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: Colors.transparent,
        elevation: 0,
        shadowColor: Colors.transparent,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            decoration: BoxDecoration(
              color: selected ? primary : Colors.transparent,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              boxShadow: selected ? AppShadows.glow(primary) : null,
            ),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: 10,
            ),
            child: Row(
              children: [
                Icon(
                  selected ? dest.selectedIcon : dest.icon,
                  size: 18,
                  color: selected
                      ? onPrimary
                      : lx.sidebarForeground.withValues(alpha: 0.75),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    dest.label,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                      color: selected
                          ? onPrimary
                          : lx.sidebarForeground.withValues(alpha: 0.85),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AppNavigationRail extends StatelessWidget {
  const AppNavigationRail({
    super.key,
    required this.currentPath,
    required this.onNavigate,
  });

  final String currentPath;
  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    final index = _selectedIndex(currentPath);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.primary;
    final onPrimary = isDark
        ? AppColors.darkBackground
        : AppColors.primaryForeground;
    final lx = context.lxTheme;

    return NavigationRail(
      extended: true,
      selectedIndex: index,
      onDestinationSelected: (i) => onNavigate(kNavDestinations[i].path),
      backgroundColor: lx.sidebar,
      indicatorColor: primary,
      selectedIconTheme: IconThemeData(color: onPrimary),
      selectedLabelTextStyle: TextStyle(
        color: onPrimary,
        fontWeight: FontWeight.w600,
        fontSize: 12,
      ),
      unselectedIconTheme: IconThemeData(
        color: lx.sidebarForeground.withValues(alpha: 0.7),
      ),
      unselectedLabelTextStyle: TextStyle(
        color: lx.sidebarForeground.withValues(alpha: 0.7),
        fontSize: 12,
      ),
      leading: Padding(
        padding: const EdgeInsets.only(
          top: AppSpacing.lg,
          bottom: AppSpacing.md,
        ),
        child: Icon(Icons.directions_bus, color: primary),
      ),
      destinations: [
        for (final dest in kNavDestinations)
          NavigationRailDestination(
            icon: Icon(dest.icon),
            selectedIcon: Icon(dest.selectedIcon),
            label: Text(dest.label),
          ),
      ],
    );
  }
}

class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.currentPath,
    required this.onNavigate,
  });

  final String currentPath;
  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    final index = _selectedIndex(currentPath);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primary = isDark ? AppColors.darkPrimary : AppColors.primary;

    return NavigationBar(
      selectedIndex: index,
      onDestinationSelected: (i) => onNavigate(kNavDestinations[i].path),
      destinations: [
        for (final dest in kNavDestinations)
          NavigationDestination(
            icon: Icon(dest.icon),
            selectedIcon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Icon(dest.selectedIcon, color: primary),
            ),
            label: dest.label,
          ),
      ],
      backgroundColor: (isDark ? AppColors.darkCard : AppColors.card)
          .withValues(alpha: 0.92),
      surfaceTintColor: Colors.transparent,
      indicatorColor: Colors.transparent,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      overlayColor: WidgetStatePropertyAll(Colors.transparent),
    );
  }
}

int _selectedIndex(String path) {
  final idx = kNavDestinations.indexWhere((d) => _isSelected(path, d.path));
  return idx >= 0 ? idx : 0;
}

bool _isSelected(String current, String dest) {
  if (dest == RoutePaths.home) {
    return current == RoutePaths.home || current == RoutePaths.myRoute;
  }
  return current.startsWith(dest);
}
