import '../../../shared/mock_data/mock_drivers.dart';
import '../../../shared/models/driver.dart';
import '../models/auth_models.dart';
import 'demo_credentials.dart';

class AuthRepository {
  AuthRepository() {
    _seedAccounts();
  }

  final Map<String, DriverAuthAccount> _accounts = {};
  AuthSession? _session;
  AuthPendingFlow? _pendingFlow;

  AuthSession? get session => _session;
  AuthPendingFlow? get pendingFlow => _pendingFlow;
  bool get isAuthenticated => _session != null;

  DriverAuthAccount? accountFor(String driverId) => _accounts[driverId];

  List<DriverAuthAccount> get activeAccounts => _accounts.values
      .where((a) => a.isActive)
      .toList()
    ..sort((a, b) => a.id.compareTo(b.id));

  void _seedAccounts() {
    for (final driver in mockDrivers) {
      final meta = _profileMeta(driver);
      final isReturning = driver.id == DemoDriverCredentials.returningUser.driverId;

      _accounts[driver.id] = DriverAuthAccount(
        driver: driver,
        email: meta.email,
        department: meta.department,
        hasCompletedSetup: isReturning,
        passwordHash: isReturning ? DemoDriverCredentials.returningUser.password : null,
      );
    }
  }

  ({String email, String department}) _profileMeta(Driver driver) {
    final slug = driver.name.toLowerCase().replaceAll(' ', '.');
    final routeLabel = switch (driver.routeId) {
      'RT-01' => 'Route 01 · Morning & afternoon runs',
      'RT-02' => 'Route 02 · Morning & afternoon runs',
      'RT-03' => 'Route 03 · Morning & afternoon runs',
      _ => 'Unassigned route',
    };
    return (
      email: '$slug@lumenx.app',
      department: routeLabel,
    );
  }

  Future<SignInResult> signInWithPassword({
    required String driverId,
    required String password,
  }) async {
    await _delay();
    final id = driverId.trim().toUpperCase();
    final account = _accounts[id];

    if (account == null) {
      return SignInResult.accountNotFound();
    }
    if (!account.isActive) {
      return SignInResult.accountInactive();
    }

    final expected = account.hasCompletedSetup
        ? account.passwordHash!
        : AuthConstants.defaultPassword;

    if (password != expected) {
      return SignInResult.invalidCredentials();
    }

    if (!account.hasCompletedSetup) {
      _pendingFlow = AuthPendingFlow(
        driverId: id,
        type: AuthFlowType.firstLogin,
      );
      return SignInResult.requiresOtp(account.maskedPhone);
    }

    _establishSession(account);
    return SignInResult.success();
  }

  Future<void> sendOtpForPendingFlow() async {
    await _delay(400);
    if (_pendingFlow == null) {
      throw AuthException('No verification in progress.');
    }
  }

  Future<bool> verifyOtp(String otp) async {
    await _delay();
    if (_pendingFlow == null) {
      throw AuthException('No verification in progress.');
    }
    if (otp.trim() != AuthConstants.demoOtp) {
      return false;
    }
    _pendingFlow = _pendingFlow!.copyWith(otpVerified: true);
    return true;
  }

  Future<void> completePasswordSetup({
    required String password,
    required String confirmPassword,
  }) async {
    await _delay();
    _validateNewPassword(password, confirmPassword);

    final flow = _pendingFlow;
    if (flow == null || flow.type != AuthFlowType.firstLogin || !flow.otpVerified) {
      throw AuthException('Complete OTP verification first.');
    }

    final account = _accounts[flow.driverId];
    if (account == null) throw AuthException('Driver account not found.');

    account.passwordHash = password;
    account.hasCompletedSetup = true;
    _establishSession(account);
    _pendingFlow = null;
  }

  Future<String> requestPasswordReset(String driverId) async {
    await _delay();
    final id = driverId.trim().toUpperCase();
    final account = _accounts[id];

    if (account == null) {
      throw AuthException('Driver ID not found.');
    }
    if (!account.isActive) {
      throw AuthException('This driver account is inactive.');
    }
    if (!account.hasCompletedSetup) {
      throw AuthException(
        'Use your default password (${AuthConstants.defaultPassword}) for first-time setup.',
      );
    }

    _pendingFlow = AuthPendingFlow(
      driverId: id,
      type: AuthFlowType.forgotPassword,
    );
    return account.maskedPhone;
  }

  Future<void> completePasswordReset({
    required String password,
    required String confirmPassword,
  }) async {
    await _delay();
    _validateNewPassword(password, confirmPassword);

    final flow = _pendingFlow;
    if (flow == null ||
        flow.type != AuthFlowType.forgotPassword ||
        !flow.otpVerified) {
      throw AuthException('Complete OTP verification first.');
    }

    final account = _accounts[flow.driverId];
    if (account == null) throw AuthException('Driver account not found.');

    account.passwordHash = password;
    _pendingFlow = null;
  }

  void signOut() {
    _session = null;
    _pendingFlow = null;
  }

  /// Test helper — bypass login UI.
  void signInDirect(String driverId) {
    final account = _accounts[driverId.trim().toUpperCase()];
    if (account == null || !account.isActive) return;
    if (!account.hasCompletedSetup) {
      account.passwordHash = DemoDriverCredentials.returningUser.password;
      account.hasCompletedSetup = true;
    }
    _establishSession(account);
  }

  void _establishSession(DriverAuthAccount account) {
    _session = AuthSession(
      driverId: account.id,
      driverName: account.name,
      signedInAt: DateTime.now(),
    );
    _pendingFlow = null;
  }

  void _validateNewPassword(String password, String confirmPassword) {
    if (password != confirmPassword) {
      throw AuthException('Passwords do not match.');
    }
    if (password.length < AuthConstants.minPasswordLength) {
      throw AuthException(
        'Password must be at least ${AuthConstants.minPasswordLength} characters.',
      );
    }
    if (!RegExp(r'[A-Z]').hasMatch(password)) {
      throw AuthException('Include at least one uppercase letter.');
    }
    if (!RegExp(r'[0-9]').hasMatch(password)) {
      throw AuthException('Include at least one number.');
    }
  }

  Future<void> _delay([int ms = 320]) =>
      Future<void>.delayed(Duration(milliseconds: ms));
}
