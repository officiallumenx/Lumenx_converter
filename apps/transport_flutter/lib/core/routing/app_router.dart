import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../constants/app_constants.dart';
import '../../features/attendance/presentation/attendance_page.dart';
import '../../features/auth/presentation/auth_controller.dart';
import '../../features/auth/presentation/create_password_page.dart';
import '../../features/auth/presentation/forgot_password_page.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/otp_verification_page.dart';
import '../../features/auth/presentation/reset_password_page.dart';
import '../../features/dashboard/presentation/dashboard_page.dart';
import '../../features/dashboard/presentation/my_route_page.dart';
import '../../features/notifications/presentation/notifications_page.dart';
import '../../features/parent_visibility/presentation/parent_visibility_page.dart';
import '../../features/profile/presentation/about_page.dart';
import '../../features/profile/presentation/edit_profile_page.dart';
import '../../features/profile/presentation/notification_settings_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/profile/presentation/support_page.dart';
import '../../features/profile/presentation/theme_mode_page.dart';
import '../../features/sos/presentation/sos_page.dart';
import '../../features/trip_readiness/presentation/trip_readiness_blocked_page.dart';
import '../../features/trip_readiness/presentation/trip_readiness_page.dart';
import '../widgets/shell_scaffold.dart';
import 'route_paths.dart';
import 'router_refresh.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(routerRefreshProvider);

  return GoRouter(
    refreshListenable: refresh,
    initialLocation: RoutePaths.login,
    redirect: (context, state) {
      final authed = ref.read(authControllerProvider).session != null;
      final location = state.matchedLocation;

      if (!authed && !RoutePaths.isAuthRoute(location)) {
        return RoutePaths.login;
      }
      if (authed && RoutePaths.isAuthRoute(location)) {
        return RoutePaths.home;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: RoutePaths.login,
        pageBuilder: (c, s) => _authPage(s, const LoginPage()),
      ),
      GoRoute(
        path: RoutePaths.authOtp,
        pageBuilder: (c, s) => _authPage(s, const OtpVerificationPage()),
      ),
      GoRoute(
        path: RoutePaths.authCreatePassword,
        pageBuilder: (c, s) => _authPage(s, const CreatePasswordPage()),
      ),
      GoRoute(
        path: RoutePaths.authForgotPassword,
        pageBuilder: (c, s) => _authPage(s, const ForgotPasswordPage()),
      ),
      GoRoute(
        path: RoutePaths.authResetPassword,
        pageBuilder: (c, s) => _authPage(s, const ResetPasswordPage()),
      ),
      GoRoute(
        path: RoutePaths.tripReadiness,
        pageBuilder: (c, s) => _page(s, const TripReadinessPage()),
      ),
      GoRoute(
        path: RoutePaths.tripReadinessBlocked,
        pageBuilder: (c, s) => _page(s, const TripReadinessBlockedPage()),
      ),
      GoRoute(
        path: RoutePaths.sos,
        pageBuilder: (c, s) => _page(s, const SosPage()),
      ),
      GoRoute(
        path: RoutePaths.sosHistory,
        pageBuilder: (c, s) => _page(s, const SosHistoryPage()),
      ),
      ShellRoute(
        builder: (context, state, child) => ShellScaffold(child: child),
        routes: [
          GoRoute(
            path: RoutePaths.home,
            pageBuilder: (c, s) => _page(s, const DashboardPage()),
          ),
          GoRoute(
            path: RoutePaths.myRoute,
            pageBuilder: (c, s) => _page(s, const MyRoutePage()),
          ),
          GoRoute(
            path: RoutePaths.attendance,
            pageBuilder: (c, s) => _page(s, const AttendancePage()),
          ),
          GoRoute(
            path: RoutePaths.notifications,
            pageBuilder: (c, s) => _page(s, const NotificationsPage()),
          ),
          GoRoute(
            path: RoutePaths.parentVisibilityDemo,
            pageBuilder: (c, s) => _page(s, const ParentVisibilityPage()),
          ),
          GoRoute(
            path: RoutePaths.profile,
            pageBuilder: (c, s) => _page(s, const ProfilePage()),
            routes: [
              GoRoute(
                path: 'edit',
                pageBuilder: (c, s) => _page(s, const EditProfilePage()),
              ),
              GoRoute(
                path: 'theme',
                pageBuilder: (c, s) => _page(s, const ThemeModePage()),
              ),
              GoRoute(
                path: 'settings',
                pageBuilder: (c, s) =>
                    _page(s, const NotificationSettingsPage()),
              ),
              GoRoute(
                path: 'support',
                pageBuilder: (c, s) => _page(s, const SupportPage()),
              ),
              GoRoute(
                path: 'about',
                pageBuilder: (c, s) => _page(s, const AboutPage()),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

Page<void> _authPage(GoRouterState state, Widget child) {
  return MaterialPage<void>(
    key: state.pageKey,
    name: 'Auth — ${AppConstants.appName}',
    child: child,
  );
}

Page<void> _page(GoRouterState state, Widget child) {
  final title = _pageTitle(state.uri.path);
  return MaterialPage<void>(key: state.pageKey, name: title, child: child);
}

String _pageTitle(String path) {
  if (path.startsWith(RoutePaths.myRoute)) {
    return 'My Route — ${AppConstants.appName}';
  }
  if (path.startsWith(RoutePaths.tripReadinessBlocked)) {
    return 'Trip Start Blocked — ${AppConstants.appName}';
  }
  if (path.startsWith(RoutePaths.tripReadiness)) {
    return 'Trip Readiness — ${AppConstants.appName}';
  }
  if (path.startsWith(RoutePaths.sosHistory)) {
    return 'SOS History — ${AppConstants.appName}';
  }
  if (path.startsWith(RoutePaths.sos)) {
    return 'SOS — ${AppConstants.appName}';
  }
  if (path.startsWith(RoutePaths.parentVisibilityDemo)) {
    return 'Parent Visibility Demo — ${AppConstants.appName}';
  }
  if (path.startsWith('${RoutePaths.profile}/edit')) {
    return 'Edit Profile — ${AppConstants.appName}';
  }
  if (path.startsWith('${RoutePaths.profile}/settings')) {
    return 'Notification Settings — ${AppConstants.appName}';
  }
  if (path.startsWith('${RoutePaths.profile}/theme')) {
    return 'Theme — ${AppConstants.appName}';
  }
  if (path.startsWith('${RoutePaths.profile}/support')) {
    return 'Support — ${AppConstants.appName}';
  }
  if (path.startsWith('${RoutePaths.profile}/about')) {
    return 'About — ${AppConstants.appName}';
  }

  const titles = {
    RoutePaths.home: 'Home',
    RoutePaths.attendance: 'Attendance',
    RoutePaths.notifications: 'Notifications',
    RoutePaths.profile: 'Profile',
  };

  for (final entry in titles.entries) {
    if (path == entry.key || path.startsWith('${entry.key}/')) {
      return '${entry.value} — ${AppConstants.appName}';
    }
  }

  return AppConstants.appName;
}
