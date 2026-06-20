import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../constants/app_constants.dart';
import '../constants/breakpoints.dart';
import '../offline/offline_sync.dart';
import '../routing/navigation_destinations.dart';
import '../routing/route_paths.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/lx_theme_extension.dart';
import '../theme/theme_controller.dart';
import '../utils/responsive.dart';
import '../../shared/components/lx_animated_page.dart';
import 'app_navigation.dart';

class ShellScaffold extends ConsumerWidget {
  const ShellScaffold({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tier = layoutTierOf(context);
    final path = GoRouterState.of(context).uri.path;
    final syncState = ref.watch(offlineSyncProvider);
    ref.listen<OfflineSyncState>(offlineSyncProvider, (previous, next) {
      final prevStamp = previous?.lastSyncedAt;
      final nextStamp = next.lastSyncedAt;
      if (nextStamp != null &&
          nextStamp != prevStamp &&
          next.lastSyncedCount > 0 &&
          context.mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(
                'Sync complete: ${next.lastSyncedCount} item(s) uploaded',
              ),
              behavior: SnackBarBehavior.floating,
            ),
          );
      }
    });

    void navigate(String p) {
      if (GoRouterState.of(context).uri.path != p) context.go(p);
    }

    return switch (tier) {
      LayoutTier.desktop => _DesktopShell(
        currentPath: path,
        onNavigate: navigate,
        syncState: syncState,
        child: child,
      ),
      LayoutTier.tablet => _TabletShell(
        currentPath: path,
        onNavigate: navigate,
        syncState: syncState,
        child: child,
      ),
      LayoutTier.mobile => _MobileShell(
        currentPath: path,
        onNavigate: navigate,
        syncState: syncState,
        child: child,
      ),
    };
  }
}

class _ShellHeader extends ConsumerWidget {
  const _ShellHeader({required this.title, this.compact = false});

  final String title;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final lx = context.lxTheme;
    final themeMode = ref.watch(themeModeProvider);
    final offlineState = ref.watch(offlineSyncProvider);
    final (themeIcon, themeTooltip) = switch (themeMode) {
      ThemeMode.light => (Icons.dark_mode_outlined, 'Switch to dark mode'),
      ThemeMode.dark => (
        Icons.settings_suggest_outlined,
        'Switch to system mode',
      ),
      ThemeMode.system => (Icons.light_mode_outlined, 'Switch to light mode'),
    };

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          height: compact ? 56 : 64,
          padding: EdgeInsets.symmetric(
            horizontal: compact ? AppSpacing.lg : AppSpacing.xxl,
          ),
          decoration: BoxDecoration(
            color: (isDark ? AppColors.darkCard : AppColors.card).withValues(
              alpha: 0.85,
            ),
            border: Border(bottom: BorderSide(color: lx.border)),
          ),
          child: Row(
            children: [
              Icon(
                Icons.directions_bus,
                size: 20,
                color: isDark ? AppColors.darkPrimary : AppColors.primary,
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      AppConstants.instituteName,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: lx.mutedForeground,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(
                  offlineState.isOnline
                      ? Icons.wifi_outlined
                      : Icons.wifi_off_outlined,
                  size: 20,
                ),
                tooltip: offlineState.isOnline
                    ? 'Switch to offline mode'
                    : 'Restore internet',
                onPressed: () => ref
                    .read(offlineSyncProvider.notifier)
                    .setOnline(!offlineState.isOnline),
              ),
              IconButton(
                icon: Icon(themeIcon, size: 20),
                tooltip: themeTooltip,
                onPressed: () => toggleAppTheme(ref),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PageBody extends StatelessWidget {
  const _PageBody({
    required this.child,
    required this.routeKey,
    this.padding = const EdgeInsets.all(AppSpacing.xxl),
  });

  final Widget child;
  final String routeKey;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ColoredBox(
      color: isDark ? AppColors.darkBackground : AppColors.background,
      child: Padding(
        padding: padding,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: Breakpoints.contentMaxWidth,
            ),
            child: LxAnimatedPage(routeKey: routeKey, child: child),
          ),
        ),
      ),
    );
  }
}

class _DesktopShell extends StatelessWidget {
  const _DesktopShell({
    required this.currentPath,
    required this.onNavigate,
    required this.child,
    required this.syncState,
  });

  final String currentPath;
  final ValueChanged<String> onNavigate;
  final Widget child;
  final OfflineSyncState syncState;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          AppSidebar(currentPath: currentPath, onNavigate: onNavigate),
          Expanded(
            child: Column(
              children: [
                _ShellHeader(title: _titleForPath(currentPath)),
                _SyncBanners(state: syncState),
                Expanded(
                  child: _PageBody(routeKey: currentPath, child: child),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TabletShell extends StatelessWidget {
  const _TabletShell({
    required this.currentPath,
    required this.onNavigate,
    required this.child,
    required this.syncState,
  });

  final String currentPath;
  final ValueChanged<String> onNavigate;
  final Widget child;
  final OfflineSyncState syncState;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          AppNavigationRail(currentPath: currentPath, onNavigate: onNavigate),
          const VerticalDivider(width: 1),
          Expanded(
            child: Column(
              children: [
                _ShellHeader(title: _titleForPath(currentPath), compact: true),
                _SyncBanners(state: syncState),
                Expanded(
                  child: _PageBody(
                    routeKey: currentPath,
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    child: child,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MobileShell extends StatelessWidget {
  const _MobileShell({
    required this.currentPath,
    required this.onNavigate,
    required this.child,
    required this.syncState,
  });

  final String currentPath;
  final ValueChanged<String> onNavigate;
  final Widget child;
  final OfflineSyncState syncState;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          _ShellHeader(title: _titleForPath(currentPath), compact: true),
          _SyncBanners(state: syncState),
          Expanded(
            child: _PageBody(
              routeKey: currentPath,
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.md,
              ),
              child: child,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: AppBottomNav(currentPath: currentPath, onNavigate: onNavigate),
      ),
    );
  }
}

class _SyncBanners extends StatelessWidget {
  const _SyncBanners({required this.state});

  final OfflineSyncState state;

  @override
  Widget build(BuildContext context) {
    final lx = context.lxTheme;
    if (state.isOnline && state.pendingItems.isEmpty) {
      return const SizedBox.shrink();
    }

    return AnimatedSize(
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOutCubic,
      child: Column(
        children: [
          if (!state.isOnline)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              color: lx.warning.withValues(alpha: 0.18),
              child: Row(
                children: [
                  Icon(Icons.wifi_off_outlined, size: 16, color: lx.warning),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Offline mode: attendance and trip actions are stored locally.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
          if (state.pendingItems.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.lg,
                vertical: AppSpacing.sm,
              ),
              color: lx.accent.withValues(alpha: 0.14),
              child: Row(
                children: [
                  Icon(Icons.sync_problem_outlined, size: 16, color: lx.accent),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Pending sync: ${state.pendingItems.length} item(s) waiting for internet.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

String _titleForPath(String path) {
  const subTitles = {
    RoutePaths.myRoute: 'My route',
    RoutePaths.parentVisibilityDemo: 'Parent visibility demo',
    RoutePaths.profileEdit: 'Edit profile',
    RoutePaths.profileTheme: 'Theme',
    RoutePaths.profileSettings: 'Notification settings',
    RoutePaths.profileSupport: 'Support',
    RoutePaths.profileAbout: 'About',
  };
  if (subTitles.containsKey(path)) return subTitles[path]!;

  for (final dest in kNavDestinations) {
    if (dest.path == path || path.startsWith('${dest.path}/')) {
      return dest.label;
    }
  }
  return AppConstants.appName;
}
