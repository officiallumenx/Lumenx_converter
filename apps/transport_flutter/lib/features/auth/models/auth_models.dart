import '../../../shared/models/driver.dart';

enum AuthFlowType { firstLogin, forgotPassword }

enum SignInResultKind {
  success,
  requiresOtp,
  invalidCredentials,
  accountInactive,
  accountNotFound,
}

class SignInResult {
  const SignInResult._({
    required this.kind,
    this.maskedPhone,
    this.message,
  });

  final SignInResultKind kind;
  final String? maskedPhone;
  final String? message;

  factory SignInResult.success() =>
      const SignInResult._(kind: SignInResultKind.success);

  factory SignInResult.requiresOtp(String maskedPhone) => SignInResult._(
        kind: SignInResultKind.requiresOtp,
        maskedPhone: maskedPhone,
      );

  factory SignInResult.invalidCredentials([String? message]) => SignInResult._(
        kind: SignInResultKind.invalidCredentials,
        message: message ?? 'Invalid Driver ID or password.',
      );

  factory SignInResult.accountInactive() => const SignInResult._(
        kind: SignInResultKind.accountInactive,
        message: 'This driver account is inactive. Contact transport admin.',
      );

  factory SignInResult.accountNotFound() => const SignInResult._(
        kind: SignInResultKind.accountNotFound,
        message: 'Driver ID not found. Check your ID and try again.',
      );
}

class AuthSession {
  const AuthSession({
    required this.driverId,
    required this.driverName,
    required this.signedInAt,
  });

  final String driverId;
  final String driverName;
  final DateTime signedInAt;
}

/// Riverpod-facing auth snapshot; [tick] bumps on any auth-repo change.
class AuthViewState {
  const AuthViewState({this.session, this.tick = 0});

  final AuthSession? session;
  final int tick;

  AuthViewState copyWith({AuthSession? session, int? tick}) {
    return AuthViewState(
      session: session ?? this.session,
      tick: tick ?? this.tick,
    );
  }
}

class AuthPendingFlow {
  const AuthPendingFlow({
    required this.driverId,
    required this.type,
    this.otpVerified = false,
  });

  final String driverId;
  final AuthFlowType type;
  final bool otpVerified;

  AuthPendingFlow copyWith({bool? otpVerified}) {
    return AuthPendingFlow(
      driverId: driverId,
      type: type,
      otpVerified: otpVerified ?? this.otpVerified,
    );
  }
}

class DriverAuthAccount {
  DriverAuthAccount({
    required this.driver,
    required this.email,
    required this.department,
    this.passwordHash,
    this.hasCompletedSetup = false,
  });

  final Driver driver;
  final String email;
  final String department;
  String? passwordHash;
  bool hasCompletedSetup;

  String get id => driver.id;
  String get name => driver.name;
  String get phone => driver.phone;
  bool get isActive => driver.status == DriverStatus.active;

  String get maskedPhone {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 4) return phone;
    return '+91 ••••• ${digits.substring(digits.length - 4)}';
  }
}

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
