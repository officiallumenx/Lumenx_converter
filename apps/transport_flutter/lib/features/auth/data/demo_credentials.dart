/// Demo authentication constants — aligned with LumenX Connect (`@lumenx/auth`).
abstract final class AuthConstants {
  static const defaultPassword = 'driver123';
  static const demoOtp = '123456';
  static const minPasswordLength = 8;
}

/// Published demo credentials for QA and development.
abstract final class DemoDriverCredentials {
  static const returningUser = DemoCredential(
    driverId: 'DR-01',
    name: 'Ramesh Kumar',
    password: 'Ramesh@2026',
    flow: 'Returning login → Dashboard',
    route: 'Route 01',
  );

  static const firstTimeUsers = [
    DemoCredential(
      driverId: 'DR-02',
      name: 'Suresh Babu',
      password: AuthConstants.defaultPassword,
      flow: 'First login → OTP → Set password → Dashboard',
      route: 'Route 02',
    ),
    DemoCredential(
      driverId: 'DR-03',
      name: 'Venkata Rao',
      password: AuthConstants.defaultPassword,
      flow: 'First login → OTP → Set password → Dashboard',
      route: 'Route 03',
    ),
  ];

  static const otp = AuthConstants.demoOtp;

  static const all = [returningUser, ...firstTimeUsers];
}

class DemoCredential {
  const DemoCredential({
    required this.driverId,
    required this.name,
    required this.password,
    required this.flow,
    required this.route,
  });

  final String driverId;
  final String name;
  final String password;
  final String flow;
  final String route;
}
