abstract final class RoutePaths {
  static const login = '/login';
  static const authOtp = '/auth/otp';
  static const authCreatePassword = '/auth/create-password';
  static const authForgotPassword = '/auth/forgot-password';
  static const authResetPassword = '/auth/reset-password';

  static const home = '/';
  static const attendance = '/attendance';
  static const notifications = '/notifications';
  static const profile = '/profile';
  static const myRoute = '/my-route';
  static const tripReadiness = '/trip-readiness';
  static const tripReadinessBlocked = '/trip-readiness/requirements';
  static const sos = '/sos';
  static const sosHistory = '/sos/history';
  static const parentVisibilityDemo = '/parent-visibility-demo';

  static const profileEdit = '/profile/edit';
  static const profileTheme = '/profile/theme';
  static const profileSettings = '/profile/settings';
  static const profileSupport = '/profile/support';
  static const profileAbout = '/profile/about';

  /// Legacy detail paths — used by admin modules kept off the driver router.
  static String routeDetail(String id) => '/routes/$id';
  static String studentDetail(String id) => '/students/$id';
  static String vehicleDetail(String id) => '/vehicles/$id';
  static String driverDetail(String id) => '/drivers/$id';

  static const dashboard = home;

  static bool isAuthRoute(String location) {
    return location == login ||
        location == authOtp ||
        location == authCreatePassword ||
        location == authForgotPassword ||
        location == authResetPassword;
  }
}
